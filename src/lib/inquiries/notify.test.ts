import { describe, expect, it } from "vitest";
import { buildAnswerNotice, buildInquiryNotice, buildReplyNotice } from "./notify";

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

describe("buildAnswerNotice", () => {
  it("작성자 언급 + 답변 완료 + 링크 (문의 내용은 넣지 않음)", () => {
    expect(buildAnswerNotice({ authorName: "홍길동", authorDiscordId: "U2", baseUrl: "https://van.example" })).toBe(
      "<@U2> 문의하신 내용에 답변이 완료되었습니다. 확인해 주세요.\nhttps://van.example/inquiries",
    );
  });

  it("디스코드 ID가 없으면 이름으로", () => {
    expect(buildAnswerNotice({ authorName: "홍길동", baseUrl: "https://van.example" })).toBe(
      "**홍길동**님, 문의하신 내용에 답변이 완료되었습니다. 확인해 주세요.\nhttps://van.example/inquiries",
    );
  });
});

describe("buildReplyNotice", () => {
  const reply = { inquiryAuthorName: "홍길동", inquiryContent: "로그인이 안 돼요", replierName: "김철수", content: "아직도 안 돼요", baseUrl: "https://van.example" };

  it("언급 + 어떤 문의인지 + 추가 답변 + 확인 요청 + 링크", () => {
    expect(buildReplyNotice({ ...reply, userId: "U1" })).toBe(
      "<@U1> 💬 **홍길동님 문의에 추가 답변이 달렸습니다. 확인해 주세요.**\n" +
        "> 문의: 로그인이 안 돼요\n> 추가 답변 (김철수): 아직도 안 돼요\nhttps://van.example/inquiries",
    );
  });

  it("문의·답글은 한 줄로 줄이고 길면 자른다", () => {
    const msg = buildReplyNotice({ ...reply, inquiryContent: "a\nb", content: "가".repeat(5000) });
    expect(msg).toContain("> 문의: a b\n");
    expect(msg.length).toBeLessThanOrEqual(2000);
    expect(msg.endsWith("https://van.example/inquiries")).toBe(true);
  });
});
