"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth/guards";
import { isAdmin } from "@/lib/auth/permissions";
import { canDeleteInquiry, canReplyInquiry, parseInquiryKind, validateInquiryContent } from "@/lib/inquiries/rules";
import { validateAnswer } from "@/lib/questions/rules";
import type { FormState } from "@/app/(dashboard)/projects/[id]/actions";

function revalidate() {
  revalidatePath("/", "layout"); // 사이드바 문의 대기 숫자
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
  return { ok: true };
}

export async function answerInquiry(inquiryId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireAdmin();
  const answer = String(fd.get("answer") ?? "");
  const error = validateAnswer(answer);
  if (error) return { fieldErrors: { answer: error } };
  const { count } = await db.inquiry.updateMany({
    where: { id: inquiryId },
    data: { answer: answer.trim(), answeredById: user.id, answeredAt: new Date(), needsAnswer: false },
  });
  if (count === 0) return { error: "문의를 찾을 수 없습니다" };
  revalidate();
  return {};
}

export async function replyInquiry(inquiryId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const content = String(fd.get("content") ?? "");
  const error = validateAnswer(content);
  if (error) return { fieldErrors: { content: error } };
  const inquiry = await db.inquiry.findUnique({ where: { id: inquiryId }, select: { authorId: true } });
  if (!inquiry) return { error: "문의를 찾을 수 없습니다" };
  if (!canReplyInquiry(user, inquiry)) return { error: "답글을 달 수 없는 문의입니다" };
  await db.$transaction([
    db.inquiryReply.create({ data: { inquiryId, authorId: user.id, content: content.trim() } }),
    db.inquiry.update({ where: { id: inquiryId }, data: { needsAnswer: !isAdmin(user) } }),
  ]);
  revalidate();
  return { ok: true };
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
