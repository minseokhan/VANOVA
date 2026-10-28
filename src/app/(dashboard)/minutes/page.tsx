import { ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { currentMonth, formatMonth, parseMonth } from "@/lib/expenses/rules";
import { defaultMeetingDate } from "@/lib/minutes/compose";
import { monthRange } from "@/lib/minutes/rules";
import { formatDate } from "@/lib/utils/date";
import { MonthPicker } from "@/components/expenses/ExpenseActions";
import { GenerateMinuteForm } from "@/components/minutes/GenerateMinute";
import { DeleteMinuteButton, MinuteForm } from "@/components/minutes/MinuteForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";

// 회의록 생성(LLM 호출 + 드라이브 업로드)이 기본 제한 시간을 넘길 수 있다
export const maxDuration = 300;

/** 기본은 이번 달 회의록만 불러오고, 지난 달은 월을 골라 본다 */
export default async function MinutesPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";
  const month = parseMonth((await searchParams).month ?? "") ?? currentMonth();

  const [minutes, members, notes] = await Promise.all([
    db.meetingMinute.findMany({
      where: { date: monthRange(month) },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      select: { id: true, date: true, title: true, fileUrl: true, author: { select: { name: true } } },
    }),
    isAdmin ? db.user.findMany({ where: { role: "MEMBER", approved: true }, select: { name: true } }) : [],
    isAdmin ? db.meetingNote.findMany({ select: { date: true, notes: true } }) : [],
  ]);
  const savedNotes = Object.fromEntries(notes.map((n) => [n.date.toISOString().slice(0, 10), n.notes]));
  // 참석 대상 기본값: 승인된 부원 + 작성하는 운영진 본인
  const roster = [...new Set([...members.map((m) => m.name), user.name])].sort((a, b) => a.localeCompare(b, "ko")).join(", ");

  return (
    <>
      <PageHeader title="주간 회의록" />
      <div className="space-y-6">
        <MonthPicker month={month} path="/minutes" label="조회 월" />

        {isAdmin && (
          <div className="flex flex-wrap items-start gap-3">
            <GenerateMinuteForm defaultDate={defaultMeetingDate()} defaultRoster={roster} savedNotes={savedNotes} />
            <MinuteForm today={formatDate(new Date())} />
          </div>
        )}

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900">
            {formatMonth(month)} 회의록 <span className="text-sm font-normal text-slate-500">· {minutes.length}건</span>
          </h2>
          {minutes.length === 0 ? (
            <EmptyState message="이 달에 등록된 회의록이 없습니다" />
          ) : (
            <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
              {minutes.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-5">
                  <span className="w-24 text-sm tabular-nums text-slate-500">{formatDate(m.date)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">{m.title}</p>
                    <p className="text-xs text-slate-500">작성 {m.author.name}</p>
                  </div>
                  <a
                    href={m.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-navy-500 hover:underline"
                  >
                    <ExternalLink size={14} strokeWidth={1.75} aria-hidden />
                    회의록 열기
                  </a>
                  {isAdmin && <DeleteMinuteButton id={m.id} title={m.title} />}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
