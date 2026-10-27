"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, LayoutGrid, Lightbulb, Megaphone, MessageSquare, NotebookText, Plus, Receipt, Settings, UserCheck, Users, type LucideIcon } from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import type { SessionUser } from "@/lib/auth/session";
import { cn } from "@/lib/utils/cn";
import { Avatar } from "@/components/ui/Avatar";

type Item = { href: string; label: string; icon: LucideIcon };

/** 부원에겐 일반 메뉴, 운영진에겐 운영 섹션 — 운영진은 여기서 작성·수정·삭제까지 한다 */
const NOTICE: Item = { href: "/notices", label: "공지", icon: Megaphone };

const MAIN: Item[] = [
  { href: "/", label: "대시보드", icon: LayoutGrid },
  { href: "/minutes", label: "주간 회의록", icon: NotebookText },
  { href: "/questions", label: "프로젝트 질문", icon: MessageSquare },
  { href: "/inquiries", label: "문의 · 건의", icon: Lightbulb },
  { href: "/expenses", label: "비용 청구", icon: Receipt },
  { href: "/settings", label: "개인 설정", icon: Settings },
];

const ADMIN: Item[] = [
  { href: "/reports", label: "주간 보고", icon: FileText },
  { href: "/assign", label: "배치 보드", icon: Users },
  { href: "/members", label: "멤버 관리", icon: UserCheck },
  { href: "/projects/new", label: "새 프로젝트", icon: Plus },
];

export function Sidebar({
  user,
  pendingCount,
  inquiryCount,
  onNavigate,
}: {
  user: SessionUser;
  pendingCount: number;
  inquiryCount: number;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isAdmin = user.role === "ADMIN";
  const counts: Record<string, number> = { "/members": pendingCount, "/inquiries": inquiryCount };
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const renderItem = ({ href, label, icon: Icon }: Item) => (
    <Link
      key={href}
      href={href}
      onClick={onNavigate}
      aria-current={isActive(href) ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors hover:bg-white/10",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
        isActive(href) ? "bg-white/10 font-medium text-white" : "text-white/80",
      )}
    >
      <Icon size={16} strokeWidth={1.75} aria-hidden />
      <span className="flex-1">{label}</span>
      {(counts[href] ?? 0) > 0 && (
        <span className="rounded bg-navy-100 px-1.5 py-0.5 text-xs font-medium tabular-nums text-navy-700">
          {counts[href]}
        </span>
      )}
    </Link>
  );

  return (
    <aside className="flex h-full w-60 flex-col bg-navy-900 text-white">
      <div className="px-5 py-5">
        <Image src="/brand/vanova-logo-dark.png" alt="VANOVA 한국대학 학회·학술 총연합체" width={160} height={40} priority />
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {(isAdmin ? MAIN : [MAIN[0], NOTICE, ...MAIN.slice(1)]).map(renderItem)}
        {isAdmin && (
          <>
            <div className="px-3 pb-1 pt-5 text-xs font-medium uppercase text-white/50">운영</div>
            {[NOTICE, ...ADMIN].map(renderItem)}
          </>
        )}
      </nav>
      <div className="flex items-center gap-3 border-t border-white/10 px-5 py-4">
        <Avatar name={user.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="text-xs text-white/60">{user.role === "ADMIN" ? "운영진" : "부원"}</p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="text-xs text-white/70 hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            로그아웃
          </button>
        </form>
      </div>
    </aside>
  );
}
