import { parseDay } from "@/lib/minutes/rules";

export const ATTENDANCE_STATUSES = ["PRESENT", "EXCUSED", "ABSENT"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];
export const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = { PRESENT: "출석", EXCUSED: "인정 불참", ABSENT: "불참" };

export function isAttendanceStatus(v: string): v is AttendanceStatus {
  return (ATTENDANCE_STATUSES as readonly string[]).includes(v);
}

/** 멤버별 출석·인정 불참·불참 수 */
export function countAttendance(
  userIds: string[],
  rows: { userId: string; status: AttendanceStatus }[],
): Record<string, Record<AttendanceStatus, number>> {
  const out = Object.fromEntries(userIds.map((id) => [id, { PRESENT: 0, EXCUSED: 0, ABSENT: 0 }]));
  for (const r of rows) if (out[r.userId]) out[r.userId][r.status]++;
  return out;
}

export const MAX_TASK_TITLE = 100;

export type TaskResult =
  | { ok: true; value: { title: string; dueDate: Date } }
  | { ok: false; errors: Partial<Record<"title" | "dueDate", string>> };

export function validateTask(input: { title: string; dueDate: string }): TaskResult {
  const errors: Partial<Record<"title" | "dueDate", string>> = {};
  const title = input.title.trim();
  if (title.length === 0) errors.title = "제목을 입력하세요";
  else if (title.length > MAX_TASK_TITLE) errors.title = `제목은 ${MAX_TASK_TITLE}자 이하로 입력하세요`;
  const dueDate = parseDay(input.dueDate.trim());
  if (!dueDate) errors.dueDate = "마감일을 선택하세요";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { title, dueDate: dueDate! } };
}

/** 마감일(dueDate)이 지났는데 체크되지 않았으면 미참여. 날짜는 "YYYY-MM-DD" (KST) */
export function isMissed(dueDate: string, done: boolean, today: string): boolean {
  return !done && dueDate < today;
}

export type TaskSummary = { id: string; title: string; dueDate: string };

/** 멤버별 미참여 투표·과제. 과제를 만들 때 대상(entries)에 없던 멤버는 세지 않는다 */
export function missedTasks(
  userIds: string[],
  tasks: (TaskSummary & { entries: { userId: string; done: boolean }[] })[],
  today: string,
): Record<string, TaskSummary[]> {
  const out: Record<string, TaskSummary[]> = Object.fromEntries(userIds.map((id) => [id, []]));
  for (const { entries, ...t } of tasks) {
    for (const { userId, done } of entries) if (out[userId] && isMissed(t.dueDate, done, today)) out[userId].push(t);
  }
  return out;
}
