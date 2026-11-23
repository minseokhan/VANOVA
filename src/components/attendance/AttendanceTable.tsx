"use client";

import { useOptimistic, useState, useTransition } from "react";
import { setAttendance } from "@/app/(dashboard)/attendance/actions";
import { Avatar } from "@/components/ui/Avatar";
import { ATTENDANCE_LABEL, ATTENDANCE_STATUSES, type AttendanceStatus } from "@/lib/attendance/rules";
import { cn } from "@/lib/utils/cn";

export type AttendanceRow = {
  userId: string;
  name: string;
  /** 이 주 상태. null 이면 아직 체크 안 함 */
  status: AttendanceStatus | null;
  /** 지금까지 누적 */
  totals: Record<AttendanceStatus, number>;
};

const SELECTED: Record<AttendanceStatus, string> = {
  PRESENT: "bg-navy-700 text-white",
  EXCUSED: "bg-amber-100 text-amber-800",
  ABSENT: "bg-red-100 text-red-700",
};

const th = "px-3 py-2 text-left text-xs font-medium text-slate-600";

/** 멤버마다 출석 / 인정 불참 / 불참 중 하나를 고르면 바로 저장된다 */
export function AttendanceTable({ week, rows }: { week: string; rows: AttendanceRow[] }) {
  const [list, apply] = useOptimistic(rows, (cur, p: { userId: string; status: AttendanceStatus }) =>
    cur.map((r) => (r.userId === p.userId ? { ...r, status: p.status } : r)),
  );
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const pick = (userId: string, status: AttendanceStatus) =>
    startTransition(async () => {
      apply({ userId, status });
      const r = await setAttendance(week, userId, status);
      setError(r.error ?? null);
    });

  const count = (s: AttendanceStatus | null) => list.filter((r) => r.status === s).length;

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500 tabular-nums">
        출석 {count("PRESENT")} · 인정 불참 {count("EXCUSED")} · 불참 {count("ABSENT")}
        {count(null) > 0 && <span className="text-slate-400"> · 미체크 {count(null)}</span>}
      </p>
      <div className="overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full min-w-[640px] table-fixed">
          <colgroup>
            <col className="w-[30%]" />
            <col />
            <col className="w-72" />
          </colgroup>
          <thead className="bg-navy-50">
            <tr>
              <th className={`${th} pl-8`}>이름</th>
              <th className={th}>누적 (출석 · 인정 불참 · 불참)</th>
              <th className={`${th} pr-8`}>이번 회의</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.userId} className="border-b border-slate-100 last:border-0">
                <td className="py-2 pr-3 pl-8">
                  <span className="flex min-w-0 items-center gap-3 text-sm text-slate-900">
                    <Avatar name={r.name} />
                    <span className="truncate">{r.name}</span>
                  </span>
                </td>
                <td className="px-3 py-2 text-sm text-slate-700 tabular-nums">
                  {r.totals.PRESENT} · {r.totals.EXCUSED} ·{" "}
                  <span className={r.totals.ABSENT > 0 ? "font-medium text-red-700" : undefined}>{r.totals.ABSENT}</span>
                </td>
                <td className="py-2 pr-8 pl-3">
                  <div role="radiogroup" aria-label={`${r.name} 출석`} className="inline-flex rounded-md border border-slate-300 p-0.5">
                    {ATTENDANCE_STATUSES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        role="radio"
                        aria-checked={r.status === s}
                        onClick={() => r.status !== s && pick(r.userId, s)}
                        className={cn(
                          "rounded px-3 py-1 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-navy-500",
                          r.status === s ? cn("font-medium", SELECTED[s]) : "text-slate-500 hover:bg-slate-50",
                        )}
                      >
                        {ATTENDANCE_LABEL[s]}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
