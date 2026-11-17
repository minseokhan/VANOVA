"use client";

import { useState } from "react";
import { WeeklyAttachmentList } from "@/components/projects/WeeklyAttachmentList";
import type { WeeklyUpdateItem } from "@/components/projects/WeeklyUpdates";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils/cn";
import { formatWeekLabel } from "@/lib/utils/week";

function Entry({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-600">{label}</dt>
      <dd className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{text}</dd>
    </div>
  );
}

// /reports 의 ReportToolbar 와 같은 모양
const nav =
  "px-3 py-1.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-500 disabled:cursor-default disabled:text-slate-300 enabled:text-slate-600 enabled:hover:bg-slate-50";

/** 보고 한 건씩 보기. updates 는 최신 주가 앞(weekStart desc). 보고가 있는 주끼리만 이동한다 */
export function WeeklyUpdateViewer({ updates, currentId }: { updates: WeeklyUpdateItem[]; currentId: string | null }) {
  const [index, setIndex] = useState(0);
  const w = updates[index];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="보고 주차 이동" className="inline-flex rounded-md border border-slate-300">
          <button type="button" onClick={() => setIndex(index + 1)} disabled={index >= updates.length - 1} className={cn(nav, "rounded-l-md")}>
            ← 이전 보고
          </button>
          <button type="button" onClick={() => setIndex(0)} disabled={index === 0} className={cn(nav, "border-x border-slate-300")}>
            최신
          </button>
          <button type="button" onClick={() => setIndex(index - 1)} disabled={index === 0} className={cn(nav, "rounded-r-md")}>
            다음 보고 →
          </button>
        </div>
        <Select
          aria-label="보고 주차 선택"
          value={index}
          onChange={(e) => setIndex(Number(e.target.value))}
          className="max-w-64 py-1.5 text-xs"
        >
          {updates.map((u, i) => (
            <option key={u.id} value={i}>
              {formatWeekLabel(u.weekStart)} · {u.authorName}
            </option>
          ))}
        </Select>
        <span className="text-xs text-slate-400 tabular-nums">
          {index + 1} / {updates.length}
        </span>
      </div>
      <article className="rounded-md border border-slate-200 p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="font-medium">{formatWeekLabel(w.weekStart)}</span>
          <span>· {w.authorName}</span>
          {w.id === currentId && <Badge tone="navy">이번 주</Badge>}
        </div>
        <dl className="space-y-2">
          <Entry label="이번 주 한 일" text={w.didThisWeek} />
          <Entry label="다음 주 계획" text={w.planNextWeek} />
          {w.issues && <Entry label="이슈 · 막힌 점" text={w.issues} />}
        </dl>
        {w.attachments.length > 0 && (
          <div className="mt-3">
            <WeeklyAttachmentList items={w.attachments} />
          </div>
        )}
      </article>
    </div>
  );
}
