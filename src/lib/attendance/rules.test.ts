import { describe, expect, it } from "vitest";
import { MAX_REASON, MAX_TASK_TITLE, countAttendance, normalizeReason, isAttendanceStatus, validateTask } from "./rules";

describe("validateTask", () => {
  it("제목·마감일이 맞으면 통과하고 마감일을 UTC 자정 Date로 바꾼다", () => {
    expect(validateTask({ title: "  MT 투표  ", dueDate: "2026-11-23" })).toEqual({
      ok: true,
      value: { title: "MT 투표", dueDate: new Date("2026-11-23T00:00:00Z") },
    });
  });

  it("제목이 비거나 길면, 마감일이 없으면 에러", () => {
    expect(validateTask({ title: " ", dueDate: "2026-02-30" })).toEqual({
      ok: false,
      errors: { title: "제목을 입력하세요", dueDate: "마감일을 선택하세요" },
    });
    expect(validateTask({ title: "가".repeat(MAX_TASK_TITLE + 1), dueDate: "2026-11-23" })).toEqual({
      ok: false,
      errors: { title: `제목은 ${MAX_TASK_TITLE}자 이하로 입력하세요` },
    });
  });
});

describe("isAttendanceStatus", () => {
  it("출석·인정 불참·불참만 허용", () => {
    expect(["PRESENT", "EXCUSED", "ABSENT", "X", ""].map(isAttendanceStatus)).toEqual([true, true, true, false, false]);
  });
});

describe("countAttendance", () => {
  it("멤버별 상태 수를 센다. 기록이 없는 멤버는 0", () => {
    const rows = [
      { userId: "a", status: "PRESENT" as const },
      { userId: "a", status: "EXCUSED" as const },
      { userId: "a", status: "PRESENT" as const },
      { userId: "b", status: "ABSENT" as const },
    ];
    expect(countAttendance(["a", "b", "c"], rows)).toEqual({
      a: { PRESENT: 2, EXCUSED: 1, ABSENT: 0 },
      b: { PRESENT: 0, EXCUSED: 0, ABSENT: 1 },
      c: { PRESENT: 0, EXCUSED: 0, ABSENT: 0 },
    });
  });
});

describe("normalizeReason", () => {
  it("앞뒤 공백을 지우고, 비면 null", () => {
    expect(normalizeReason("  학교 팀플 회의  ")).toEqual({ ok: true, value: "학교 팀플 회의" });
    expect(normalizeReason("   ")).toEqual({ ok: true, value: null });
  });

  it("너무 길면 에러", () => {
    expect(normalizeReason("가".repeat(MAX_REASON + 1))).toEqual({ ok: false, error: `사유는 ${MAX_REASON}자 이하로 입력하세요` });
  });
});
