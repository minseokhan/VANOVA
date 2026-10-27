import { describe, expect, it } from "vitest";
import {
  INQUIRY_KINDS,
  INQUIRY_KIND_LABEL,
  INQUIRY_KIND_TONE,
  canDeleteInquiry,
  canEditInquiry,
  canModifyPost,
  canReplyInquiry,
  inquiryWhere,
  parseInquiryKind,
  validateInquiryContent,
} from "./rules";

const admin = { id: "a1", role: "ADMIN" };
const member = { id: "m1", role: "MEMBER" };
const other = { id: "m2", role: "MEMBER" };

describe("validateInquiryContent", () => {
  it("빈 내용은 거부", () => {
    expect(validateInquiryContent("   ")).toBeTruthy();
  });

  it("2000자까지 허용, 넘으면 거부", () => {
    expect(validateInquiryContent("a".repeat(2000))).toBeNull();
    expect(validateInquiryContent("a".repeat(2001))).toBeTruthy();
  });
});

describe("parseInquiryKind", () => {
  it("정의된 종류만 통과", () => {
    for (const k of INQUIRY_KINDS) {
      expect(parseInquiryKind(k)).toBe(k);
      expect(INQUIRY_KIND_LABEL[k]).toBeTruthy();
    }
  });

  it("모르는 값·빈 값은 null", () => {
    expect(parseInquiryKind("COMPLAINT")).toBeNull();
    expect(parseInquiryKind("")).toBeNull();
  });
});

describe("canDeleteInquiry", () => {
  it("운영진은 답변 여부와 무관하게 삭제할 수 있다", () => {
    expect(canDeleteInquiry(admin, { authorId: "m1", answer: "답" })).toBe(true);
  });

  it("작성자 본인은 미답변일 때만 삭제할 수 있다", () => {
    expect(canDeleteInquiry(member, { authorId: "m1", answer: null })).toBe(true);
    expect(canDeleteInquiry(member, { authorId: "m1", answer: "답" })).toBe(false);
  });

  it("남의 문의는 삭제할 수 없다", () => {
    expect(canDeleteInquiry(other, { authorId: "m1", answer: null })).toBe(false);
  });
});

describe("canEditInquiry", () => {
  it("작성자 본인만, 답변이 달리기 전까지 수정할 수 있다", () => {
    expect(canEditInquiry(member, { authorId: "m1", answer: null })).toBe(true);
    expect(canEditInquiry(member, { authorId: "m1", answer: "답" })).toBe(false);
  });

  it("운영진도 남의 문의는 수정할 수 없다", () => {
    expect(canEditInquiry(admin, { authorId: "m1", answer: null })).toBe(false);
  });
});

describe("canModifyPost", () => {
  it("답변·답글은 쓴 사람 본인만 수정·삭제한다 — 운영진도 남의 글은 안 된다", () => {
    expect(canModifyPost(admin, "a1")).toBe(true);
    expect(canModifyPost(admin, "m1")).toBe(false);
    expect(canModifyPost(member, "m1")).toBe(true);
    expect(canModifyPost(member, null)).toBe(false);
  });
});

describe("canReplyInquiry", () => {
  it("운영진과 작성자 본인만 이어서 답글을 달 수 있다", () => {
    expect(canReplyInquiry(admin, { authorId: "m1" })).toBe(true);
    expect(canReplyInquiry(member, { authorId: "m1" })).toBe(true);
    expect(canReplyInquiry(other, { authorId: "m1" })).toBe(false);
  });
});

describe("inquiryWhere", () => {
  it("ALL은 조건 없음", () => {
    expect(inquiryWhere("ALL", "m1")).toEqual({});
  });

  it("MINE은 작성자", () => {
    expect(inquiryWhere("MINE", "m1")).toEqual({ authorId: "m1" });
  });

  it("UNANSWERED는 첫 답변이 없는 문의", () => {
    expect(inquiryWhere("UNANSWERED", "m1")).toEqual({ answer: null });
  });
});

// 라벨·톤은 Record 라 컴파일러가 누락을 잡지만, 배열인 INQUIRY_KINDS 는 조용히 빠질 수 있다
describe("INQUIRY_KINDS", () => {
  it("모든 종류를 빠짐없이 담는다", () => {
    expect([...INQUIRY_KINDS].sort()).toEqual(Object.keys(INQUIRY_KIND_LABEL).sort());
    expect([...INQUIRY_KINDS].sort()).toEqual(Object.keys(INQUIRY_KIND_TONE).sort());
  });
});
