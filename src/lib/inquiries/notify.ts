import type { InquiryKind } from "@prisma/client";
import { INQUIRY_KIND_LABEL } from "./rules";

const LIMIT = 2000;

/** 새 문의 알림 한 통. 내용은 인용 블록으로, 2000자를 넘으면 내용을 자른다 */
export function buildInquiryNotice({
  kind, authorName, content, baseUrl, userId,
}: { kind: InquiryKind; authorName: string; content: string; baseUrl: string; userId?: string }): string {
  const header = `${userId ? `<@${userId}> ` : ""}📮 **새 문의 (${INQUIRY_KIND_LABEL[kind]})** · ${authorName}`;
  const link = `${baseUrl}/inquiries`;
  const room = LIMIT - header.length - link.length - 2;
  let quoted = content.trim().split("\n").map((l) => `> ${l}`).join("\n");
  if (quoted.length > room) quoted = `${quoted.slice(0, room - 1)}…`;
  return `${header}\n${quoted}\n${link}`;
}
