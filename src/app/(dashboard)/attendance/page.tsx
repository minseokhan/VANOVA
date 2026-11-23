import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { countAttendance, missedTasks } from "@/lib/attendance/rules";
import { parseWeekParam } from "@/lib/reports/weekly";
import { formatDate } from "@/lib/utils/date";
import { formatWeekLabel, getWeekStart } from "@/lib/utils/week";
import { AttendanceTable } from "@/components/attendance/AttendanceTable";
import { TaskCard } from "@/components/attendance/TaskCard";
import { TaskForm } from "@/components/attendance/TaskForm";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { WeekNav } from "@/components/ui/WeekNav";

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const sectionTitle = "border-l-2 border-navy-500 pl-2 text-sm font-semibold text-slate-900";

/** 위: 주간 회의 출석(주 단위 이동), 아래: 기한 있는 투표·과제 참여 */
export default async function AttendancePage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof Error && e.message === "FORBIDDEN") redirect("/");
    throw e;
  }
  const week = parseWeekParam((await searchParams).week);
  const today = formatDate(new Date());

  const [members, allAttendance, taskRows] = await Promise.all([
    db.user.findMany({ where: { role: "MEMBER", approved: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    // ponytail: 누적 집계를 위해 출석 기록 전체를 읽는다. 학기 단위로 수천 건이 넘으면 groupBy 로 바꿀 것
    db.attendance.findMany({ select: { weekStart: true, userId: true, status: true, reason: true } }),
    db.task.findMany({
      orderBy: [{ dueDate: "desc" }, { createdAt: "desc" }],
      select: {
        id: true, title: true, dueDate: true,
        entries: { select: { userId: true, done: true, user: { select: { name: true } } }, orderBy: { user: { name: "asc" } } },
      },
    }),
  ]);

  const ids = members.map((m) => m.id);
  const totals = countAttendance(ids, allAttendance);
  const thisWeek = new Map(allAttendance.filter((a) => a.weekStart.getTime() === week.getTime()).map((a) => [a.userId, a]));
  const tasks = taskRows.map((t) => ({
    id: t.id,
    title: t.title,
    dueDate: formatDate(t.dueDate),
    entries: t.entries.map((e) => ({ userId: e.userId, name: e.user.name, done: e.done })),
  }));
  const missed = missedTasks(ids, tasks, today);
  const missedMembers = members.filter((m) => missed[m.id].length > 0);

  return (
    <div className="space-y-10">
      <PageHeader title="출석 · 참여" />

      <section className="space-y-3">
        <h2 className={sectionTitle}>회의 출석</h2>
        <div className="flex flex-wrap items-center gap-3">
          <WeekNav path="/attendance" week={ymd(week)} thisWeek={ymd(getWeekStart(new Date()))} />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">{formatWeekLabel(week)}</h3>
        {members.length === 0 ? (
          <EmptyState message="승인된 부원이 없습니다" />
        ) : (
          <AttendanceTable
            key={ymd(week)}
            week={ymd(week)}
            rows={members.map((m) => ({ userId: m.id, name: m.name, status: thisWeek.get(m.id)?.status ?? null, reason: thisWeek.get(m.id)?.reason ?? null, totals: totals[m.id] }))}
          />
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className={sectionTitle}>투표 · 과제 참여</h2>
          <TaskForm today={today} />
        </div>
        {missedMembers.length > 0 && (
          <div className="rounded-md border border-red-200 bg-red-50/50 p-4">
            <p className="mb-2 text-xs font-semibold text-red-700">마감이 지났는데 참여하지 않은 사람</p>
            <ul className="space-y-1.5">
              {missedMembers.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center gap-1.5 text-sm">
                  <span className="mr-1 w-16 shrink-0 font-medium text-slate-900">{m.name}</span>
                  {missed[m.id].map((t) => (
                    <Badge key={t.id} tone="red" title={`마감 ${t.dueDate}`}>
                      {t.title}
                    </Badge>
                  ))}
                </li>
              ))}
            </ul>
          </div>
        )}
        {tasks.length === 0 ? (
          <EmptyState message="아직 투표 · 과제가 없습니다. 카톡에 투표나 기한 있는 요청을 올렸을 때 추가하세요" />
        ) : (
          <div className="space-y-3">
            {tasks.map((t) => (
              <TaskCard key={t.id} task={t} today={today} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
