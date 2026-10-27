import type { ProjectStatus } from "@prisma/client";

/** 진행 중 → 완료 → 미배치. 보고서를 읽는 순서라 화면·인쇄물에서 고정이다 */
const ORDER: { key: ProjectStatus; label: string }[] = [
  { key: "IN_PROGRESS", label: "진행 중" },
  { key: "DONE", label: "완료" },
  { key: "UNASSIGNED", label: "미배치" },
];

/**
 * 주간 보고 대상이 되는 진행 중 프로젝트. 주요 프로젝트(featured)가 하나라도 있으면 그것만,
 * 아무것도 지정하지 않았으면 전부. 보고 화면과 디스코드 독촉이 같은 기준을 쓴다
 */
export function reportTargets<P extends { featured?: boolean }>(inProgress: P[]): P[] {
  return inProgress.some((p) => p.featured) ? inProgress.filter((p) => p.featured) : inProgress;
}

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
 * 진행 중 섹션은 reportTargets 기준(주요 프로젝트가 있으면 그것만)으로 보여준다
 */
export function buildSections<P extends { id: string; status: ProjectStatus; featured?: boolean }>(
  projects: P[],
  submittedIds: Set<string>,
): Section<P>[] {
  return ORDER.map(({ key, label }) => {
    const inSection = projects.filter((p) => p.status === key);
    const rows = (key === "IN_PROGRESS" ? reportTargets(inSection) : inSection)
      .map((project) => ({ project, submitted: key !== "UNASSIGNED" && submittedIds.has(project.id) }));
    return { key, label, rows, submitted: rows.filter((r) => r.submitted).length, total: rows.length };
  });
}
