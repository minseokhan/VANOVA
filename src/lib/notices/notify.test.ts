import { describe, expect, it } from "vitest";
import { buildNoticeAnnouncement } from "./notify";

describe("buildNoticeAnnouncement", () => {
  it("@everyone + 제목 + 링크", () => {
    expect(buildNoticeAnnouncement({ title: "MT 일정 안내", baseUrl: "https://van.example" })).toBe(
      "@everyone 📢 새 공지가 올라왔습니다: **MT 일정 안내**\nhttps://van.example/notices",
    );
  });

});
