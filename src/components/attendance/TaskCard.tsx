"use client";

import { Check, ChevronDown } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { deleteTask, setTaskEntry } from "@/app/(dashboard)/attendance/actions";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils/cn";

export type TaskItem = {
  id: string;
  title: string;
  dueDate: string;
  entries: { userId: string; name: string; done: boolean }[];
};

type Entry = TaskItem["entries"][number];

/** 접힌 상태에선 참여·미참여 수만, 펼치면 사람별로 — 이름을 누르면 참여가 토글되어 바로 저장된다 */
export function TaskCard({ task, today }: { task: TaskItem; today: string }) {
  const [entries, toggle] = useOptimistic(task.entries, (list, userId: string) =>
    list.map((e) => (e.userId === userId ? { ...e, done: !e.done } : e)),
  );
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const done = entries.filter((e) => e.done);
  const notDone = entries.filter((e) => !e.done);
  const closed = task.dueDate < today;

  const onToggle = (userId: string, next: boolean) =>
    startTransition(async () => {
      toggle(userId);
      const r = await setTaskEntry(task.id, userId, next);
      setError(r.error ?? null);
    });

  const chips = (list: Entry[]) =>
    list.length === 0 ? (
      <span className="text-xs text-slate-400">없음</span>
    ) : (
      <ul className="flex flex-wrap gap-2">
        {list.map((e) => (
          <li key={e.userId}>
            <button
              type="button"
              aria-pressed={e.done}
              onClick={() => onToggle(e.userId, !e.done)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-500",
                e.done ? "border-navy-500 bg-navy-50 text-navy-900" : "border-slate-200 text-slate-600 hover:border-slate-300",
              )}
            >
              {e.done && <Check size={14} strokeWidth={2.25} aria-hidden />}
              {e.name}
            </button>
          </li>
        ))}
      </ul>
    );

  return (
    <article className="rounded-md border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-500"
        >
          <ChevronDown
            size={16}
            strokeWidth={1.75}
            aria-hidden
            className={cn("shrink-0 text-slate-400 transition-transform", expanded && "rotate-180")}
          />
          <h3 className="truncate text-sm font-semibold text-slate-900">{task.title}</h3>
          <span className="shrink-0 text-xs text-slate-500 tabular-nums">마감 {task.dueDate}</span>
          {closed ? <Badge>마감</Badge> : <Badge tone="amber">진행중</Badge>}
        </button>
        <span className="text-sm text-slate-700 tabular-nums">
          참여 <strong className="font-semibold text-slate-900">{done.length}</strong>명 · {closed ? "미참여" : "아직 안 함"}{" "}
          <strong className={cn("font-semibold", closed && notDone.length > 0 ? "text-red-700" : "text-slate-900")}>{notDone.length}</strong>명
        </span>
        <ConfirmDialog
          label="삭제"
          size="sm"
          title="투표 · 과제 삭제"
          message={`"${task.title}" 항목과 체크 내역을 삭제할까요? 되돌릴 수 없습니다.`}
          confirmLabel="삭제"
          onConfirm={() => deleteTask(task.id).then((r) => setError(r.error ?? null))}
        />
      </div>
      {expanded && (
        <div className="space-y-3 border-t border-slate-100 px-4 py-3">
          <div>
            <p className="mb-1.5 text-xs font-medium text-slate-600">
              {closed ? "미참여" : "아직 안 함"} ({notDone.length}) — 이름을 누르면 참여로 체크
            </p>
            {chips(notDone)}
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium text-slate-600">참여 ({done.length})</p>
            {chips(done)}
          </div>
        </div>
      )}
      {error && <p className="px-4 pb-3 text-xs text-red-700">{error}</p>}
    </article>
  );
}
