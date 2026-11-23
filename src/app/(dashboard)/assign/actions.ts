"use server";

import { Position, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { deriveStatusAfterAssign } from "@/lib/projects/status";

const NOT_FOUND = { error: "프로젝트를 찾을 수 없습니다" };

function revalidate(projectId: string) {
  revalidatePath("/assign");
  revalidatePath("/");
  revalidatePath(`/projects/${projectId}`);
}

/** 멤버 수를 다시 세어 status 전이. 첫 IN_PROGRESS 진입 시 startedAt 설정 */
async function syncStatus(tx: Prisma.TransactionClient, projectId: string) {
  const p = await tx.project.findUniqueOrThrow({
    where: { id: projectId },
    select: { status: true, startedAt: true, _count: { select: { members: true } } },
  });
  const next = deriveStatusAfterAssign(p.status, p._count.members);
  if (next === p.status) return;
  await tx.project.update({
    where: { id: projectId },
    data: { status: next, ...(next === "IN_PROGRESS" && !p.startedAt ? { startedAt: new Date() } : {}) },
  });
}

async function projectExists(projectId: string) {
  return (await db.project.count({ where: { id: projectId } })) > 0;
}

export async function assignMember(projectId: string, userId: string, position: Position = "ETC"): Promise<{ error?: string }> {
  await requireAdmin();
  if (!(position in Position)) return { error: "잘못된 포지션입니다" };
  const [user, exists] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { approved: true } }),
    projectExists(projectId),
  ]);
  if (!exists) return NOT_FOUND;
  if (!user?.approved) return { error: "승인되지 않은 사용자는 배치할 수 없습니다" };
  await db.$transaction(async (tx) => {
    await tx.projectMember.upsert({
      where: { projectId_userId: { projectId, userId } },
      create: { projectId, userId, position },
      update: {}, // 이미 배치된 멤버는 포지션 유지
    });
    await syncStatus(tx, projectId);
  });
  revalidate(projectId);
  return {};
}

export async function unassignMember(projectId: string, userId: string): Promise<{ error?: string }> {
  await requireAdmin();
  if (!(await projectExists(projectId))) return NOT_FOUND;
  await db.$transaction(async (tx) => {
    await tx.projectMember.deleteMany({ where: { projectId, userId } });
    await syncStatus(tx, projectId);
  });
  revalidate(projectId);
  return {};
}

/**
 * 프로젝트당 팀장 한 명. 지정하면 기존 팀장을 내리고 대상을 올리며, 해제는 대상 한 명만 내린다.
 * (해제에서 프로젝트 전체를 내리면, 보드가 낡은 사이 다른 운영진이 지정한 팀장까지 같이 강등된다)
 * 두 운영진이 동시에 지정하면 "기존 팀장 조회 → 내림"이 서로를 건너뛰어 팀장이 둘 남으므로 직렬화한다.
 */
export async function setLead(projectId: string, userId: string, isLead: boolean): Promise<{ error?: string }> {
  await requireAdmin();
  let count: number;
  try {
    ({ count } = await db.$transaction(
      async (tx) => {
        if (!isLead) return tx.projectMember.updateMany({ where: { projectId, userId }, data: { isLead: false } });
        await tx.projectMember.updateMany({ where: { projectId, isLead: true }, data: { isLead: false } });
        return tx.projectMember.updateMany({ where: { projectId, userId }, data: { isLead: true } });
      },
      { isolationLevel: "Serializable" },
    ));
  } catch (e) {
    // P2034: 직렬화 충돌 — 다른 운영진이 같은 프로젝트의 팀장을 동시에 바꿨다
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034") {
      return { error: "다른 운영진이 방금 팀장을 바꿨습니다. 새로고침 후 다시 시도해 주세요" };
    }
    throw e;
  }
  if (count === 0) return { error: "배치되지 않은 멤버입니다" };
  revalidate(projectId);
  return {};
}
