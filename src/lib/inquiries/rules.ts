import type { InquiryKind } from "@prisma/client";
import type { BadgeTone } from "@/components/ui/Badge";
import { isAdmin } from "@/lib/auth/permissions";

export const INQUIRY_KINDS = ["QUESTION", "SUGGESTION", "BUG"] as const satisfies readonly InquiryKind[];

export const INQUIRY_KIND_LABEL: Record<InquiryKind, string> = {
  QUESTION: "문의",
  SUGGESTION: "건의",
  BUG: "버그 신고",
};

export const INQUIRY_KIND_TONE: Record<InquiryKind, BadgeTone> = {
  QUESTION: "sky",
  SUGGESTION: "teal",
  BUG: "red",
};

export const MAX_INQUIRY = 2000;

export function validateInquiryContent(content: string): string | null {
  const len = content.trim().length;
  if (len === 0) return "내용을 입력하세요";
  if (len > MAX_INQUIRY) return `내용은 ${MAX_INQUIRY}자 이하로 입력하세요`;
  return null;
}

export function parseInquiryKind(v: string): InquiryKind | null {
  return (INQUIRY_KINDS as readonly string[]).includes(v) ? (v as InquiryKind) : null;
}

/** 운영진이거나, 작성자 본인이고 아직 답변이 없을 때 */
export function canDeleteInquiry(
  user: { id: string; role: string },
  inquiry: { authorId: string; answer: string | null },
): boolean {
  return isAdmin(user) || (inquiry.authorId === user.id && inquiry.answer === null);
}

/** 답변이 달리면 질문이 바뀌지 않도록 막는다 — 작성자 본인, 미답변일 때만 */
export function canEditInquiry(user: { id: string }, inquiry: { authorId: string; answer: string | null }): boolean {
  return inquiry.authorId === user.id && inquiry.answer === null;
}

/** 답변 이후 대화는 운영진과 작성자 본인만 이어 간다 */
export function canReplyInquiry(user: { id: string; role: string }, inquiry: { authorId: string }): boolean {
  return isAdmin(user) || inquiry.authorId === user.id;
}

export type InquiryScope = "ALL" | "MINE" | "UNANSWERED";

/** 목록 상한(take) 아래에서도 스코프 결과가 정확하도록 DB where 로 내린다 */
export function inquiryWhere(scope: InquiryScope, userId: string): { authorId?: string; needsAnswer?: true } {
  if (scope === "MINE") return { authorId: userId };
  if (scope === "UNANSWERED") return { needsAnswer: true };
  return {};
}
