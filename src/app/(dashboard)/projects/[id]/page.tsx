import { CalendarClock, Play } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { canEditProject } from "@/lib/auth/permissions";
import { canTransitionStatus } from "@/lib/projects/features";
import { POSITION_LABEL, PRIORITY_LABEL, PRIORITY_TONE, STATUS_LABEL, STATUS_TONE } from "@/lib/projects/labels";
import { calcProgress } from "@/lib/projects/progress";
import { formatDate } from "@/lib/utils/date";
import { linkify } from "@/lib/utils/linkify";
import { FeatureChecklist } from "@/components/projects/FeatureChecklist";
import { PlanDocs } from "@/components/projects/PlanDocs";
import { ProjectInfoPanel } from "@/components/projects/ProjectInfoPanel";
import { SidePanel } from "@/components/projects/SidePanel";
import { WeeklyUpdates } from "@/components/projects/WeeklyUpdates";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonClass } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { setProjectFeatured, setProjectStatus } from "./actions";

const linkClass = "text-navy-500 hover:underline break-all";

function Paragraphs({ text }: { text: string }) {
  const paras = text.split(/\n\s*\n/).filter((p) => p.trim());
  if (paras.length === 0) return <p className="text-sm text-slate-400">설명이 없습니다</p>;
  return (
    <div className="space-y-3">
      {paras.map((p, i) => (
        <p key={i} className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
          {linkify(p).map((s, j) =>
            s.type === "link" ? (
              <a key={j} href={s.value} target="_blank" rel="noopener noreferrer" className={linkClass}>
                {s.value}
              </a>
            ) : (
              s.value
            ),
          )}
        </p>
      ))}
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const project = await db.project.findUnique({
    where: { id },
    include: {
      members: { include: { user: { select: { id: true, name: true } } } },
      features: { orderBy: { order: "asc" } },
      weeklyUpdates: { orderBy: { weekStart: "desc" }, include: { author: { select: { name: true } } } },
      planDocs: { orderBy: { createdAt: "desc" }, include: { uploadedBy: { select: { name: true } } } },
      questions: { orderBy: { createdAt: "desc" }, take: 5, include: { author: { select: { name: true } } } },
    },
  });
  if (!project) notFound();

  const canEdit = canEditProject(user, project.members.map((m) => m.userId));
  const target = project.status === "DONE" ? "IN_PROGRESS" : "DONE";
  const canTransition = canEdit && canTransitionStatus(project.status, target, project.members.length);
  const transition = async () => {
    "use server";
    await setProjectStatus(id, target);
  };
  const toggleFeatured = async () => {
    "use server";
    await setProjectFeatured(id, !project.featured);
  };

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-slate-500">{project.code}</p>
            <h1 className="text-2xl font-semibold text-slate-900">{project.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {project.featured && <Badge tone="solid">주요</Badge>}
              <Badge tone={STATUS_TONE[project.status]}>{STATUS_LABEL[project.status]}</Badge>
              <Badge tone={PRIORITY_TONE[project.priority]}>{PRIORITY_LABEL[project.priority] ?? project.priority}</Badge>
              <Badge>{project.category}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canTransition && (
              <form action={transition}>
                <Button type="submit" variant="secondary">
                  {target === "DONE" ? "완료로 표시" : "진행중으로 되돌리기"}
                </Button>
              </form>
            )}
            {user.role === "ADMIN" && (
              <form action={toggleFeatured}>
                <Button type="submit" variant="secondary">
                  {project.featured ? "주요 프로젝트 해제" : "주요 프로젝트로 지정"}
                </Button>
              </form>
            )}
            {user.role === "ADMIN" && (
              <Link href={`/projects/${id}/edit`} className={buttonClass({ variant: "secondary" })}>
                편집
              </Link>
            )}
          </div>
        </div>
        <ProgressBar value={calcProgress(project.features)} className="[&>div]:h-3 [&>div>div]:h-3" />
        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Play size={16} strokeWidth={1.75} aria-hidden />
            시작 {project.startedAt ? formatDate(project.startedAt) : "미정"}
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarClock size={16} strokeWidth={1.75} aria-hidden />
            마감 {project.dueDate ? formatDate(project.dueDate) : "미정"}
          </span>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <Section title="설명">
            <Paragraphs text={project.description} />
          </Section>
          <Section title={`기능 체크리스트 (${project.features.filter((f) => f.done).length}/${project.features.length})`}>
            <FeatureChecklist
              projectId={id}
              canEdit={canEdit}
              features={project.features.map(({ id, title, done }) => ({ id, title, done }))}
            />
          </Section>
          <Section title="주간 보고">
            <WeeklyUpdates
              projectId={id}
              canEdit={canEdit}
              updates={project.weeklyUpdates.map((w) => ({
                id: w.id,
                weekStart: w.weekStart,
                authorName: w.author.name,
                didThisWeek: w.didThisWeek,
                planNextWeek: w.planNextWeek,
                issues: w.issues,
              }))}
            />
          </Section>
          <Section
            title="질문"
            action={
              <div className="flex items-center gap-3">
                {canEdit && (
                  <Link href={`/questions?project=${id}`} className="text-sm text-navy-500 hover:underline">
                    질문하기
                  </Link>
                )}
                <Link href={`/questions?project=${id}`} className="text-sm text-navy-500 hover:underline">
                  전체 보기
                </Link>
              </div>
            }
          >
            {project.questions.length === 0 ? (
              <EmptyState message="아직 질문이 없습니다" />
            ) : (
              <ul className="space-y-3">
                {project.questions.map((q) => (
                  <li key={q.id} className="rounded-md border border-slate-200 p-4">
                    <div className="mb-1 flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span>
                        {q.author.name} · {formatDate(q.createdAt)}
                      </span>
                      <Badge tone={q.answer ? "green" : "amber"}>{q.answer ? "답변 완료" : "미답변"}</Badge>
                    </div>
                    <p className="line-clamp-2 text-sm text-slate-700">{q.content}</p>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <aside className="space-y-4">
          <SidePanel title="팀">
            {project.members.length === 0 ? (
              <p className="text-sm text-slate-400">아직 배치되지 않았습니다</p>
            ) : (
              <ul className="space-y-2">
                {[...project.members]
                  .sort((a, b) => Number(b.isLead) - Number(a.isLead))
                  .map((m) => (
                    <li key={m.userId} className="flex items-center gap-2 text-sm">
                      <Avatar name={m.user.name} />
                      <span className="text-slate-700">{m.user.name}</span>
                      {m.isLead && <Badge tone="navy">팀장</Badge>}
                      <span className="text-xs text-slate-500">{POSITION_LABEL[m.position]}</span>
                    </li>
                  ))}
              </ul>
            )}
            {user.role === "ADMIN" && (
              <Link href="/assign" className="mt-3 inline-block text-xs text-navy-500 hover:underline">
                배치 보드에서 편집
              </Link>
            )}
          </SidePanel>
          <ProjectInfoPanel
            projectId={id}
            canEdit={canEdit}
            info={{
              githubUrl: project.githubUrl,
              deployUrl: project.deployUrl,
              mainLanguage: project.mainLanguage,
              infraNote: project.infraNote,
              startedAt: project.startedAt ? formatDate(project.startedAt) : null,
            }}
          />
          <PlanDocs
            projectId={id}
            isAdmin={user.role === "ADMIN"}
            docs={project.planDocs.map((d) => ({
              id: d.id,
              kind: d.kind,
              title: d.title,
              url: d.url,
              uploaderName: d.uploadedBy.name,
              createdAt: d.createdAt,
            }))}
          />
        </aside>
      </div>
    </div>
  );
}
