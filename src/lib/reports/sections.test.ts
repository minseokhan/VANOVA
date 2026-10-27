import { describe, expect, it } from "vitest";
import { buildSections } from "./sections";

const p = (id: string, status: "IN_PROGRESS" | "DONE" | "UNASSIGNED") => ({ id, status });

describe("buildSections", () => {
  it("진행 중 · 완료 · 미배치 순서로 고정된 3개 섹션을 만든다", () => {
    const s = buildSections([p("a", "DONE"), p("b", "UNASSIGNED"), p("c", "IN_PROGRESS")], new Set());
    expect(s.map((x) => x.key)).toEqual(["IN_PROGRESS", "DONE", "UNASSIGNED"]);
    expect(s.map((x) => x.label)).toEqual(["진행 중", "완료", "미배치"]);
  });

  it("프로젝트를 상태별로 나누고 입력 순서를 유지한다", () => {
    const s = buildSections([p("a", "IN_PROGRESS"), p("b", "DONE"), p("c", "IN_PROGRESS")], new Set());
    expect(s[0].rows.map((r) => r.project.id)).toEqual(["a", "c"]);
    expect(s[1].rows.map((r) => r.project.id)).toEqual(["b"]);
  });

  it("제출 여부를 표시하고 섹션별로 집계한다", () => {
    const s = buildSections([p("a", "IN_PROGRESS"), p("b", "IN_PROGRESS")], new Set(["a"]));
    expect(s[0].rows.map((r) => r.submitted)).toEqual([true, false]);
    expect(s[0].submitted).toBe(1);
    expect(s[0].total).toBe(2);
  });

  it("미배치는 제출 주체가 없으므로 제출 수를 세지 않는다", () => {
    const s = buildSections([p("a", "UNASSIGNED")], new Set(["a"]));
    expect(s[2].submitted).toBe(0);
    expect(s[2].total).toBe(1);
  });

  it("비어 있는 섹션도 남긴다 — 화면에서 숨길지는 호출부가 정한다", () => {
    const s = buildSections([], new Set());
    expect(s).toHaveLength(3);
    expect(s.every((x) => x.rows.length === 0 && x.total === 0)).toBe(true);
  });

  it("진행 중에 주요 프로젝트가 있으면 주요 프로젝트만 보여주고 제출 수도 그 안에서 센다", () => {
    const s = buildSections(
      [p("a", "IN_PROGRESS"), { ...p("b", "IN_PROGRESS"), featured: true }, { ...p("c", "IN_PROGRESS"), featured: true }],
      new Set(["a", "b"]),
    );
    expect(s[0].rows.map((r) => r.project.id)).toEqual(["b", "c"]);
    expect(s[0].submitted).toBe(1);
    expect(s[0].total).toBe(2);
  });

  it("진행 중에 주요 프로젝트가 없으면 전부 보여준다", () => {
    const s = buildSections([p("a", "IN_PROGRESS"), p("b", "IN_PROGRESS")], new Set());
    expect(s[0].rows.map((r) => r.project.id)).toEqual(["a", "b"]);
  });

  it("완료·미배치 섹션은 주요 여부로 거르지 않는다", () => {
    const s = buildSections([p("a", "DONE"), { ...p("b", "DONE"), featured: true }], new Set());
    expect(s[1].rows.map((r) => r.project.id)).toEqual(["a", "b"]);
  });
});
