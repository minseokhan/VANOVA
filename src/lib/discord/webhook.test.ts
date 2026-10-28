import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendWebhook } from "./webhook";

const url = "https://discord.com/api/webhooks/x";
const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue({ ok: true, status: 204 });
  vi.stubGlobal("fetch", fetchMock);
  vi.useFakeTimers();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("sendWebhook", () => {
  it("JSON POST + allowed_mentions에 roleId만", async () => {
    await sendWebhook(url, "hi", "R1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [u, init] = fetchMock.mock.calls[0];
    expect(u).toBe(url);
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({ content: "hi", allowed_mentions: { parse: [], roles: ["R1"] } });
  });

  it("roleId 없으면 roles 빈 배열 (parse는 항상 [])", async () => {
    await sendWebhook(url, "hi");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).allowed_mentions).toEqual({ parse: [], roles: [] });
  });

  it("everyone이면 @everyone 언급 허용", async () => {
    await sendWebhook(url, "hi", undefined, true);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).allowed_mentions).toEqual({ parse: ["everyone"], roles: [] });
  });

  it("여러 메시지는 순차 전송, 사이에 500ms 대기", async () => {
    const p = sendWebhook(url, ["a", "b", "c"]);
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(499);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(500);
    await p;
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.map((c) => JSON.parse(c[1].body).content)).toEqual(["a", "b", "c"]);
  });

  it("2xx가 아니면 throw", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 429 });
    await expect(sendWebhook(url, "x")).rejects.toThrow(/429/);
  });

  it("빈 배열은 아무것도 보내지 않음", async () => {
    await sendWebhook(url, []);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
