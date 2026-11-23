"use client";

import { useOptimistic, useState, useTransition } from "react";
import { setAttendance, setAttendanceReason } from "@/app/(dashboard)/attendance/actions";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import { ATTENDANCE_LABEL, ATTENDANCE_STATUSES, MAX_REASON, type AttendanceStatus } from "@/lib/attendance/rules";
import { cn } from "@/lib/utils/cn";

export type AttendanceRow = {
  userId: string;
  name: string;
  /** 이 주 상태. null 이면 아직 체크 안 함 */
  status: AttendanceStatus | null;
  /** 인정 불참 사유 */
  reason: string | null;
  /** 지금까지 누적 */
  totals: Record<AttendanceStatus, number>;
};

const SELECTED: Record<AttendanceStatus, string> = {
  PRESENT: "bg-navy-700 text-white",
  EXCUSED: "bg-amber-100 text-amber-800",
  ABSENT: "bg-red-100 text-red-700",
};

const th = "px-3 py-2 text-left text-xs font-medium text-slate-600";

/** 멤버마다 출석 / 인정 불참 / 불참 중 하나를 고르면 바로 저장된다. 인정 불참이면 오른쪽에 사유 칸이 뜬다 */
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

  const saveReason = (row: AttendanceRow, value: string) => {
    if (value.trim() === (row.reason ?? "")) return;
    startTransition(async () => {
      const r = await setAttendanceReason(week, row.userId, value);
      setError(r.error ?? null);
    });
  };

  const count = (s: AttendanceStatus | null) => list.filter((r) => r.status === s).length;

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500 tabular-nums">
        출석 {count("PRESENT")} · 인정 불참 {count("EXCUSED")} · 불참 {count("ABSENT")}
        {count(null) > 0 && <span className="text-slate-400"> · 미체크 {count(null)}</span>}
      </p>
      <div className="overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full min-w-[760px] table-fixed">
          <colgroup>
            <col className="w-48" />
            <col className="w-64" />
            <col />
            <col className="w-44" />
          </colgroup>
          <thead className="bg-navy-50">
            <tr>
              <th className={`${th} pl-8`}>이름</th>
              <th className={th}>회의 출석</th>
              <th className={th}>인정 불참 사유</th>
              <th className={`${th} pr-8`}>누적 (출석 · 인정 · 불참)</th>
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
                <td className="px-3 py-2">
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
                <td className="px-3 py-2">
                  {r.status === "EXCUSED" && (
                    <Input
                      key={`${week}-${r.userId}`}
                      aria-label={`${r.name} 인정 불참 사유`}
                      defaultValue={r.reason ?? ""}
                      maxLength={MAX_REASON}
                      placeholder="사유 입력 후 Enter (예: 학교 시험)"
                      className="py-1.5 text-sm"
                      onBlur={(e) => saveReason(r, e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                    />
                  )}
                </td>
                <td className="py-2 pr-8 pl-3 text-sm text-slate-700 tabular-nums">
                  {r.totals.PRESENT} · {r.totals.EXCUSED} ·{" "}
                  <span className={r.totals.ABSENT > 0 ? "font-medium text-red-700" : undefined}>{r.totals.ABSENT}</span>
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
