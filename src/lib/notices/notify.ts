/** 새 공지 디스코드 알림 — 전체 언급 후 제목과 링크만 (본문은 사이트에서 읽는다) */
export function buildNoticeAnnouncement({ title, baseUrl }: { title: string; baseUrl: string }): string {
  return `@everyone 📢 새 공지가 올라왔습니다: **${title}**\n${baseUrl}/notices`;
}
