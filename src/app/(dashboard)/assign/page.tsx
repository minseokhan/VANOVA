import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { sortProjects } from "@/lib/projects/filter";
import { AssignBoard } from "@/components/assign/AssignBoard";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function AssignPage() {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof Error && e.message === "FORBIDDEN") redirect("/");
    throw e; // requireUser의 NEXT_REDIRECT 등은 그대로 전파
  }
  const [users, projects] = await Promise.all([
    db.user.findMany({
      where: { approved: true },
      orderBy: { name: "asc" },
      // 보드에 안 보이는 완료 프로젝트도 포함한다 — 부하를 볼 때 기준은 총 참여 수다
      select: {
        id: true,
        name: true,
        memberships: { select: { project: { select: { code: true } } } },
      },
    }),
    db.project.findMany({
      select: {
        id: true, code: true, title: true, status: true, priority: true, featured: true,
        members: { select: { userId: true, isLead: true, user: { select: { name: true } } } },
      },
    }),
  ]);
  return (
    <>
      <PageHeader title="배치 보드" />
      <AssignBoard
        members={users.map((u) => ({ id: u.id, name: u.name, codes: u.memberships.map((m) => m.project.code).sort() }))}
        projects={sortProjects(projects).map(({ members, ...p }) => ({
          ...p,
          members: members.map((m) => ({ userId: m.userId, name: m.user.name, isLead: m.isLead })),
        }))}
      />
    </>
  );
}
