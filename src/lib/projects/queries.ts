import type { Position, ProjectStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { calcProgress } from "./progress";

export type ProjectCardData = {
  id: string;
  code: string;
  title: string;
  summary: string;
  category: string;
  priority: string;
  status: ProjectStatus;
  featured: boolean;
  dueDate: Date | null;
  startedAt: Date | null;
  progress: number;
  members: { id: string; name: string; position: Position }[];
  lastReportAt: Date | null;
};

export async function listProjectsForBoard(): Promise<ProjectCardData[]> {
  const rows = await db.project.findMany({
    select: {
      id: true, code: true, title: true, summary: true, category: true, priority: true, status: true, featured: true, dueDate: true, startedAt: true,
      members: { select: { position: true, user: { select: { id: true, name: true } } } },
      features: { select: { done: true } },
      weeklyUpdates: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
    },
  });
  return rows.map(({ members, features, weeklyUpdates, ...p }) => ({
    ...p,
    progress: calcProgress(features),
    members: members.map((m) => ({ id: m.user.id, name: m.user.name, position: m.position })),
    lastReportAt: weeklyUpdates[0]?.createdAt ?? null,
  }));
}
