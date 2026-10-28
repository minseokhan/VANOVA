import { nextMonth } from "@/lib/expenses/rules";

export const MAX_MINUTE_TITLE = 100;

export type MinuteRawInput = { date: string; title: string; fileUrl: string };
export type MinuteResult =
  | { ok: true; value: { date: Date; title: string; fileUrl: string } }
  | { ok: false; errors: Partial<Record<"date" | "title" | "fileUrl", string>> };

/** "YYYY-MM-DD" → UTC 자정 Date (@db.Date 컬럼용). 없는 날짜는 null */
export function parseDay(v: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00Z`);
  return !isNaN(d.getTime()) && d.toISOString().startsWith(v) ? d : null;
}

export function validateMinute(input: MinuteRawInput): MinuteResult {
  const errors: Partial<Record<"date" | "title" | "fileUrl", string>> = {};
  const date = parseDay(input.date.trim());
  if (!date) errors.date = "회의 날짜를 선택하세요";

  const title = input.title.trim();
  if (title.length === 0) errors.title = "제목을 입력하세요";
  else if (title.length > MAX_MINUTE_TITLE) errors.title = `제목은 ${MAX_MINUTE_TITLE}자 이하로 입력하세요`;

  const fileUrl = input.fileUrl.trim();
  if (!fileUrl.startsWith("https://")) errors.fileUrl = "회의록 링크를 https:// 주소로 입력하세요";

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { date: date!, title, fileUrl } };
}

/** "YYYY-MM" 한 달의 Prisma 날짜 범위 */
export function monthRange(month: string): { gte: Date; lt: Date } {
  return { gte: new Date(`${month}-01T00:00:00Z`), lt: new Date(`${nextMonth(month)}-01T00:00:00Z`) };
}
