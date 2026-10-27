import { describe, expect, it } from "vitest";
import { filterProjects, myProjectIds, sortProjects } from "./filter";

const p = (
  over: Partial<{
    status: "UNASSIGNED" | "IN_PROGRESS" | "DONE";
    category: string;
    title: string;
    code: string;
    summary: string;
    priority: string;
    members: { id: string }[];
    featured: boolean;
  }>,
) => ({
  id: over.code ?? "1-1",
  status: "UNASSIGNED" as const,
  category: "교육",
  title: "제목",
  code: "1-1",
  summary: "요약",
  priority: "中",
  members: [] as { id: string }[],
  ...over,
});

describe("filterProjects", () => {
  const list = [
    p({ code: "1-1", status: "UNASSIGNED", category: "교육", title: "챗봇 만들기", summary: "학회용 봇" }),
    p({ code: "2-1", status: "IN_PROGRESS", category: "운영", title: "출석 관리", summary: "QR 체크인" }),
    p({ code: "3-1", status: "DONE", category: "교육", title: "Slide Bot", summary: "발표 자료" }),
  ];
  it("필터 없음/ALL이면 전부", () => {
    expect(filterProjects(list, {})).toEqual(list);
    expect(filterProjects(list, { status: "ALL", category: "ALL", q: "" })).toEqual(list);
  });
  it("status 필터", () => {
    expect(filterProjects(list, { status: "DONE" }).map((x) => x.code)).toEqual(["3-1"]);
  });
  it("category 필터", () => {
    expect(filterProjects(list, { category: "교육" }).map((x) => x.code)).toEqual(["1-1", "3-1"]);
  });
  it("q는 title/code/summary 대소문자 무시 부분일치", () => {
    expect(filterProjects(list, { q: "slide" }).map((x) => x.code)).toEqual(["3-1"]);
    expect(filterProjects(list, { q: "2-1" }).map((x) => x.code)).toEqual(["2-1"]);
    expect(filterProjects(list, { q: "qr" }).map((x) => x.code)).toEqual(["2-1"]);
    expect(filterProjects(list, { q: "  봇 " }).map((x) => x.code)).toEqual(["1-1"]);
    expect(filterProjects(list, { q: "없음" })).toEqual([]);
  });
  it("조건은 AND", () => {
    expect(filterProjects(list, { status: "UNASSIGNED", category: "운영" })).toEqual([]);
  });
});

describe("sortProjects", () => {
  it("진행중 → 미배정 → 완료", () => {
    const list = [p({ code: "1", status: "DONE" }), p({ code: "2", status: "UNASSIGNED" }), p({ code: "3", status: "IN_PROGRESS" })];
    expect(sortProjects(list).map((x) => x.code)).toEqual(["3", "2", "1"]);
  });
  it("같은 상태에서는 priorityRank 오름차순", () => {
    const list = [p({ code: "1", priority: "下" }), p({ code: "2", priority: "上" }), p({ code: "3", priority: "中" })];
    expect(sortProjects(list).map((x) => x.code)).toEqual(["2", "3", "1"]);
  });
  it("같은 우선순위에서는 code 자연 정렬", () => {
    const list = [p({ code: "2-10" }), p({ code: "2-2" }), p({ code: "2-1" }), p({ code: "10-1" })];
    expect(sortProjects(list).map((x) => x.code)).toEqual(["2-1", "2-2", "2-10", "10-1"]);
  });
  it("내 프로젝트가 맨 위로", () => {
    const list = [
      p({ code: "1", status: "IN_PROGRESS", priority: "上" }),
      p({ code: "2", status: "DONE", members: [{ id: "me" }] }),
      p({ code: "3", status: "IN_PROGRESS", priority: "下", members: [{ id: "me" }] }),
    ];
    expect(sortProjects(list, myProjectIds(list, "me")).map((x) => x.code)).toEqual(["3", "2", "1"]);
  });
  it("내 프로젝트끼리는 기존 순서 규칙을 그대로 따른다", () => {
    const list = [
      p({ code: "1", status: "DONE", members: [{ id: "me" }] }),
      p({ code: "2", status: "IN_PROGRESS", members: [{ id: "me" }] }),
    ];
    expect(sortProjects(list, myProjectIds(list, "me")).map((x) => x.code)).toEqual(["2", "1"]);
  });
  it("집합이 없으면 기존 정렬 그대로", () => {
    const list = [p({ code: "1", status: "DONE", members: [{ id: "me" }] }), p({ code: "2", status: "IN_PROGRESS" })];
    expect(sortProjects(list).map((x) => x.code)).toEqual(["2", "1"]);
  });
  it("주요 프로젝트가 내 프로젝트보다도 맨 위로", () => {
    const list = [
      p({ code: "1", status: "IN_PROGRESS", members: [{ id: "me" }] }),
      p({ code: "2", status: "DONE", featured: true }),
      p({ code: "3", status: "IN_PROGRESS", featured: true }),
    ];
    expect(sortProjects(list, myProjectIds(list, "me")).map((x) => x.code)).toEqual(["3", "2", "1"]);
  });
  it("원본 배열을 변경하지 않는다", () => {
    const list = [p({ code: "2" }), p({ code: "1" })];
    sortProjects(list);
    expect(list.map((x) => x.code)).toEqual(["2", "1"]);
  });
});

describe("myProjectIds", () => {
  it("내가 멤버인 프로젝트의 id만 모은다", () => {
    const list = [
      p({ code: "1", members: [{ id: "me" }, { id: "other" }] }),
      p({ code: "2", members: [{ id: "other" }] }),
      p({ code: "3" }),
    ];
    expect([...myProjectIds(list, "me")]).toEqual(["1"]);
  });
});
