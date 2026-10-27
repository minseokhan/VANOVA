import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { buildWeeklyReminder } from "@/lib/discord/run";
import { buildSections } from "@/lib/reports/sections";
import { parseWeekParam } from "@/lib/reports/weekly";
import { formatDateTime } from "@/lib/utils/date";
import { formatWeekLabel, getWeekStart } from "@/lib/utils/week";
import { ReminderButton } from "@/components/reports/ReminderButton";
import { ReportCard } from "@/components/reports/ReportCard";
import { ReportNoteForm } from "@/components/reports/ReportNoteForm";
import { ReportToolbar } from "@/components/reports/ReportToolbar";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";

const ymd = (d: Date) => d.toISOString().slice(0, 10);

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof Error && e.message === "FORBIDDEN") redirect("/");
    throw e; // requireUser의 NEXT_REDIRECT 등은 그대로 전파
  }
  const week = parseWeekParam((await searchParams).week);

  const [projects, updates, note, reminder] = await Promise.all([
    db.project.findMany({
      orderBy: { code: "asc" },
      select: { id: true, code: true, title: true, status: true, featured: true },
    }),
    db.weeklyUpdate.findMany({
      where: { weekStart: week },
      select: {
        projectId: true,
        didThisWeek: true,
        planNextWeek: true,
        issues: true,
        createdAt: true,
        updatedAt: true,
        author: { select: { name: true } },
      },
    }),
    db.reportNote.findUnique({ where: { weekStart: week }, select: { content: true, updatedAt: true, author: { select: { name: true } } } }),
    buildWeeklyReminder(week),
  ]);

  const byProject = new Map(updates.map((u) => [u.projectId, u]));
  const sections = buildSections(projects, new Set(byProject.keys()));

  return (
    <>
      <PageHeader title="주간 보고" />
      <ReportToolbar week={ymd(week)} thisWeek={ymd(getWeekStart(new Date()))} />

      <h2 className="mb-4 text-lg font-semibold text-slate-900">{formatWeekLabel(week)}</h2>

      <ReportNoteForm
        week={ymd(week)}
        initial={note?.content ?? ""}
        meta={note ? `${note.author.name} · ${formatDateTime(note.updatedAt)}` : null}
      />
      <ReminderButton week={ymd(week)} teams={reminder.teams} messages={reminder.messages} />

      <div className="space-y-8">
        {sections.map((s) => (
          <section key={s.key}>
            <div className="mb-3 flex items-baseline gap-2 border-b border-slate-200 pb-2">
              <h3 className="text-sm font-semibold text-slate-900">{s.label}</h3>
              <span className="text-xs text-slate-500">
                {s.key === "UNASSIGNED" ? `${s.total}개` : `제출 ${s.submitted} / ${s.total}`}
              </span>
            </div>
            {s.rows.length === 0 ? (
              <EmptyState message="해당 프로젝트가 없습니다" />
            ) : (
              <ul className="space-y-2">
                {s.rows.map(({ project, submitted }) => (
                  <ReportCard
                    key={project.id}
                    project={project}
                    update={
                      submitted
                        ? { ...byProject.get(project.id)!, authorName: byProject.get(project.id)!.author.name }
                        : null
                    }
                    showMissingBadge={s.key !== "UNASSIGNED"}
                  />
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
