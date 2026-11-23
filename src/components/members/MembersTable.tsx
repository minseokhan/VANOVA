"use client";

import { useState } from "react";
import { MemberPanel } from "@/components/members/MemberPanel";
import { MemberRow, type Member } from "@/components/members/MemberRow";

const th = "px-3 py-2 text-left text-xs font-medium text-slate-600";

export function MembersTable({ members, meId, adminCount }: { members: Member[]; meId: string; adminCount: number }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <>
      <div className="overflow-x-auto rounded-md border border-slate-200">
        {/* 고정 열 너비 — 멤버·운영진 두 표의 열이 같은 자리에 오고, 오른쪽에 빈 칸이 몰리지 않는다 */}
        <table className="w-full min-w-[720px] table-fixed">
          <colgroup>
            <col className="w-[22%]" />
            <col className="w-[18%]" />
            <col className="w-[11%]" />
            <col className="w-[11%]" />
            <col />
            <col className="w-32" />
          </colgroup>
          <thead className="bg-navy-50">
            <tr>
              <th className={`${th} pl-5`}>이름</th>
              <th className={th}>아이디</th>
              <th className={th}>역할</th>
              <th className={th}>수준</th>
              <th className={th}>참여 프로젝트</th>
              <th className={`${th} pr-5`}>
                <span className="sr-only">상세</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {members.map((u) => (
              <MemberRow key={u.id} user={u} isSelf={u.id === meId} onOpen={() => setOpenId(u.id)} />
            ))}
          </tbody>
        </table>
      </div>
      {openId && (
        <MemberPanel userId={openId} isSelf={openId === meId} adminCount={adminCount} onClose={() => setOpenId(null)} />
      )}
    </>
  );
}
