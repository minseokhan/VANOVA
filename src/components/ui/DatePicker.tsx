"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { inputClass } from "./Input";

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * 표시할 날짜(marked)에 배경을 칠하는 달력. 브라우저 기본 date 입력은 날짜별 표시가 안 돼서 직접 그린다.
 * value·onChange 는 "YYYY-MM-DD".
 */
export function DatePicker({
  id,
  value,
  onChange,
  marked,
  markedLabel,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  marked: Set<string>;
  markedLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [y0, m0] = value.split("-").map(Number);
  const [month, setMonth] = useState({ y: y0, m: m0 - 1 });

  const first = new Date(Date.UTC(month.y, month.m, 1));
  const days = new Date(Date.UTC(month.y, month.m + 1, 0)).getUTCDate();
  const cells = [...Array(first.getUTCDay()).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const shift = (n: number) => setMonth(({ y, m }) => ({ y: m + n < 0 ? y - 1 : m + n > 11 ? y + 1 : y, m: (m + n + 12) % 12 }));

  return (
    <div className="relative">
      <button
        id={id}
        type="button"
        onClick={() => {
          setMonth({ y: y0, m: m0 - 1 });
          setOpen((o) => !o);
        }}
        className={cn(inputClass, "flex items-center justify-between text-left")}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {value.replaceAll("-", ". ")}.
        <CalendarDays size={16} strokeWidth={1.75} className="text-slate-500" aria-hidden />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div role="dialog" className="absolute z-20 mt-1 w-72 rounded-md border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <button type="button" onClick={() => shift(-1)} className="rounded p-1 hover:bg-slate-100" aria-label="이전 달">
                <ChevronLeft size={16} aria-hidden />
              </button>
              <span className="text-sm font-semibold text-slate-900">
                {month.y}년 {month.m + 1}월
              </span>
              <button type="button" onClick={() => shift(1)} className="rounded p-1 hover:bg-slate-100" aria-label="다음 달">
                <ChevronRight size={16} aria-hidden />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {WEEK.map((w) => (
                <span key={w} className="py-1 text-slate-500">
                  {w}
                </span>
              ))}
              {cells.map((d, i) => {
                if (d === null) return <span key={`b${i}`} />;
                const v = `${month.y}-${pad(month.m + 1)}-${pad(d)}`;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      onChange(v);
                      setOpen(false);
                    }}
                    className={cn(
                      "rounded py-1.5 tabular-nums",
                      v === value
                        ? "bg-navy-500 font-semibold text-white"
                        : marked.has(v)
                          ? "bg-navy-100 font-semibold text-navy-700 ring-1 ring-navy-500/50 ring-inset hover:bg-navy-50"
                          : "text-slate-700 hover:bg-slate-100",
                    )}
                    aria-pressed={v === value}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
              <span className="inline-block size-3 rounded-sm bg-navy-100 ring-1 ring-navy-500/50 ring-inset" aria-hidden />
              {markedLabel}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
