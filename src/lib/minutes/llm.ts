import Anthropic from "@anthropic-ai/sdk";
import { buildMinutesPrompt, minutesOutputSchema, type MinutesContext, type MinutesLlmOutput } from "./compose";

export const MINUTES_MODEL = "claude-opus-5";

/** ANTHROPIC_API_KEY 환경변수를 SDK 가 읽는다 */
export async function generateMinutesContent(ctx: MinutesContext): Promise<MinutesLlmOutput> {
  const { system, user } = buildMinutesPrompt(ctx);
  const res = await new Anthropic().beta.messages.create({
    model: MINUTES_MODEL,
    max_tokens: 16000,
    // 안전 분류기가 거절하면 서버가 대체 모델로 다시 돌린다
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: { type: "json_schema", schema: minutesOutputSchema(ctx) } },
    system,
    messages: [{ role: "user", content: user }],
  });
  if (res.stop_reason !== "end_turn") throw new Error(`회의록 생성이 중단되었습니다 (${res.stop_reason})`);
  const text = res.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("회의록 생성 결과가 비어 있습니다");
  return JSON.parse(text.text) as MinutesLlmOutput;
}
