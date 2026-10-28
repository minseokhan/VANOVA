import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { NoticeCard } from "@/components/notices/NoticeCard";
import { NoticeForm } from "@/components/notices/NoticeForm";
import { MarkNoticesSeen } from "@/components/notices/MarkNoticesSeen";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function NoticesPage() {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";
  const notices = await db.notice.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, content: true, createdAt: true, updatedAt: true, author: { select: { name: true } } },
  });

  return (
    <>
      <PageHeader title="공지" />
      {!isAdmin && <MarkNoticesSeen />}
      <div className="space-y-6">
        {isAdmin && <NoticeForm />}
        {notices.length === 0 ? (
          <EmptyState message="등록된 공지가 없습니다" />
        ) : (
          <ul className="space-y-3">
            {notices.map((n, i) => (
              <NoticeCard
                key={n.id}
                isAdmin={isAdmin}
                // 가장 최근 공지는 펼친 채로 — 들어오자마자 읽히는 게 공지의 목적
                defaultOpen={i === 0}
                notice={{
                  id: n.id,
                  title: n.title,
                  content: n.content,
                  authorName: n.author.name,
                  createdAt: n.createdAt,
                  updatedAt: n.updatedAt,
                }}
              />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
