"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { WeekNav } from "@/components/ui/WeekNav";

export function ReportToolbar({ week, thisWeek }: { week: string; thisWeek: string }) {
  // 인쇄물에는 접힌 카드까지 전부 펼쳐져 나와야 한다
  useEffect(() => {
    const openAll = () => document.querySelectorAll("details").forEach((d) => (d.open = true));
    window.addEventListener("beforeprint", openAll);
    return () => window.removeEventListener("beforeprint", openAll);
  }, []);

  return (
    <div className="no-print mb-6 flex flex-wrap items-center gap-3">
      <WeekNav path="/reports" week={week} thisWeek={thisWeek} />
      <Button variant="secondary" className="ml-auto" onClick={() => window.print()}>
        <Printer size={16} strokeWidth={1.75} aria-hidden />
        PDF로 저장 · 인쇄
      </Button>
    </div>
  );
}
