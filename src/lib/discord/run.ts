import { db } from "@/lib/db";
import { reportTargets } from "@/lib/reports/sections";
import { formatWeekLabel } from "@/lib/utils/week";
import { buildDigestMessages } from "./digest";
import { buildReminderMessages } from "./remind";
import { sendWebhook } from "./webhook";

/** 미발송 질문을 디스코드로 보내고, 전송이 성공한 뒤에만 sentToDiscordAt을 기록한다. 실패 시 throw(다음 실행에서 재시도) */
export async function runDigest(now: Date = new Date()): Promise<{ sent: number; skipped?: string }> {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return { sent: 0, skipped: "DISCORD_WEBHOOK_URL 미설정" };

  const qs = await db.question.findMany({
    // 비공개 질문은 부원도 보는 채널로 나가면 안 되므로 제외한다
    where: { sentToDiscordAt: null, isPrivate: false },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { name: true } }, project: { select: { code: true, title: true } } },
  });
  if (qs.length === 0) return { sent: 0 };

  const baseUrl = process.env.APP_BASE_URL || `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  const roleId = process.env.DISCORD_PLANNER_ROLE_ID || undefined;
  const messages = buildDigestMessages(
    qs.map((q) => ({
      id: q.id,
      content: q.content,
      createdAt: q.createdAt,
      authorName: q.author.name,
      projectCode: q.project.code,
      projectTitle: q.project.title,
      projectId: q.projectId,
    })),
    { roleId, baseUrl, date: now },
  );
  await sendWebhook(url, messages, roleId);
  await db.question.updateMany({ where: { id: { in: qs.map((q) => q.id) } }, data: { sentToDiscordAt: now } });
  return { sent: qs.length };
}

const DEADLINE = "일요일 23:59";

/**
 * 그 주 주간보고를 내지 않은 보고 대상 프로젝트(reportTargets)의 독촉 메시지.
 * 미리보기와 실제 전송이 같은 문구가 되도록 양쪽 모두 이 함수를 쓴다.
 */
export async function buildWeeklyReminder(weekStart: Date): Promise<{ messages: string[]; teams: number }> {
  const inProgress = await db.project.findMany({
    where: { status: "IN_PROGRESS" },
    orderBy: { code: "asc" },
    select: {
      id: true, code: true, title: true, featured: true,
      weeklyUpdates: { where: { weekStart }, select: { id: true }, take: 1 },
      members: { select: { user: { select: { name: true } } } },
    },
  });
  // 주요 여부는 제출 전 전체 진행 중 목록에서 판단해야, 주요가 다 제출했을 때 일반 프로젝트로 넘어가지 않는다
  const projects = reportTargets(inProgress).filter((p) => p.weeklyUpdates.length === 0);

  const baseUrl = process.env.APP_BASE_URL || `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  const messages = buildReminderMessages(
    projects.map((p) => ({
      projectId: p.id,
      projectCode: p.code,
      projectTitle: p.title,
      memberNames: p.members.map((m) => m.user.name),
    })),
    { weekLabel: formatWeekLabel(weekStart), baseUrl, deadline: DEADLINE },
  );
  return { messages, teams: projects.filter((p) => p.members.length > 0).length };
}

export async function runWeeklyReminder(weekStart: Date): Promise<{ sent: number; skipped?: string }> {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return { sent: 0, skipped: "DISCORD_WEBHOOK_URL 미설정" };

  const { messages, teams } = await buildWeeklyReminder(weekStart);
  if (messages.length === 0) return { sent: 0 };

  await sendWebhook(url, messages);
  return { sent: teams };
}
