import type { ProjectStatus } from "@prisma/client";

/** 진행 중 → 완료 → 미배치. 보고서를 읽는 순서라 화면·인쇄물에서 고정이다 */
const ORDER: { key: ProjectStatus; label: string }[] = [
  { key: "IN_PROGRESS", label: "진행 중" },
  { key: "DONE", label: "완료" },
  { key: "UNASSIGNED", label: "미배치" },
];

export type SectionRow<P> = { project: P; submitted: boolean };
export type Section<P> = {
  key: ProjectStatus;
  label: string;
  rows: SectionRow<P>[];
  submitted: number;
  total: number;
};

/**
 * 프로젝트를 상태별 3개 섹션으로 나눈다. 미배치는 제출 주체가 없어 제출 수를 세지 않는다.
 * 섹션 안에서는 주요 프로젝트(featured)를 맨 위로 올리고 나머지는 입력 순서를 유지한다
 */
export function buildSections<P extends { id: string; status: ProjectStatus; featured?: boolean }>(
  projects: P[],
  submittedIds: Set<string>,
): Section<P>[] {
  return ORDER.map(({ key, label }) => {
    const rows = projects
      .filter((p) => p.status === key)
      .sort((a, b) => Number(!!b.featured) - Number(!!a.featured))
      .map((project) => ({ project, submitted: key !== "UNASSIGNED" && submittedIds.has(project.id) }));
    return { key, label, rows, submitted: rows.filter((r) => r.submitted).length, total: rows.length };
  });
}
