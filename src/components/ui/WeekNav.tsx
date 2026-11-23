"use client";

import { useRouter } from "next/navigation";
import { shiftWeek } from "@/lib/reports/weekly";
import { cn } from "@/lib/utils/cn";

const ymd = (d: Date) => d.toISOString().slice(0, 10);

const nav =
  "px-3 py-1.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-500 disabled:cursor-default disabled:text-slate-300 enabled:text-slate-600 enabled:hover:bg-slate-50";

/** ← 이전 주 | 이번 주 | 다음 주 → + 기간. `${path}?week=YYYY-MM-DD` 로 이동한다. 이번 주보다 뒤로는 못 간다 */
export function WeekNav({ path, week, thisWeek }: { path: string; week: string; thisWeek: string }) {
  const router = useRouter();
  const go = (w: string) => router.replace(`${path}?week=${w}`);
  const move = (weeks: number) => go(ymd(shiftWeek(new Date(`${week}T00:00:00Z`), weeks)));
  const end = ymd(new Date(new Date(`${week}T00:00:00Z`).getTime() + 6 * 86_400_000));

  return (
    <>
      <div role="group" aria-label="주차 이동" className="inline-flex rounded-md border border-slate-300">
        <button type="button" onClick={() => move(-1)} className={cn(nav, "rounded-l-md")}>
          ← 이전 주
        </button>
        <button type="button" onClick={() => go(thisWeek)} disabled={week === thisWeek} className={cn(nav, "border-x border-slate-300")}>
          이번 주
        </button>
        <button type="button" onClick={() => move(1)} disabled={week >= thisWeek} className={cn(nav, "rounded-r-md")}>
          다음 주 →
        </button>
      </div>
      <span className="text-sm tabular-nums text-slate-600">
        {week} ~ {end}
      </span>
    </>
  );
}
