import { describe, expect, it } from "vitest";
import {
  LANGUAGE_OPTIONS,
  parseProjectInfoForm,
  isBlobUrl,
  isImageUrl,
  parseAttachments,
  parseWeeklyForm,
  validateProjectInfo,
  validateWeekly,
} from "./info";

describe("LANGUAGE_OPTIONS", () => {
  it("8개, 마지막은 기타", () => {
    expect(LANGUAGE_OPTIONS).toHaveLength(8);
    expect(LANGUAGE_OPTIONS[0]).toBe("TypeScript");
    expect(LANGUAGE_OPTIONS.at(-1)).toBe("기타");
  });
});

describe("validateProjectInfo", () => {
  it("빈 값은 전부 null로 정규화", () => {
    const r = validateProjectInfo({ githubUrl: "", deployUrl: "", mainLanguage: "", infraNote: "", startedAt: "" });
    expect(r).toEqual({
      ok: true,
      value: { githubUrl: null, deployUrl: null, mainLanguage: null, infraNote: null, startedAt: null },
    });
  });
  it("정상 입력은 그대로 통과", () => {
    const r = validateProjectInfo({
      githubUrl: "https://github.com/van/ai",
      deployUrl: "http://localhost:3000",
      mainLanguage: "Python",
      infraNote: "Vercel + Neon",
      startedAt: "2026-09-14",
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.startedAt).toBe("2026-09-14");
  });
  it("URL은 http(s)만 허용", () => {
    const r = validateProjectInfo({ githubUrl: "ftp://x.com", deployUrl: "javascript:alert(1)" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.githubUrl).toBeTruthy();
      expect(r.errors.deployUrl).toBeTruthy();
      expect(r.errors.infraNote).toBeUndefined();
    }
  });
  it("infraNote 500자 초과, mainLanguage 30자 초과, startedAt 형식 오류", () => {
    const r = validateProjectInfo({ infraNote: "a".repeat(501), mainLanguage: "a".repeat(31), startedAt: "2026/09/14" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["infraNote", "mainLanguage", "startedAt"]);
  });
  it("infraNote 500자는 허용", () => {
    expect(validateProjectInfo({ infraNote: "a".repeat(500) }).ok).toBe(true);
  });
});

describe("parseProjectInfoForm", () => {
  const fd = (o: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(o)) f.set(k, v);
    return f;
  };
  it("trim 후 필드 추출", () => {
    expect(parseProjectInfoForm(fd({ githubUrl: " https://g.com ", mainLanguage: "Go" }))).toEqual({
      githubUrl: "https://g.com",
      deployUrl: "",
      mainLanguage: "Go",
      infraNote: "",
      startedAt: "",
    });
  });
  it("mainLanguage가 기타면 직접 입력값 사용", () => {
    expect(parseProjectInfoForm(fd({ mainLanguage: "기타", mainLanguageOther: " Rust " })).mainLanguage).toBe("Rust");
  });
});

describe("validateWeekly", () => {
  it("필수 필드 비면 에러", () => {
    const r = validateWeekly({ didThisWeek: "", planNextWeek: "  " });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["didThisWeek", "planNextWeek"]);
  });
  it("2000자 초과 에러, issues 비면 null", () => {
    const r1 = validateWeekly({ didThisWeek: "a".repeat(2001), planNextWeek: "b", issues: "c".repeat(2001) });
    expect(r1.ok).toBe(false);
    if (!r1.ok) expect(Object.keys(r1.errors).sort()).toEqual(["didThisWeek", "issues"]);
    const r2 = validateWeekly({ didThisWeek: "a", planNextWeek: "b", issues: "" });
    expect(r2).toEqual({ ok: true, value: { didThisWeek: "a", planNextWeek: "b", issues: null } });
  });
  it("임시저장은 빈 필드를 허용하고 길이만 검사", () => {
    expect(validateWeekly({ didThisWeek: "", planNextWeek: "" }, { draft: true })).toEqual({
      ok: true,
      value: { didThisWeek: "", planNextWeek: "", issues: null },
    });
    expect(validateWeekly({ didThisWeek: "a".repeat(2001), planNextWeek: "" }, { draft: true }).ok).toBe(false);
  });
});

describe("parseAttachments", () => {
  const file = { kind: "FILE", title: " 화면.png ", url: "https://x.blob.vercel-storage.com/a.png" };
  it("빈 값은 빈 배열", () => {
    expect(parseAttachments("")).toEqual({ ok: true, value: [] });
  });
  it("정상 항목은 kind·title·url만 남기고 trim", () => {
    expect(parseAttachments(JSON.stringify([{ ...file, extra: 1 }]))).toEqual({
      ok: true,
      value: [{ kind: "FILE", title: "화면.png", url: file.url }],
    });
  });
  it("깨진 JSON·잘못된 kind·비 http URL·10개 초과는 거부", () => {
    expect(parseAttachments("{").ok).toBe(false);
    expect(parseAttachments(JSON.stringify([{ ...file, kind: "X" }])).ok).toBe(false);
    expect(parseAttachments(JSON.stringify([{ ...file, url: "javascript:alert(1)" }])).ok).toBe(false);
    expect(parseAttachments(JSON.stringify(Array(11).fill(file))).ok).toBe(false);
  });
  it("FILE은 Vercel Blob https URL만 허용 (외부 이미지 삽입 방지), LINK는 아무 http(s)", () => {
    expect(parseAttachments(JSON.stringify([{ ...file, url: "https://evil.com/a.png" }])).ok).toBe(false);
    expect(parseAttachments(JSON.stringify([{ ...file, url: "https://evil.com/x.blob.vercel-storage.com.png" }])).ok).toBe(false);
    expect(parseAttachments(JSON.stringify([{ ...file, url: "http://x.blob.vercel-storage.com/a.png" }])).ok).toBe(false);
    expect(parseAttachments(JSON.stringify([{ ...file, kind: "LINK", url: "https://evil.com/a.png" }])).ok).toBe(true);
  });
});

describe("isImageUrl", () => {
  it("png·jpg·jpeg 확장자만 이미지", () => {
    expect(isImageUrl("https://a/b/c-x1.PNG")).toBe(true);
    expect(isImageUrl("https://a/b.jpeg?x=1")).toBe(true);
    expect(isImageUrl("https://a/b.pdf")).toBe(false);
    expect(isImageUrl("https://a/png")).toBe(false);
  });
});

describe("parseWeeklyForm", () => {
  it("세 필드 trim", () => {
    const f = new FormData();
    f.set("didThisWeek", " 했음 ");
    f.set("planNextWeek", "할 것");
    expect(parseWeeklyForm(f)).toEqual({ didThisWeek: "했음", planNextWeek: "할 것", issues: "" });
  });
});

describe("isBlobUrl", () => {
  it("Vercel Blob https 만 true, 형식이 틀리면 예외 없이 false", () => {
    expect(isBlobUrl("https://x.public.blob.vercel-storage.com/a.png")).toBe(true);
    expect(isBlobUrl("http://x.public.blob.vercel-storage.com/a.png")).toBe(false);
    expect(isBlobUrl("https://169.254.169.254/latest")).toBe(false);
    expect(isBlobUrl("not a url")).toBe(false);
  });
});
