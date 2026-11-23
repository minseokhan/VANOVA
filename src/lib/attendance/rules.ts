import { parseDay } from "@/lib/minutes/rules";

export const ATTENDANCE_STATUSES = ["PRESENT", "EXCUSED", "ABSENT"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];
export const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = { PRESENT: "출석", EXCUSED: "인정 불참", ABSENT: "불참" };

export function isAttendanceStatus(v: string): v is AttendanceStatus {
  return (ATTENDANCE_STATUSES as readonly string[]).includes(v);
}

export const MAX_REASON = 200;

/** 인정 불참 사유. 비우면 null */
export function normalizeReason(raw: string): { ok: true; value: string | null } | { ok: false; error: string } {
  const v = raw.trim();
  if (v.length > MAX_REASON) return { ok: false, error: `사유는 ${MAX_REASON}자 이하로 입력하세요` };
  return { ok: true, value: v || null };
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
