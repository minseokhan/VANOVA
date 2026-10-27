import { describe, expect, it } from "vitest";
import { buildInquiryNotice } from "./notify";

const base = { kind: "BUG" as const, authorName: "홍길동", content: "로그인이 안 돼요", baseUrl: "https://van.example" };

describe("buildInquiryNotice", () => {
  it("언급 + 종류 + 작성자 + 내용 + 링크", () => {
    expect(buildInquiryNotice({ ...base, userId: "U1" })).toBe(
      "<@U1> 📮 **새 문의 (버그 신고)** · 홍길동\n> 로그인이 안 돼요\nhttps://van.example/inquiries",
    );
  });

  it("userId 없으면 언급 생략", () => {
    expect(buildInquiryNotice(base).startsWith("📮")).toBe(true);
  });

  it("여러 줄 내용은 줄마다 인용", () => {
    expect(buildInquiryNotice({ ...base, content: "a\nb" })).toContain("> a\n> b\n");
  });

  it("긴 내용은 잘라서 2000자 이내", () => {
    const msg = buildInquiryNotice({ ...base, userId: "U1", content: "가".repeat(5000) });
    expect(msg.length).toBeLessThanOrEqual(2000);
    expect(msg).toContain("…");
    expect(msg.endsWith("https://van.example/inquiries")).toBe(true);
  });
});
