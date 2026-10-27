"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import type { SessionUser } from "@/lib/auth/session";
import { Sidebar } from "./Sidebar";

export function MobileHeader({
  user,
  pendingCount,
  inquiryCount,
}: {
  user: SessionUser;
  pendingCount: number;
  inquiryCount: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <header className="no-print flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <span className="text-base font-semibold text-slate-900">VAN AI 혁신부</span>
        <button
          type="button"
          aria-label="메뉴 열기"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="rounded-md p-1 text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-500"
        >
          <Menu size={20} strokeWidth={1.75} />
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" aria-label="메뉴 닫기" onClick={() => setOpen(false)} className="absolute inset-0 bg-slate-900/50" />
          <div className="absolute inset-y-0 left-0">
            <Sidebar user={user} pendingCount={pendingCount} inquiryCount={inquiryCount} onNavigate={() => setOpen(false)} />
          </div>
          <button
            type="button"
            aria-label="메뉴 닫기"
            onClick={() => setOpen(false)}
            className="absolute left-60 top-3 ml-3 rounded-md bg-white p-1 text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-500"
          >
            <X size={20} strokeWidth={1.75} />
          </button>
        </div>
      )}
    </>
  );
}
