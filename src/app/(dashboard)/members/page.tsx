import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { PendingCard } from "@/components/members/MemberRow";
import { MembersTable } from "@/components/members/MembersTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function MembersPage() {
  let me;
  try {
    me = await requireAdmin();
  } catch (e) {
    if (e instanceof Error && e.message === "FORBIDDEN") redirect("/");
    throw e; // requireUser의 NEXT_REDIRECT 등은 그대로 전파
  }
  const users = await db.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true, username: true, name: true, role: true, approved: true, createdAt: true, level: true, adminLevel: true,
      memberships: { select: { project: { select: { code: true } } }, orderBy: { project: { code: "asc" } } },
    },
  });
  const pending = users.filter((u) => !u.approved);
  const members = users.filter((u) => u.approved);
  const adminCount = members.filter((u) => u.role === "ADMIN").length;

  return (
    <div className="space-y-8">
      <PageHeader title="멤버 관리" />
      {(
        [
          ["멤버", members.filter((u) => u.role !== "ADMIN"), "승인된 멤버가 없습니다"],
          ["운영진", members.filter((u) => u.role === "ADMIN"), "운영진이 없습니다"],
        ] as const
      ).map(([title, list, empty]) => (
        <section key={title}>
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            {title} ({list.length})
          </h2>
          {list.length === 0 ? (
            <EmptyState message={empty} />
          ) : (
            <MembersTable
              members={list.map(({ memberships, ...u }) => ({ ...u, projectCodes: memberships.map((m) => m.project.code) }))}
              meId={me.id}
              adminCount={adminCount}
            />
          )}
        </section>
      ))}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">승인 대기 ({pending.length})</h2>
        {pending.length === 0 ? (
          <EmptyState message="승인 대기 중인 요청이 없습니다" />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pending.map((u) => (
              <PendingCard key={u.id} user={u} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
