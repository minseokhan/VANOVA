"use server";

import { revalidatePath } from "next/cache";
import type { PlanDocKind } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { validateAccount, validatePasswordChange } from "@/lib/auth/validation";
import { validateProfile } from "@/lib/profile/validation";
import { validatePlanLink } from "@/lib/plan-docs/validation";

export type FormState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string> };

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "");
}

function revalidate() {
  revalidatePath("/settings");
  revalidatePath("/", "layout"); // 사이드바 이름
}

export async function updateAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await requireUser();
  const input = {
    username: field(formData, "username").trim(),
    name: field(formData, "name").trim(),
    discordId: field(formData, "discordId").trim(),
  };
  const result = validateAccount(input);
  if (!result.ok) return { fieldErrors: result.errors };
  const taken = await db.user.findUnique({ where: { username: input.username }, select: { id: true } });
  if (taken && taken.id !== me.id) return { fieldErrors: { username: "이미 사용 중인 아이디입니다" } };
  await db.user.update({ where: { id: me.id }, data: { ...input, discordId: input.discordId || null } });
  revalidate();
  return { ok: true };
}

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await requireUser();
  const input = {
    current: field(formData, "current"),
    next: field(formData, "next"),
    confirm: field(formData, "confirm"),
  };
  const result = validatePasswordChange(input);
  if (!result.ok) return { fieldErrors: result.errors };
  const user = await db.user.findUnique({ where: { id: me.id }, select: { passwordHash: true } });
  if (!user || !(await verifyPassword(input.current, user.passwordHash))) {
    return { fieldErrors: { current: "현재 비밀번호가 올바르지 않습니다" } };
  }
  await db.user.update({ where: { id: me.id }, data: { passwordHash: await hashPassword(input.next) } });
  return { ok: true };
}

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await requireUser();
  const result = validateProfile({
    level: field(formData, "level"),
    preferredPosition: field(formData, "preferredPosition"),
    tools: field(formData, "tools"),
    skills: field(formData, "skills"),
    interests: field(formData, "interests"),
    bio: field(formData, "bio"),
  });
  if (!result.ok) return { fieldErrors: result.errors };
  await db.user.update({ where: { id: me.id }, data: result.value });
  revalidate();
  return { ok: true };
}

export async function addProfileLink(input: { kind: PlanDocKind; title: string; url: string }): Promise<{ error?: string }> {
  const me = await requireUser();
  const result = validatePlanLink(input.title, input.url);
  if (!result.ok) return { error: result.errors.title ?? result.errors.url };
  await db.profileLink.create({
    data: { userId: me.id, kind: input.kind, title: input.title.trim(), url: input.url.trim() },
  });
  revalidate();
  return {};
}

export async function deleteProfileLink(id: string): Promise<{ error?: string }> {
  const me = await requireUser();
  // 본인 것만 삭제 — userId 조건을 where에 둔다
  const { count } = await db.profileLink.deleteMany({ where: { id, userId: me.id } });
  if (count === 0) return { error: "삭제할 항목을 찾을 수 없습니다" };
  revalidate();
  return {};
}
