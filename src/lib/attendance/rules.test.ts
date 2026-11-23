import { describe, expect, it } from "vitest";
import { MAX_TASK_TITLE, countAttendance, isMissed, isAttendanceStatus, missedTasks, validateTask } from "./rules";

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

describe("isMissed", () => {
  it("마감일이 지나야 미참여 (마감 당일은 아직 아님)", () => {
    expect(isMissed("2026-11-23", false, "2026-11-23")).toBe(false);
    expect(isMissed("2026-11-22", false, "2026-11-23")).toBe(true);
    expect(isMissed("2026-11-22", true, "2026-11-23")).toBe(false);
  });
});

describe("missedTasks", () => {
  it("대상인 과제 중 마감이 지났는데 체크 안 된 것만 모은다", () => {
    const tasks = [
      { id: "t1", title: "MT 투표", dueDate: "2026-11-20", entries: [{ userId: "a", done: false }, { userId: "b", done: true }] },
      { id: "t2", title: "회고 작성", dueDate: "2026-11-30", entries: [{ userId: "a", done: false }] },
    ];
    expect(missedTasks(["a", "b", "c"], tasks, "2026-11-23")).toEqual({
      a: [{ id: "t1", title: "MT 투표", dueDate: "2026-11-20" }],
      b: [],
      c: [],
    });
  });
});
