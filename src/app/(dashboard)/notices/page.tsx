import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { NoticeCard } from "@/components/notices/NoticeCard";
import { NoticeForm } from "@/components/notices/NoticeForm";
import { MarkNoticesSeen } from "@/components/notices/MarkNoticesSeen";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";

type Row = { id: string; title: string; content: string; createdAt: Date; updatedAt: Date; author: { name: string } };

function toItem(n: Row) {
  return { id: n.id, title: n.title, content: n.content, authorName: n.author.name, createdAt: n.createdAt, updatedAt: n.updatedAt };
}

export default async function NoticesPage() {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";
  const notices = await db.notice.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, content: true, createdAt: true, updatedAt: true, author: { select: { name: true } } },
  });

  const [latest, ...older] = notices;

  return (
    <>
      <PageHeader title="공지" />
      {!isAdmin && <MarkNoticesSeen />}
      <div className="space-y-6">
        {isAdmin && <NoticeForm />}
        {latest ? (
          <NoticeCard featured isAdmin={isAdmin} notice={toItem(latest)} />
        ) : (
          <EmptyState message="등록된 공지가 없습니다" />
        )}
        {older.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-slate-900">이전 공지</h2>
            <ul className="divide-y divide-slate-200 border-y border-slate-200">
              {older.map((n) => (
                <NoticeCard key={n.id} isAdmin={isAdmin} notice={toItem(n)} />
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
