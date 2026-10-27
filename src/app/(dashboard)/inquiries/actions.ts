"use server";

import type { InquiryKind } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth/guards";
import { canDeleteInquiry, canEditInquiry, canModifyPost, canReplyInquiry, parseInquiryKind, validateInquiryContent } from "@/lib/inquiries/rules";
import { validateAnswer } from "@/lib/questions/rules";
import { buildInquiryNotice } from "@/lib/inquiries/notify";
import { sendWebhook } from "@/lib/discord/webhook";
import type { FormState } from "@/app/(dashboard)/projects/[id]/actions";

function revalidate() {
  revalidatePath("/", "layout"); // 사이드바 미답변 숫자
}

export async function createInquiry(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const kind = parseInquiryKind(String(fd.get("kind") ?? ""));
  if (!kind) return { fieldErrors: { kind: "종류를 선택하세요" } };
  const content = String(fd.get("content") ?? "");
  const error = validateInquiryContent(content);
  if (error) return { fieldErrors: { content: error } };
  await db.inquiry.create({ data: { authorId: user.id, kind, content: content.trim() } });
  revalidate();
  // 응답을 보낸 뒤 전송한다. 디스코드가 실패해도 문의 등록은 성공으로 둔다
  after(() => notifyInquiry({ kind, authorName: user.name, content }));
  return { ok: true };
}

async function notifyInquiry(p: { kind: InquiryKind; authorName: string; content: string }) {
  const url = process.env.DISCORD_INQUIRY_WEBHOOK_URL;
  if (!url) return;
  const userId = process.env.DISCORD_INQUIRY_USER_ID || undefined;
  const baseUrl = process.env.APP_BASE_URL || `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  try {
    await sendWebhook(url, buildInquiryNotice({ ...p, baseUrl, userId }), undefined, userId ? [userId] : undefined);
  } catch (e) {
    console.error("[inquiry] discord notify failed", e);
  }
}

export async function answerInquiry(inquiryId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireAdmin();
  const answer = String(fd.get("answer") ?? "");
  const error = validateAnswer(answer);
  if (error) return { fieldErrors: { answer: error } };
  const { count } = await db.inquiry.updateMany({
    where: { id: inquiryId, answer: null },
    data: { answer: answer.trim(), answeredById: user.id, answeredAt: new Date() },
  });
  if (count === 0) return { error: "이미 답변이 있거나 문의를 찾을 수 없습니다" };
  revalidate();
  return {};
}

export async function updateInquiry(inquiryId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const content = String(fd.get("content") ?? "");
  const error = validateInquiryContent(content);
  if (error) return { fieldErrors: { content: error } };
  const inquiry = await db.inquiry.findUnique({ where: { id: inquiryId }, select: { authorId: true, answer: true } });
  if (!inquiry) return { error: "문의를 찾을 수 없습니다" };
  if (!canEditInquiry(user, inquiry)) return { error: "수정할 수 없는 문의입니다" };
  // 확인과 수정 사이에 답변이 달리면 수정하지 않는다
  const { count } = await db.inquiry.updateMany({ where: { id: inquiryId, answer: null }, data: { content: content.trim() } });
  if (count === 0) return { error: "이미 답변이 달려 수정할 수 없습니다" };
  revalidate();
  return { ok: true };
}

export async function replyInquiry(inquiryId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const content = String(fd.get("content") ?? "");
  const error = validateAnswer(content);
  if (error) return { fieldErrors: { content: error } };
  const inquiry = await db.inquiry.findUnique({ where: { id: inquiryId }, select: { authorId: true } });
  if (!inquiry) return { error: "문의를 찾을 수 없습니다" };
  if (!canReplyInquiry(user, inquiry)) return { error: "답글을 달 수 없는 문의입니다" };
  await db.inquiryReply.create({ data: { inquiryId, authorId: user.id, content: content.trim() } });
  revalidate();
  return { ok: true };
}

/** 첫 답변 수정 — 쓴 운영진 본인만 */
export async function updateAnswer(inquiryId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireAdmin();
  const content = String(fd.get("content") ?? "");
  const error = validateAnswer(content);
  if (error) return { fieldErrors: { content: error } };
  const inquiry = await db.inquiry.findUnique({ where: { id: inquiryId }, select: { answeredById: true } });
  if (!inquiry || !canModifyPost(user, inquiry.answeredById)) return { error: "수정할 수 없는 답변입니다" };
  await db.inquiry.update({ where: { id: inquiryId }, data: { answer: content.trim() } });
  revalidate();
  return { ok: true };
}

/** 첫 답변 삭제 — 문의는 다시 미답변이 된다 */
export async function deleteAnswer(inquiryId: string): Promise<{ error?: string }> {
  const user = await requireAdmin();
  const inquiry = await db.inquiry.findUnique({ where: { id: inquiryId }, select: { answeredById: true } });
  if (!inquiry || !canModifyPost(user, inquiry.answeredById)) return { error: "삭제할 수 없는 답변입니다" };
  await db.inquiry.update({ where: { id: inquiryId }, data: { answer: null, answeredById: null, answeredAt: null } });
  revalidate();
  return {};
}

export async function updateReply(replyId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const content = String(fd.get("content") ?? "");
  const error = validateAnswer(content);
  if (error) return { fieldErrors: { content: error } };
  const reply = await db.inquiryReply.findUnique({ where: { id: replyId }, select: { authorId: true } });
  if (!reply || !canModifyPost(user, reply.authorId)) return { error: "수정할 수 없는 답글입니다" };
  await db.inquiryReply.update({ where: { id: replyId }, data: { content: content.trim() } });
  revalidate();
  return { ok: true };
}

export async function deleteReply(replyId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  const reply = await db.inquiryReply.findUnique({ where: { id: replyId }, select: { authorId: true } });
  if (!reply || !canModifyPost(user, reply.authorId)) return { error: "삭제할 수 없는 답글입니다" };
  await db.inquiryReply.delete({ where: { id: replyId } });
  revalidate();
  return {};
}

export async function deleteInquiry(inquiryId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  const inquiry = await db.inquiry.findUnique({ where: { id: inquiryId }, select: { authorId: true, answer: true } });
  if (!inquiry) return { error: "문의를 찾을 수 없습니다" };
  if (!canDeleteInquiry(user, inquiry)) return { error: "삭제할 수 없는 문의입니다" };
  await db.inquiry.delete({ where: { id: inquiryId } });
  revalidate();
  return {};
}
