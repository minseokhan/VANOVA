"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { validateCheckEvent } from "@/lib/attendance/rules";
import type { FormState } from "@/app/(dashboard)/projects/[id]/actions";

/** 기록을 만들 때 승인된 부원 전원을 대상으로 넣는다. 나중에 가입한 사람은 지난 기록에 불참으로 잡히지 않는다 */
export async function createCheckEvent(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const result = validateCheckEvent({
    kind: String(fd.get("kind") ?? ""),
    title: String(fd.get("title") ?? ""),
    date: String(fd.get("date") ?? ""),
  });
  if (!result.ok) return { fieldErrors: result.errors };
  const members = await db.user.findMany({ where: { role: "MEMBER", approved: true }, select: { id: true } });
  await db.checkEvent.create({
    data: { ...result.value, entries: { create: members.map((m) => ({ userId: m.id })) } },
  });
  revalidatePath("/attendance");
  return { ok: true };
}

export async function setCheckEntry(eventId: string, userId: string, done: boolean): Promise<{ error?: string }> {
  await requireAdmin();
  const { count } = await db.checkEntry.updateMany({ where: { eventId, userId }, data: { done } });
  if (count === 0) return { error: "기록을 찾을 수 없습니다" };
  revalidatePath("/attendance");
  return {};
}

export async function deleteCheckEvent(id: string): Promise<{ error?: string }> {
  await requireAdmin();
  const { count } = await db.checkEvent.deleteMany({ where: { id } });
  if (count === 0) return { error: "기록을 찾을 수 없습니다" };
  revalidatePath("/attendance");
  return {};
}
