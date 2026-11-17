import { describe, expect, it } from "vitest";
import type { MinutesContext } from "./compose";
import { minutesInputHash } from "./hash";

const ctx: MinutesContext = {
  date: "2026-11-16",
  notes: "성정헌은 학교 팀플로 불참",
  roster: ["박동진", "한민석"],
  projects: [
    { code: "2-4", title: "MLI", report: null },
    { code: "7-2", title: "금융", report: { author: "박동진", didThisWeek: "a", planNextWeek: "b", issues: null, attachments: [] } },
  ],
};

describe("minutesInputHash", () => {
  it("같은 입력이면 같고, 메모·명단·주간 보고 중 하나라도 바뀌면 달라진다", () => {
    const h = minutesInputHash(ctx);
    expect(minutesInputHash({ ...ctx })).toBe(h);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(minutesInputHash({ ...ctx, notes: ctx.notes + " " })).not.toBe(h);
    expect(minutesInputHash({ ...ctx, roster: ["박동진"] })).not.toBe(h);
    expect(minutesInputHash({ ...ctx, projects: [ctx.projects[0]] })).not.toBe(h);
  });
});

