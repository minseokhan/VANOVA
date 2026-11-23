"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { isAttendanceStatus, validateTask } from "@/lib/attendance/rules";
import { parseDay } from "@/lib/minutes/rules";
import { getWeekStart } from "@/lib/utils/week";
import type { FormState } from "@/app/(dashboard)/projects/[id]/actions";

/** 주간 회의 출석 상태 저장. week 는 그 주 월요일 "YYYY-MM-DD" */
export async function setAttendance(week: string, userId: string, status: string): Promise<{ error?: string }> {
  await requireAdmin();
  const day = parseDay(week);
  if (!day || !isAttendanceStatus(status)) return { error: "잘못된 요청입니다" };
  const weekStart = getWeekStart(day);
  await db.attendance.upsert({
    where: { weekStart_userId: { weekStart, userId } },
    create: { weekStart, userId, status },
    update: { status },
  });
  revalidatePath("/attendance");
  return {};
}

/** 과제를 만들 때 승인된 부원 전원을 대상으로 넣는다. 나중에 가입한 사람은 지난 과제에서 미참여로 잡히지 않는다 */
export async function createTask(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const result = validateTask({ title: String(fd.get("title") ?? ""), dueDate: String(fd.get("dueDate") ?? "") });
  if (!result.ok) return { fieldErrors: result.errors };
  const members = await db.user.findMany({ where: { role: "MEMBER", approved: true }, select: { id: true } });
  await db.task.create({ data: { ...result.value, entries: { create: members.map((m) => ({ userId: m.id })) } } });
  revalidatePath("/attendance");
  return { ok: true };
}

export async function setTaskEntry(taskId: string, userId: string, done: boolean): Promise<{ error?: string }> {
  await requireAdmin();
  const { count } = await db.taskEntry.updateMany({ where: { taskId, userId }, data: { done } });
  if (count === 0) return { error: "과제를 찾을 수 없습니다" };
  revalidatePath("/attendance");
  return {};
}

export async function deleteTask(id: string): Promise<{ error?: string }> {
  await requireAdmin();
  const { count } = await db.task.deleteMany({ where: { id } });
  if (count === 0) return { error: "과제를 찾을 수 없습니다" };
  revalidatePath("/attendance");
  return {};
}
