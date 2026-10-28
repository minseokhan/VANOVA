"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth/guards";
import { validateNotice } from "@/lib/notices/rules";
import { buildNoticeAnnouncement } from "@/lib/notices/notify";
import { sendWebhook } from "@/lib/discord/webhook";
import type { FormState } from "@/app/(dashboard)/projects/[id]/actions";

function revalidate() {
  revalidatePath("/notices");
}

function parse(fd: FormData) {
  return validateNotice({ title: String(fd.get("title") ?? ""), content: String(fd.get("content") ?? "") });
}

export async function createNotice(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireAdmin();
  const result = parse(fd);
  if (!result.ok) return { fieldErrors: result.errors };
  await db.notice.create({ data: { ...result.value, authorId: user.id } });
  revalidate();
  // 응답을 보낸 뒤 전송한다. 디스코드가 실패해도 공지 등록은 성공으로 둔다
  after(async () => {
    const url = process.env.DISCORD_NOTICE_WEBHOOK_URL;
    if (!url) return;
    const baseUrl = process.env.APP_BASE_URL || `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
    try {
      await sendWebhook(url, buildNoticeAnnouncement({ title: result.value.title, baseUrl }), undefined, true);
    } catch (e) {
      console.error("[notice] discord notify failed", e);
    }
  });
  return { ok: true };
}

/** 부원이 공지 페이지를 열면 호출 — 사이드바 미확인 숫자를 0으로 */
export async function markNoticesSeen(): Promise<void> {
  const user = await requireUser();
  await db.user.update({ where: { id: user.id }, data: { noticesSeenAt: new Date() } });
  revalidatePath("/", "layout");
}

export async function updateNotice(noticeId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const result = parse(fd);
  if (!result.ok) return { fieldErrors: result.errors };
  const { count } = await db.notice.updateMany({ where: { id: noticeId }, data: result.value });
  if (count === 0) return { error: "공지를 찾을 수 없습니다" };
  revalidate();
  return { ok: true };
}

export async function deleteNotice(noticeId: string): Promise<{ error?: string }> {
  await requireAdmin();
  const { count } = await db.notice.deleteMany({ where: { id: noticeId } });
  if (count === 0) return { error: "공지를 찾을 수 없습니다" };
  revalidate();
  return {};
}
