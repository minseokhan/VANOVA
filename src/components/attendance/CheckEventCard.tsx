"use client";

import { Check } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { deleteCheckEvent, setCheckEntry } from "@/app/(dashboard)/attendance/actions";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CHECK_KIND_LABEL, isMissed, type CheckKind } from "@/lib/attendance/rules";
import { cn } from "@/lib/utils/cn";

export type CheckEventItem = {
  id: string;
  kind: CheckKind;
  title: string;
  date: string;
  entries: { userId: string; name: string; done: boolean }[];
};

/** 이름을 누르면 출석·참여가 토글되어 바로 저장된다 */
export function CheckEventCard({ event, today }: { event: CheckEventItem; today: string }) {
  const [entries, toggle] = useOptimistic(event.entries, (list, userId: string) =>
    list.map((e) => (e.userId === userId ? { ...e, done: !e.done } : e)),
  );
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const done = entries.filter((e) => e.done).length;
  const open = event.kind === "TASK" && event.date >= today;

  const onToggle = (userId: string, next: boolean) =>
    startTransition(async () => {
      toggle(userId);
      const r = await setCheckEntry(event.id, userId, next);
      setError(r.error ?? null);
    });

  return (
    <article className="rounded-md border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge tone={event.kind === "MEETING" ? "navy" : "teal"}>{CHECK_KIND_LABEL[event.kind]}</Badge>
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">{event.title}</h3>
        <span className="text-xs text-slate-500 tabular-nums">
          {event.kind === "MEETING" ? event.date : `마감 ${event.date}`}
        </span>
        {open && <Badge tone="amber">진행중</Badge>}
        <span className="text-xs font-medium text-slate-700 tabular-nums">
          {event.kind === "MEETING" ? "출석" : "참여"} {done}/{entries.length}
        </span>
        <ConfirmDialog
          label="삭제"
          size="sm"
          title="기록 삭제"
          message={`"${event.title}" 기록과 체크 내역을 삭제할까요? 되돌릴 수 없습니다.`}
          confirmLabel="삭제"
          onConfirm={() => deleteCheckEvent(event.id).then((r) => setError(r.error ?? null))}
        />
      </div>
      {entries.length === 0 ? (
        <p className="text-xs text-slate-400">대상 부원이 없습니다</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {entries.map((e) => {
            const missed = isMissed(event, e.done, today);
            return (
              <li key={e.userId}>
                <button
                  type="button"
                  aria-pressed={e.done}
                  onClick={() => onToggle(e.userId, !e.done)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition-colors",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-500",
                    e.done
                      ? "border-navy-500 bg-navy-50 text-navy-900"
                      : missed
                        ? "border-red-200 bg-red-50 text-red-700 hover:border-red-300"
                        : "border-slate-200 text-slate-500 hover:border-slate-300",
                  )}
                >
                  {e.done && <Check size={14} strokeWidth={2.25} aria-hidden />}
                  {e.name}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </article>
  );
}
