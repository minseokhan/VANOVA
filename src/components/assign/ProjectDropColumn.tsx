"use client";

import { useDroppable } from "@dnd-kit/core";
import type { Position, ProjectStatus } from "@prisma/client";
import { Crown, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { POSITION_LABEL, STATUS_LABEL, STATUS_TONE } from "@/lib/projects/labels";
import { cn } from "@/lib/utils/cn";

export type BoardProject = {
  id: string;
  code: string;
  title: string;
  status: ProjectStatus;
  featured: boolean;
  members: { userId: string; name: string; position: Position; isLead: boolean }[];
};

export function ProjectDropColumn({
  project,
  error,
  onRemove,
  onPosition,
  onLead,
}: {
  project: BoardProject;
  error?: string;
  onRemove: (userId: string) => void;
  onPosition: (userId: string, position: Position) => void;
  onLead: (userId: string, isLead: boolean) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: project.id });
  const members = [...project.members].sort((a, b) => Number(b.isLead) - Number(a.isLead));
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-md border border-slate-200 bg-white px-4 pt-4 pb-3 transition-colors",
        isOver && "ring-2 ring-navy-500 bg-navy-50",
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-slate-500">{project.code}</p>
          <h3 className="truncate text-sm font-semibold text-slate-900">{project.title}</h3>
        </div>
        <Badge tone={STATUS_TONE[project.status]}>{STATUS_LABEL[project.status]}</Badge>
      </div>
      <p className="mb-1.5 text-xs text-slate-500 tabular-nums">멤버 {members.length}명</p>
      {/* 인원이 늘어도 카드 높이는 같게 — 한 줄에 2명씩, 목록 칸은 2줄 높이로 고정하고 넘치면 안에서 스크롤 */}
      {members.length === 0 ? (
        <p className="flex h-[4.5rem] items-center justify-center rounded-md border border-dashed border-slate-200 text-xs text-slate-400">
          여기로 드래그해서 배치
        </p>
      ) : (
        <ul className="grid h-[4.5rem] auto-rows-min grid-cols-2 gap-x-4 gap-y-1.5 overflow-y-auto pr-1">
          {members.map((m) => (
            <li key={m.userId} className="group flex min-w-0 items-center gap-2">
              <button
                type="button"
                aria-label={`${m.name} 팀장`}
                aria-pressed={m.isLead}
                onClick={() => onLead(m.userId, !m.isLead)}
                className="relative shrink-0 cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-500"
              >
                <Avatar
                  name={m.name}
                  title={m.isLead ? `${m.name} 팀장 해제` : `${m.name} 팀장으로 지정`}
                  className={cn("transition-shadow", m.isLead && "ring-2 ring-navy-500 ring-offset-1")}
                />
                {/* 팀장이 없는 프로젝트에도 호버하면 흐린 왕관이 떠서 "누르면 팀장"이 읽힌다 */}
                <Crown
                  size={12}
                  strokeWidth={2.25}
                  aria-hidden
                  className={cn(
                    "absolute -right-1 -top-1 rounded-full bg-white transition-opacity",
                    m.isLead ? "text-navy-700" : "text-slate-300 opacity-0 group-hover:opacity-100",
                  )}
                />
              </button>
              <span className={cn("min-w-0 flex-1 truncate text-sm", m.isLead ? "font-semibold text-navy-900" : "text-slate-700")}>
                {m.name}
                {m.isLead && <span className="sr-only"> (팀장)</span>}
              </span>
              <Select
                aria-label={`${m.name} 포지션`}
                variant="underline"
                value={m.position}
                className="w-20 shrink-0"
                onChange={(e) => onPosition(m.userId, e.target.value as Position)}
              >
                {Object.entries(POSITION_LABEL).map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </Select>
              <button
                type="button"
                aria-label={`${m.name} 배치 해제`}
                onClick={() => onRemove(m.userId)}
                className="text-slate-400 transition-colors hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-500"
              >
                <X size={16} strokeWidth={1.75} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </div>
  );
}
