import { validatePlanLink } from "@/lib/plan-docs/validation";

export const LANGUAGE_OPTIONS: string[] = ["TypeScript", "Python", "JavaScript", "Java", "Kotlin", "Swift", "Go", "기타"];

export type ProjectInfoInput = {
  githubUrl?: string;
  deployUrl?: string;
  mainLanguage?: string;
  infraNote?: string;
  startedAt?: string;
};
/** 검증 통과 값: 빈 문자열은 null로 정규화됨 */
export type ProjectInfoValue = Record<keyof ProjectInfoInput, string | null>;

const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function isHttpUrl(s: string): boolean {
  try {
    return ["http:", "https:"].includes(new URL(s).protocol);
  } catch {
    return false;
  }
}

export function validateProjectInfo(
  i: ProjectInfoInput,
): { ok: true; value: ProjectInfoValue } | { ok: false; errors: Partial<Record<keyof ProjectInfoInput, string>> } {
  const errors: Partial<Record<keyof ProjectInfoInput, string>> = {};
  const v = (s?: string) => (s?.trim() ? s.trim() : null);
  const value: ProjectInfoValue = {
    githubUrl: v(i.githubUrl),
    deployUrl: v(i.deployUrl),
    mainLanguage: v(i.mainLanguage),
    infraNote: v(i.infraNote),
    startedAt: v(i.startedAt),
  };
  if (value.githubUrl && !isHttpUrl(value.githubUrl)) errors.githubUrl = "http(s) URL만 입력할 수 있습니다";
  if (value.deployUrl && !isHttpUrl(value.deployUrl)) errors.deployUrl = "http(s) URL만 입력할 수 있습니다";
  if (value.mainLanguage && value.mainLanguage.length > 30) errors.mainLanguage = "주 언어는 30자 이하여야 합니다";
  if (value.infraNote && value.infraNote.length > 500) errors.infraNote = "인프라 메모는 500자 이하여야 합니다";
  if (value.startedAt && !DATE_RE.test(value.startedAt)) errors.startedAt = "시작일은 YYYY-MM-DD 형식이어야 합니다";
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value };
}

export function parseProjectInfoForm(fd: FormData): ProjectInfoInput {
  const get = (k: string) => String(fd.get(k) ?? "").trim();
  const lang = get("mainLanguage");
  return {
    githubUrl: get("githubUrl"),
    deployUrl: get("deployUrl"),
    mainLanguage: lang === "기타" ? get("mainLanguageOther") : lang,
    infraNote: get("infraNote"),
    startedAt: get("startedAt"),
  };
}

export type WeeklyInput = { didThisWeek: string; planNextWeek: string; issues?: string };
export type WeeklyValue = { didThisWeek: string; planNextWeek: string; issues: string | null };

/** draft(임시저장)는 빈 필드를 허용하고 길이만 검사한다 */
export function validateWeekly(
  i: WeeklyInput,
  { draft = false }: { draft?: boolean } = {},
): { ok: true; value: WeeklyValue } | { ok: false; errors: Partial<Record<keyof WeeklyInput, string>> } {
  const errors: Partial<Record<keyof WeeklyInput, string>> = {};
  const didThisWeek = i.didThisWeek.trim();
  const planNextWeek = i.planNextWeek.trim();
  const issues = i.issues?.trim() || null;
  if ((!draft && !didThisWeek) || didThisWeek.length > 2000) errors.didThisWeek = "이번 주 한 일은 1~2000자여야 합니다";
  if ((!draft && !planNextWeek) || planNextWeek.length > 2000) errors.planNextWeek = "다음 주 계획은 1~2000자여야 합니다";
  if (issues && issues.length > 2000) errors.issues = "이슈는 2000자 이하여야 합니다";
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: { didThisWeek, planNextWeek, issues } };
}

export function parseWeeklyForm(fd: FormData): WeeklyInput {
  const get = (k: string) => String(fd.get(k) ?? "").trim();
  return { didThisWeek: get("didThisWeek"), planNextWeek: get("planNextWeek"), issues: get("issues") };
}

export type WeeklyAttachment = { kind: "FILE" | "LINK"; title: string; url: string };
export const MAX_ATTACHMENTS = 10;

/** 폼의 attachments(JSON 문자열) 파싱·검증 */
export function parseAttachments(raw: string): { ok: true; value: WeeklyAttachment[] } | { ok: false; error: string } {
  if (!raw) return { ok: true, value: [] };
  let list: unknown;
  try {
    list = JSON.parse(raw);
  } catch {
    return { ok: false, error: "첨부 형식이 잘못되었습니다" };
  }
  if (!Array.isArray(list)) return { ok: false, error: "첨부 형식이 잘못되었습니다" };
  if (list.length > MAX_ATTACHMENTS) return { ok: false, error: `첨부는 ${MAX_ATTACHMENTS}개까지입니다` };
  const value: WeeklyAttachment[] = [];
  for (const a of list as Partial<Record<string, unknown>>[]) {
    const kind = a?.kind;
    const title = String(a?.title ?? "").trim();
    const url = String(a?.url ?? "").trim();
    if (kind !== "FILE" && kind !== "LINK") return { ok: false, error: "첨부 형식이 잘못되었습니다" };
    const r = validatePlanLink(title, url);
    if (!r.ok) return { ok: false, error: r.errors.title ?? r.errors.url ?? "첨부 형식이 잘못되었습니다" };
    // FILE 은 썸네일로 <img> 에 그대로 들어가므로 우리 Blob 스토어 URL만 받는다
    if (kind === "FILE" && !isBlobUrl(url)) return { ok: false, error: "업로드한 파일만 첨부할 수 있습니다" };
    value.push({ kind, title, url });
  }
  return { ok: true, value };
}

/** 우리 Vercel Blob 스토어의 https URL 인지 */
export function isBlobUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "https:" && u.hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export function isImageUrl(url: string): boolean {
  return /\.(png|jpe?g)(\?|#|$)/i.test(url);
}
