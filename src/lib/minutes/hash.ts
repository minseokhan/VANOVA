import { createHash } from "node:crypto";
import { buildMinutesPrompt, type MinutesContext } from "./compose";

/** AI 에 보낼 프롬프트 전체의 해시. 메모·명단·주간 보고·프롬프트 문구 중 하나라도 바뀌면 달라진다 */
export function minutesInputHash(ctx: MinutesContext): string {
  const { system, user } = buildMinutesPrompt(ctx);
  return createHash("sha256").update(system).update("\0").update(user).digest("hex");
}
