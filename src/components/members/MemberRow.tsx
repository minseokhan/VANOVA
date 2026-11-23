"use client";

import { useState, useTransition } from "react";
import { approveUser, rejectUser } from "@/app/(dashboard)/members/actions";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LEVEL_LABEL } from "@/lib/profile/validation";
import { formatDate } from "@/lib/utils/date";

export type Member = {
  id: string;
  username: string;
  name: string;
  role: "ADMIN" | "MEMBER";
  /** 본인이 쓴 자기평가 */
  level: keyof typeof LEVEL_LABEL | null;
  /** 운영진이 판단해 지정한 수준. 있으면 이쪽이 표에 보인다 */
  adminLevel: keyof typeof LEVEL_LABEL | null;
  createdAt: Date;
  /** 배치된 프로젝트의 과제 번호 (예: ["4-4", "6-2"]) */
  projectCodes: string[];
};

function useAction() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      const res = await fn();
      setError(res.error ?? null);
    });
  return { error, pending, run };
}

const errorText = "mt-1 text-xs text-red-700";

export function PendingCard({ user }: { user: Pick<Member, "id" | "username" | "name" | "createdAt"> }) {
  const { error, pending, run } = useAction();
  return (
    <li className="rounded-md border border-navy-100 bg-white p-4">
      <div className="flex items-center gap-3">
        <Avatar name={user.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
          <p className="truncate text-xs text-slate-500">
            {user.username} · 가입 {formatDate(user.createdAt)}
          </p>
        </div>
      </div>
      {error && <p className={errorText}>{error}</p>}
      <div className="mt-3 flex items-center gap-2">
        <Button size="sm" disabled={pending} onClick={() => run(() => approveUser(user.id))}>
          승인
        </Button>
        <ConfirmDialog
          label="거절"
          title="가입 요청 거절"
          message={`"${user.name}"의 가입 요청을 거절하고 삭제할까요? 되돌릴 수 없습니다.`}
          confirmLabel="거절"
          size="sm"
          onConfirm={() => run(() => rejectUser(user.id))}
        />
      </div>
    </li>
  );
}

export function MemberRow({ user, isSelf, onOpen }: { user: Member; isSelf: boolean; onOpen: () => void }) {
  const isAdmin = user.role === "ADMIN";
  return (
    <tr className="border-b border-slate-100">
      <td className="py-2 pr-3 pl-8">
        <span className="flex min-w-0 items-center gap-3 text-sm text-slate-900">
          <Avatar name={user.name} />
          <span className="truncate">{user.name}</span>
          {isSelf && <span className="text-xs text-slate-500">(나)</span>}
        </span>
      </td>
      <td className="truncate px-3 py-2 text-sm text-slate-700">{user.username}</td>
      <td className="px-3 py-2">
        <Badge tone={isAdmin ? "navy" : "neutral"}>{isAdmin ? "운영진" : "부원"}</Badge>
      </td>
      <td className="px-3 py-2 text-sm text-slate-700">
        {user.adminLevel ? (
          <Badge tone="navy">{LEVEL_LABEL[user.adminLevel]}</Badge>
        ) : user.level ? (
          LEVEL_LABEL[user.level]
        ) : (
          <span className="text-slate-400">미작성</span>
        )}
      </td>
      <td className="px-3 py-2 text-sm text-slate-700">
        <span className="tabular-nums">{user.projectCodes.length}</span>
        {user.projectCodes.length > 0 && <span className="ml-1 text-xs text-slate-500">({user.projectCodes.join(", ")})</span>}
      </td>
      <td className="py-2 pr-8 pl-3">
        <Button variant="secondary" size="sm" onClick={onOpen}>
          상세 보기
        </Button>
      </td>
    </tr>
  );
}
