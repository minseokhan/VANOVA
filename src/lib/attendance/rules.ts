import { parseDay } from "@/lib/minutes/rules";

export const MAX_CHECK_TITLE = 100;
/** MEETING: 회의 출석, TASK: 기한 있는 투표·과제 (date 가 마감일) */
export const CHECK_KINDS = ["MEETING", "TASK"] as const;
export type CheckKind = (typeof CHECK_KINDS)[number];
export const CHECK_KIND_LABEL: Record<CheckKind, string> = { MEETING: "회의 출석", TASK: "투표 · 과제" };

type Field = "kind" | "title" | "date";
export type CheckEventResult =
  | { ok: true; value: { kind: CheckKind; title: string; date: Date } }
  | { ok: false; errors: Partial<Record<Field, string>> };

export function validateCheckEvent(input: { kind: string; title: string; date: string }): CheckEventResult {
  const errors: Partial<Record<Field, string>> = {};
  const kind = CHECK_KINDS.find((k) => k === input.kind);
  if (!kind) errors.kind = "종류를 선택하세요";
  const title = input.title.trim();
  if (title.length === 0) errors.title = "제목을 입력하세요";
  else if (title.length > MAX_CHECK_TITLE) errors.title = `제목은 ${MAX_CHECK_TITLE}자 이하로 입력하세요`;
  const date = parseDay(input.date.trim());
  if (!date) errors.date = "날짜를 선택하세요";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { kind: kind!, title, date: date! } };
}

/** 회의는 체크 안 됐으면 불참. 투표·과제는 마감일(date)이 지난 뒤에만 미참여. 날짜는 "YYYY-MM-DD" (KST) */
export function isMissed(e: { kind: CheckKind; date: string }, done: boolean, today: string): boolean {
  return !done && (e.kind === "MEETING" || e.date < today);
}

export type CheckEventSummary = { id: string; kind: CheckKind; title: string; date: string };
export type MemberSummary = { attended: number; meetings: number; missed: CheckEventSummary[] };

/** 멤버별 회의 출석 수와 불참·미참여 기록. 기록이 만들어질 때 대상(entries)에 없던 멤버는 세지 않는다 */
export function summarize(
  userIds: string[],
  events: (CheckEventSummary & { entries: { userId: string; done: boolean }[] })[],
  today: string,
): Record<string, MemberSummary> {
  const out: Record<string, MemberSummary> = Object.fromEntries(userIds.map((id) => [id, { attended: 0, meetings: 0, missed: [] }]));
  for (const { entries, ...e } of events) {
    for (const { userId, done } of entries) {
      const s = out[userId];
      if (!s) continue;
      if (e.kind === "MEETING") {
        s.meetings++;
        if (done) s.attended++;
      }
      if (isMissed(e, done, today)) s.missed.push(e);
    }
  }
  return out;
}
