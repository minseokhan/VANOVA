"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { readFile } from "node:fs/promises";
import { assembleMinutes, finalizeMinutes, validateGenerateInput } from "@/lib/minutes/compose";
import { renderMinutesDocx, TEMPLATE_PATH } from "@/lib/minutes/docx";
import { uploadAsGoogleDoc } from "@/lib/minutes/drive";
import { minutesInputHash } from "@/lib/minutes/hash";
import { generateMinutesContent } from "@/lib/minutes/llm";
import { validateMinute } from "@/lib/minutes/rules";
import { isBlobUrl, type WeeklyAttachment } from "@/lib/projects/info";
import { getWeekStart } from "@/lib/utils/week";
import type { FormState } from "@/app/(dashboard)/projects/[id]/actions";

export async function createMinute(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireAdmin();
  const result = validateMinute({
    date: String(fd.get("date") ?? ""),
    title: String(fd.get("title") ?? ""),
    fileUrl: String(fd.get("fileUrl") ?? ""),
  });
  if (!result.ok) return { fieldErrors: result.errors };
  await db.meetingMinute.create({ data: { ...result.value, authorId: user.id } });
  revalidatePath("/minutes");
  return { ok: true };
}

/**
 * 자유 메모 + 주요 프로젝트 주간 보고 → LLM 으로 양식을 채워 드라이브에 구글 독스로 저장하고 링크를 돌려준다.
 * 메모는 회의 날짜별로 저장한다. 목록 등록은 운영진이 문서를 확인한 뒤 직접 한다.
 */
/** date: 이 결과가 어느 회의 날짜의 것인지. unchanged: 입력이 지난번과 같아 AI 를 다시 부르지 않음 */
export type GenerateState = FormState & { url?: string; date?: string; unchanged?: boolean };

export async function generateMinute(_prev: GenerateState, fd: FormData): Promise<GenerateState> {
  const user = await requireAdmin();
  const input = validateGenerateInput({
    date: String(fd.get("date") ?? ""),
    notes: String(fd.get("notes") ?? ""),
    roster: String(fd.get("roster") ?? ""),
  });
  if (!input.ok) return { fieldErrors: input.errors };
  const { date, notes, roster } = input.value;

  const day = new Date(`${date}T00:00:00Z`);
  await db.meetingNote.upsert({
    where: { date: day },
    create: { date: day, notes, authorId: user.id },
    update: { notes, authorId: user.id },
  });
  revalidatePath("/minutes");

  const weekStart = getWeekStart(day);
  const projects = await db.project.findMany({
    where: { featured: true },
    orderBy: { code: "asc" },
    select: {
      code: true,
      title: true,
      weeklyUpdates: {
        where: { weekStart },
        select: { didThisWeek: true, planNextWeek: true, issues: true, attachments: true, author: { select: { name: true } } },
      },
    },
  });
  if (projects.length === 0) return { error: "주요 프로젝트가 지정되어 있지 않습니다" };

  const ctx = {
    date,
    notes,
    roster,
    projects: projects.map(({ code, title, weeklyUpdates: [r] }) => ({
      code,
      title,
      report: r
        ? {
            author: r.author.name,
            didThisWeek: r.didThisWeek,
            planNextWeek: r.planNextWeek,
            issues: r.issues,
            attachments: r.attachments as WeeklyAttachment[],
          }
        : null,
    })),
  };

  // 메모·명단·주간 보고가 지난번 생성 때와 같으면 AI 를 다시 부르지 않고 기존 문서를 돌려준다
  const hash = minutesInputHash(ctx);
  const prev = await db.meetingNote.findUnique({ where: { date: day }, select: { generatedUrl: true, generatedHash: true } });
  if (prev?.generatedUrl && prev.generatedHash === hash) return { ok: true, url: prev.generatedUrl, date, unchanged: true };

  try {
    const doc = finalizeMinutes(assembleMinutes(ctx, await generateMinutesContent(ctx)));
    const images = await fetchImages(doc.progress.flatMap((p) => p.images.map((i) => i.url)));
    const url = await uploadAsGoogleDoc(doc.fileName, await renderMinutesDocx(await readFile(TEMPLATE_PATH), doc, images));
    await db.meetingNote.update({ where: { date: day }, data: { generatedUrl: url, generatedHash: hash } });
    revalidatePath("/minutes");
    return { ok: true, url, date };
  } catch (e) {
    console.error("[generateMinute]", e);
    return { error: e instanceof Error ? e.message : "회의록 생성에 실패했습니다" };
  }
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** 주간 보고 사진을 내려받는다. 우리 Blob 주소만, 리다이렉트 없이. 실패한 것은 빠지고 문서에는 링크로 남는다 */
async function fetchImages(urls: string[]): Promise<Map<string, Buffer>> {
  const entries = await Promise.all(
    urls.filter(isBlobUrl).map(async (url) => {
      try {
        const res = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(10_000) });
        // 회의록에 넣기엔 너무 큰 사진은 받지 않고 링크로 남긴다
        const size = Number(res.headers.get("content-length"));
        if (!res.ok || !size || size > MAX_IMAGE_BYTES) {
          await res.body?.cancel();
          return null;
        }
        return [url, Buffer.from(await res.arrayBuffer())] as const;
      } catch {
        return null;
      }
    }),
  );
  return new Map(entries.filter((e) => e !== null));
}

export async function deleteMinute(id: string): Promise<{ error?: string }> {
  await requireAdmin();
  const { count } = await db.meetingMinute.deleteMany({ where: { id } });
  if (count === 0) return { error: "회의록을 찾을 수 없습니다" };
  revalidatePath("/minutes");
  return {};
}
