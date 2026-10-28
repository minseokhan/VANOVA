"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { readFile } from "node:fs/promises";
import { assembleMinutes, finalizeMinutes, validateDraft, validateGenerateInput, type MinutesDraft } from "@/lib/minutes/compose";
import { renderMinutesDocx, TEMPLATE_PATH } from "@/lib/minutes/docx";
import { uploadDocxToDrive } from "@/lib/minutes/drive";
import { generateMinutesContent } from "@/lib/minutes/llm";
import { validateMinute } from "@/lib/minutes/rules";
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

/** 자유 메모 + 주요 프로젝트 주간 보고 → LLM 초안. 메모는 회의 날짜별로 저장하고, 등록은 검토 후 registerMinute 로 */
export async function generateMinuteDraft(_prev: FormState, fd: FormData): Promise<FormState & { draft?: MinutesDraft }> {
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
        select: { didThisWeek: true, planNextWeek: true, issues: true, author: { select: { name: true } } },
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
      report: r ? { author: r.author.name, didThisWeek: r.didThisWeek, planNextWeek: r.planNextWeek, issues: r.issues } : null,
    })),
  };

  try {
    return { draft: assembleMinutes(ctx, await generateMinutesContent(ctx)) };
  } catch (e) {
    console.error("[generateMinuteDraft]", e);
    return { error: e instanceof Error ? e.message : "회의록 생성에 실패했습니다" };
  }
}

/** 검토·수정한 초안 → 양식 docx → 드라이브 업로드 → 목록 등록 */
export async function registerMinute(raw: unknown): Promise<{ error?: string; url?: string }> {
  const user = await requireAdmin();
  const draft = validateDraft(raw);
  if (!draft.ok) return { error: draft.error };

  try {
    const doc = finalizeMinutes(draft.value);
    const fileUrl = await uploadDocxToDrive(doc.fileName, await renderMinutesDocx(await readFile(TEMPLATE_PATH), doc));
    await db.meetingMinute.create({
      data: { date: new Date(`${draft.value.date}T00:00:00Z`), title: doc.title, fileUrl, authorId: user.id },
    });
    revalidatePath("/minutes");
    return { url: fileUrl };
  } catch (e) {
    console.error("[registerMinute]", e);
    return { error: e instanceof Error ? e.message : "회의록 등록에 실패했습니다" };
  }
}

export async function deleteMinute(id: string): Promise<{ error?: string }> {
  await requireAdmin();
  const { count } = await db.meetingMinute.deleteMany({ where: { id } });
  if (count === 0) return { error: "회의록을 찾을 수 없습니다" };
  revalidatePath("/minutes");
  return {};
}
