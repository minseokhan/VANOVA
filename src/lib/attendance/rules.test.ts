import { describe, expect, it } from "vitest";
import { MAX_CHECK_TITLE, isMissed, summarize, validateCheckEvent } from "./rules";

describe("validateCheckEvent", () => {
  const ok = { kind: "MEETING", title: "11월 4주차 정기 회의", date: "2026-11-23" };

  it("종류·제목·날짜가 맞으면 통과하고 날짜를 UTC 자정 Date로 바꾼다", () => {
    expect(validateCheckEvent({ ...ok, kind: "TASK", title: "  투표  " })).toEqual({
      ok: true,
      value: { kind: "TASK", title: "투표", date: new Date("2026-11-23T00:00:00Z") },
    });
  });

  it("종류가 없거나 모르는 값이면 에러", () => {
    expect(validateCheckEvent({ ...ok, kind: "X" })).toEqual({ ok: false, errors: { kind: "종류를 선택하세요" } });
  });

  it("제목이 비거나 길면, 날짜가 없으면 에러", () => {
    expect(validateCheckEvent({ ...ok, title: " ", date: "2026-02-30" })).toEqual({
      ok: false,
      errors: { title: "제목을 입력하세요", date: "날짜를 선택하세요" },
    });
    expect(validateCheckEvent({ ...ok, title: "가".repeat(MAX_CHECK_TITLE + 1) })).toEqual({
      ok: false,
      errors: { title: `제목은 ${MAX_CHECK_TITLE}자 이하로 입력하세요` },
    });
  });
});

describe("isMissed", () => {
  it("회의는 체크 안 됐으면 바로 불참", () => {
    expect(isMissed({ kind: "MEETING", date: "2026-11-30" }, false, "2026-11-23")).toBe(true);
    expect(isMissed({ kind: "MEETING", date: "2026-11-23" }, true, "2026-11-23")).toBe(false);
  });

  it("투표·과제는 마감일이 지나야 미참여 (마감 당일은 아직 아님)", () => {
    expect(isMissed({ kind: "TASK", date: "2026-11-23" }, false, "2026-11-23")).toBe(false);
    expect(isMissed({ kind: "TASK", date: "2026-11-22" }, false, "2026-11-23")).toBe(true);
    expect(isMissed({ kind: "TASK", date: "2026-11-22" }, true, "2026-11-23")).toBe(false);
  });
});

describe("summarize", () => {
  const events = [
    { id: "m1", kind: "MEETING" as const, title: "1주차", date: "2026-11-09", entries: [{ userId: "a", done: true }, { userId: "b", done: false }] },
    { id: "m2", kind: "MEETING" as const, title: "2주차", date: "2026-11-16", entries: [{ userId: "a", done: true }] },
    { id: "t1", kind: "TASK" as const, title: "MT 투표", date: "2026-11-20", entries: [{ userId: "a", done: false }, { userId: "b", done: true }] },
    { id: "t2", kind: "TASK" as const, title: "회고 작성", date: "2026-11-30", entries: [{ userId: "a", done: false }] },
  ];

  it("대상인 기록만 세고, 회의 출석 수와 불참·미참여 기록을 모은다", () => {
    expect(summarize(["a", "b", "c"], events, "2026-11-23")).toEqual({
      a: { attended: 2, meetings: 2, missed: [{ id: "t1", kind: "TASK", title: "MT 투표", date: "2026-11-20" }] },
      b: { attended: 0, meetings: 1, missed: [{ id: "m1", kind: "MEETING", title: "1주차", date: "2026-11-09" }] },
      c: { attended: 0, meetings: 0, missed: [] },
    });
  });
});
