import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Sidebar } from "@/components/layout/Sidebar";

/** 부원 사이드바 "공지" 숫자 — 마지막으로 공지 페이지를 연 뒤 올라온 공지 수 */
async function unreadNoticeCount(userId: string) {
  const me = await db.user.findUnique({ where: { id: userId }, select: { noticesSeenAt: true } });
  return db.notice.count({ where: me?.noticesSeenAt ? { createdAt: { gt: me.noticesSeenAt } } : {} });
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [pendingCount, inquiryCount] =
    user.role === "ADMIN"
      ? await Promise.all([db.user.count({ where: { approved: false } }), db.inquiry.count({ where: { answer: null } })])
      : [0, 0];
  const noticeCount = user.role === "ADMIN" ? 0 : await unreadNoticeCount(user.id);
  return (
    <div className="min-h-screen lg:flex">
      <div className="no-print hidden lg:sticky lg:top-0 lg:block lg:h-screen">
        <Sidebar user={user} pendingCount={pendingCount} inquiryCount={inquiryCount} noticeCount={noticeCount} />
      </div>
      <MobileHeader user={user} pendingCount={pendingCount} inquiryCount={inquiryCount} noticeCount={noticeCount} />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-6 pt-12 pb-10 animate-[fade-in_200ms_ease-out] print:max-w-none print:p-0">{children}</div>
      </main>
    </div>
  );
}
