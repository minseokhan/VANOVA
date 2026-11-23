"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { Position } from "@prisma/client";
import { useOptimistic, useState, useTransition } from "react";
import { assignMember, setLead, setPosition, unassignMember } from "@/app/(dashboard)/assign/actions";
import { Input } from "@/components/ui/Input";
import { MemberCard, MemberCardView, type BoardMember } from "./MemberCard";
import { ProjectDropColumn, type BoardProject } from "./ProjectDropColumn";

type Patch =
  | { type: "add"; projectId: string; member: BoardMember }
  | { type: "remove"; projectId: string; userId: string }
  | { type: "position"; projectId: string; userId: string; position: Position }
  | { type: "lead"; projectId: string; userId: string; isLead: boolean };

function apply(projects: BoardProject[], patch: Patch): BoardProject[] {
  return projects.map((p) => {
    if (p.id !== patch.projectId) return p;
    switch (patch.type) {
      case "add":
        if (p.members.some((m) => m.userId === patch.member.id)) return p;
        return {
          ...p,
          members: [...p.members, { userId: patch.member.id, name: patch.member.name, position: "ETC", isLead: false }],
        };
      case "remove":
        return { ...p, members: p.members.filter((m) => m.userId !== patch.userId) };
      case "position":
        return { ...p, members: p.members.map((m) => (m.userId === patch.userId ? { ...m, position: patch.position } : m)) };
      // 지정은 나머지를 전부 내리고, 해제는 대상만 내린다 (서버의 setLead 와 같은 규칙)
      case "lead":
        return {
          ...p,
          members: p.members.map((m) =>
            m.userId === patch.userId ? { ...m, isLead: patch.isLead } : patch.isLead ? { ...m, isLead: false } : m,
          ),
        };
    }
  });
}

/** 주요 프로젝트는 상태와 상관없이 맨 위, 나머지는 상태별. 완료는 접어 둔다 */
const GROUPS: { title: string; match: (p: BoardProject) => boolean; collapsed?: boolean }[] = [
  { title: "주요 프로젝트", match: (p) => p.featured },
  { title: "진행중", match: (p) => !p.featured && p.status === "IN_PROGRESS" },
  { title: "완료", match: (p) => !p.featured && p.status === "DONE", collapsed: true },
  { title: "미배정", match: (p) => !p.featured && p.status === "UNASSIGNED" },
];

export function AssignBoard({ members, projects }: { members: BoardMember[]; projects: BoardProject[] }) {
  const [optimistic, patch] = useOptimistic(projects, apply);
  const [, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [active, setActive] = useState<BoardMember | null>(null);
  const [q, setQ] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  // 낙관적 반영 → 서버 액션 → 에러면 컬럼 하단에 표시(낙관 상태는 트랜지션 종료 시 서버 값으로 롤백)
  const run = (p: Patch, action: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      patch(p);
      const res = await action();
      setErrors((e) => ({ ...e, [p.projectId]: res.error ?? "" }));
    });

  const onDragStart = (e: DragStartEvent) => setActive((e.active.data.current?.member as BoardMember) ?? null);
  const onDragEnd = (e: DragEndEvent) => {
    setActive(null);
    const member = e.active.data.current?.member as BoardMember | undefined;
    if (!e.over || !member) return;
    const projectId = String(e.over.id);
    run({ type: "add", projectId, member }, () => assignMember(projectId, member.id));
  };

  const visible = members.filter((m) => m.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActive(null)}>
      <div className="flex gap-6">
        <aside className="sticky top-0 w-64 shrink-0 self-start">
          <Input aria-label="멤버 검색" placeholder="멤버 검색" value={q} onChange={(e) => setQ(e.target.value)} className="mb-3" />
          <div className="max-h-[calc(100vh-8rem)] space-y-2 overflow-y-auto">
            {visible.length === 0 && <p className="text-xs text-slate-400">멤버가 없습니다</p>}
            {visible.map((m) => (
              <MemberCard key={m.id} member={m} />
            ))}
          </div>
        </aside>
        <div className="min-w-0 flex-1 space-y-8">
          {GROUPS.map(({ title, match, collapsed }) => {
            const list = optimistic.filter(match);
            if (list.length === 0) return null;
            const grid = (
              <div className="grid content-start items-start gap-4 xl:grid-cols-2 2xl:grid-cols-3">
                {list.map((p) => (
                  <ProjectDropColumn
                    key={p.id}
                    project={p}
                    error={errors[p.id] || undefined}
                    onRemove={(userId) => run({ type: "remove", projectId: p.id, userId }, () => unassignMember(p.id, userId))}
                    onPosition={(userId, position) =>
                      run({ type: "position", projectId: p.id, userId, position }, () => setPosition(p.id, userId, position))
                    }
                    onLead={(userId, isLead) => run({ type: "lead", projectId: p.id, userId, isLead }, () => setLead(p.id, userId, isLead))}
                  />
                ))}
              </div>
            );
            const heading = (
              <>
                {title} <span className="font-normal text-slate-500 tabular-nums">({list.length})</span>
              </>
            );
            return (
              <section key={title}>
                {collapsed ? (
                  <details>
                    <summary className="mb-3 cursor-pointer text-sm font-semibold text-slate-900">{heading}</summary>
                    {grid}
                  </details>
                ) : (
                  <>
                    <h2 className="mb-3 border-l-2 border-navy-500 pl-2 text-sm font-semibold text-slate-900">{heading}</h2>
                    {grid}
                  </>
                )}
              </section>
            );
          })}
        </div>
      </div>
      <DragOverlay dropAnimation={{ duration: 200 }}>{active && <MemberCardView member={active} />}</DragOverlay>
    </DndContext>
  );
}
