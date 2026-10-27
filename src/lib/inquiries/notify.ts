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

/** 첫 답변 알림 — 부원도 보는 채널이라 문의 내용은 넣지 않는다 */
export function buildAnswerNotice({
  authorName, authorDiscordId, baseUrl,
}: { authorName: string; authorDiscordId?: string; baseUrl: string }): string {
  const who = authorDiscordId ? `<@${authorDiscordId}> ` : `**${authorName}**님, `;
  return `${who}문의하신 내용에 답변이 완료되었습니다. 확인해 주세요.\n${baseUrl}/inquiries`;
}

const EXCERPT_MAX = 200;

function oneLine(s: string, max: number): string {
  const t = s.replace(/\s*\n\s*/g, " ").trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

/** 추가 답변(답글) 알림 — 운영진 비공개 채널 */
export function buildReplyNotice({
  inquiryAuthorName, inquiryContent, replierName, content, baseUrl, userId,
}: { inquiryAuthorName: string; inquiryContent: string; replierName: string; content: string; baseUrl: string; userId?: string }): string {
  return [
    `${userId ? `<@${userId}> ` : ""}💬 **${inquiryAuthorName}님 문의에 추가 답변이 달렸습니다. 확인해 주세요.**`,
    `> 문의: ${oneLine(inquiryContent, EXCERPT_MAX)}`,
    `> 추가 답변 (${replierName}): ${oneLine(content, 1000)}`,
    `${baseUrl}/inquiries`,
  ].join("\n");
}
