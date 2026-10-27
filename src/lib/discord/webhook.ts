const GAP_MS = 500;

/** 디스코드 웹훅 POST. 여러 메시지는 순차 전송(rate limit 대비 500ms 간격). 2xx가 아니면 throw */
export async function sendWebhook(url: string, content: string | string[], roleId?: string, userIds?: string[]): Promise<void> {
  const messages = Array.isArray(content) ? content : [content];
  for (const [i, msg] of messages.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, GAP_MS));
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: msg, allowed_mentions: { parse: [], roles: roleId ? [roleId] : [], ...(userIds && { users: userIds }) } }),
    });
    if (!res.ok) throw new Error(`Discord webhook failed: ${res.status}`);
  }
}
