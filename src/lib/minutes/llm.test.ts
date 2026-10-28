import { beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    beta = { messages: { create } };
  },
}));

const { generateMinutesContent, MINUTES_MODEL } = await import("./llm");

const ctx = { date: "2026-10-26", notes: "메모", roster: ["박동진"], projects: [{ code: "2-4", title: "X", report: null }] };
const output = {
  startTime: "22:00",
  endTime: null,
  keyConclusion: "결론",
  absentees: [],
  remarks: "",
  decisions: [],
  projects: [],
};

beforeEach(() => create.mockReset());

describe("generateMinutesContent", () => {
  it("프롬프트·구조화 출력 스키마로 호출하고 JSON 을 파싱", async () => {
    create.mockResolvedValue({ stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify(output) }] });
    await expect(generateMinutesContent(ctx)).resolves.toEqual(output);

    const req = create.mock.calls[0][0];
    expect(req.model).toBe(MINUTES_MODEL);
    expect(req.system).toContain("회의록");
    expect(req.messages[0].content).toContain("메모");
    expect(req.output_config.format.type).toBe("json_schema");
  });

  it("거절·잘림이면 에러", async () => {
    create.mockResolvedValue({ stop_reason: "refusal", content: [] });
    await expect(generateMinutesContent(ctx)).rejects.toThrow(/refusal/);
    create.mockResolvedValue({ stop_reason: "max_tokens", content: [{ type: "text", text: "{" }] });
    await expect(generateMinutesContent(ctx)).rejects.toThrow(/max_tokens/);
  });
});
