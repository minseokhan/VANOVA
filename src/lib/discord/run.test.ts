import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { findMany, updateMany, sendWebhook, projectFindMany } = vi.hoisted(() => ({
  findMany: vi.fn(),
  updateMany: vi.fn(),
  sendWebhook: vi.fn(),
  projectFindMany: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ db: { question: { findMany, updateMany }, project: { findMany: projectFindMany } } }));
vi.mock("./webhook", () => ({ sendWebhook }));

import { runDigest, runWeeklyReminder } from "./run";

const now = new Date("2026-09-15T09:00:00Z");
const rows = [
  {
    id: "q1", content: "질문", createdAt: now, projectId: "p1",
    author: { name: "홍길동" }, project: { code: "2-1", title: "T" },
  },
];

beforeEach(() => {
  findMany.mockReset().mockResolvedValue(rows);
  updateMany.mockReset().mockResolvedValue({ count: 1 });
  sendWebhook.mockReset().mockResolvedValue(undefined);
  vi.stubEnv("DISCORD_WEBHOOK_URL", "https://discord.com/api/webhooks/x");
  vi.stubEnv("DISCORD_PLANNER_ROLE_ID", "R1");
  vi.stubEnv("APP_BASE_URL", "https://van.example");
});
afterEach(() => vi.unstubAllEnvs());

describe("runDigest", () => {
  it("웹훅 URL 없으면 skipped, DB 접근 없음", async () => {
    vi.stubEnv("DISCORD_WEBHOOK_URL", "");
    expect(await runDigest(now)).toEqual({ sent: 0, skipped: "DISCORD_WEBHOOK_URL 미설정" });
    expect(findMany).not.toHaveBeenCalled();
  });

  it("미발송 질문이 없으면 sent 0, 전송 없음", async () => {
    findMany.mockResolvedValue([]);
    expect(await runDigest(now)).toEqual({ sent: 0 });
    expect(sendWebhook).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("미발송 공개 질문만 조회 → 전송 → 성공 후 sentToDiscordAt 기록", async () => {
    expect(await runDigest(now)).toEqual({ sent: 1 });
    expect(findMany.mock.calls[0][0].where).toEqual({ sentToDiscordAt: null, isPrivate: false });
    const [url, messages, roleId] = sendWebhook.mock.calls[0];
    expect(url).toBe("https://discord.com/api/webhooks/x");
    expect(messages[0]).toContain("<@&R1>");
    expect(messages[0]).toContain("https://van.example/questions?project=p1");
    expect(roleId).toBe("R1");
    expect(updateMany).toHaveBeenCalledWith({ where: { id: { in: ["q1"] } }, data: { sentToDiscordAt: now } });
  });

  it("전송 실패 시 throw, sentToDiscordAt 미기록", async () => {
    sendWebhook.mockRejectedValue(new Error("webhook 500"));
    await expect(runDigest(now)).rejects.toThrow("webhook 500");
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("APP_BASE_URL 없으면 VERCEL_PROJECT_PRODUCTION_URL 사용", async () => {
    vi.stubEnv("APP_BASE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "van.vercel.app");
    await runDigest(now);
    expect(sendWebhook.mock.calls[0][1][0]).toContain("https://van.vercel.app/questions?project=p1");
  });
});

describe("runWeeklyReminder", () => {
  const week = new Date("2026-09-14T00:00:00Z");

  beforeEach(() => {
    projectFindMany.mockReset().mockResolvedValue([
      {
        id: "p1", code: "1-1", title: "카드뉴스", featured: false, weeklyUpdates: [],
        members: [{ user: { name: "홍길동" } }, { user: { name: "한민석" } }],
      },
    ]);
  });

  it("웹훅 URL 없으면 skipped, DB 접근 없음", async () => {
    vi.stubEnv("DISCORD_WEBHOOK_URL", "");
    expect(await runWeeklyReminder(week)).toEqual({ sent: 0, skipped: "DISCORD_WEBHOOK_URL 미설정" });
    expect(projectFindMany).not.toHaveBeenCalled();
  });

  it("진행 중 프로젝트를 그 주 보고와 함께 조회한다", async () => {
    await runWeeklyReminder(week);
    const arg = projectFindMany.mock.calls[0][0];
    expect(arg.where).toEqual({ status: "IN_PROGRESS" });
    expect(arg.select.weeklyUpdates).toEqual({ where: { weekStart: week }, select: { id: true }, take: 1 });
  });

  it("그 주 보고를 이미 낸 프로젝트는 독촉하지 않는다", async () => {
    projectFindMany.mockResolvedValue([
      { id: "p1", code: "1-1", title: "A", featured: false, weeklyUpdates: [{ id: "w" }], members: [{ user: { name: "홍길동" } }] },
    ]);
    expect(await runWeeklyReminder(week)).toEqual({ sent: 0 });
  });

  it("주요 프로젝트가 있으면 주요 프로젝트만 독촉한다", async () => {
    projectFindMany.mockResolvedValue([
      { id: "p1", code: "1-1", title: "일반", featured: false, weeklyUpdates: [], members: [{ user: { name: "홍길동" } }] },
      { id: "p2", code: "2-4", title: "주요", featured: true, weeklyUpdates: [], members: [{ user: { name: "박" } }] },
    ]);
    expect(await runWeeklyReminder(week)).toEqual({ sent: 1 });
    const text = sendWebhook.mock.calls[0][1].join("\n");
    expect(text).toContain("[2-4] 주요");
    expect(text).not.toContain("[1-1] 일반");
  });

  it("주요 프로젝트가 모두 제출했으면 일반 프로젝트로 넘어가지 않고 보내지 않는다", async () => {
    projectFindMany.mockResolvedValue([
      { id: "p1", code: "1-1", title: "일반", featured: false, weeklyUpdates: [], members: [{ user: { name: "홍길동" } }] },
      { id: "p2", code: "2-4", title: "주요", featured: true, weeklyUpdates: [{ id: "w" }], members: [{ user: { name: "박" } }] },
    ]);
    expect(await runWeeklyReminder(week)).toEqual({ sent: 0 });
  });

  it("미제출 팀을 @이름으로 부르는 메시지를 보낸다", async () => {
    expect(await runWeeklyReminder(week)).toEqual({ sent: 1 });
    const [url, messages] = sendWebhook.mock.calls[0];
    expect(url).toBe("https://discord.com/api/webhooks/x");
    expect(messages[0]).toContain("@홍길동 @한민석 님");
    expect(messages[0]).toContain("[1-1] 카드뉴스");
    expect(messages[0]).toContain("https://van.example/projects/p1");
  });

  it("미제출이 없으면 전송하지 않는다", async () => {
    projectFindMany.mockResolvedValue([]);
    expect(await runWeeklyReminder(week)).toEqual({ sent: 0 });
    expect(sendWebhook).not.toHaveBeenCalled();
  });

  it("전송 실패는 그대로 throw", async () => {
    sendWebhook.mockRejectedValue(new Error("webhook 500"));
    await expect(runWeeklyReminder(week)).rejects.toThrow("webhook 500");
  });
});
