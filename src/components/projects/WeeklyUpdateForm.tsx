"use client";

import { useActionState, useState } from "react";
import { submitWeeklyUpdate, type FormState } from "@/app/(dashboard)/projects/[id]/actions";
import { WeeklyAttachmentList } from "@/components/projects/WeeklyAttachmentList";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { FileInput } from "@/components/ui/FileInput";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useRetainOnError } from "@/components/ui/useRetainOnError";
import { cn } from "@/lib/utils/cn";
import { formatDateTime } from "@/lib/utils/date";
import { ALLOWED_EXT, validateUploadFile } from "@/lib/plan-docs/validation";
import { MAX_ATTACHMENTS, type WeeklyAttachment, type WeeklyInput } from "@/lib/projects/info";

const ACCEPT = ALLOWED_EXT.map((e) => `.${e}`).join(",");

export type WeeklyFormInitial = WeeklyInput & { attachments: WeeklyAttachment[] };

export function WeeklyUpdateForm({
  projectId,
  weekLabel,
  initial,
  submitted,
  draft,
}: {
  projectId: string;
  weekLabel: string;
  /** 임시저장본이 있으면 그 내용, 없으면 이번 주 제출본 */
  initial: WeeklyFormInitial | null;
  submitted: boolean;
  draft: { by: string; at: Date } | null;
}) {
  const [attachments, setAttachments] = useState<WeeklyAttachment[]>(initial?.attachments ?? []);
  const [saved, setSaved] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState<FormState<keyof WeeklyInput>, FormData>(
    async (prev, fd) => {
      fd.set("attachments", JSON.stringify(attachments));
      const r = await submitWeeklyUpdate(projectId, prev, fd);
      setSaved(r.error || r.fieldErrors ? null : fd.get("intent") === "draft" ? "임시저장되었습니다" : "제출되었습니다");
      return r;
    },
    {},
  );
  const { formRef, submit } = useRetainOnError(formAction, state);
  const errors = state.fieldErrors ?? {};
  return (
    <form ref={formRef} action={submit} className="space-y-3 rounded-md border border-slate-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <p className="font-medium text-slate-500">{weekLabel}</p>
        {draft && (
          <p className="text-slate-500">
            임시저장 · {draft.by} · {formatDateTime(draft.at)} <span className="text-slate-400">(아직 제출 전)</span>
          </p>
        )}
      </div>
      <Field id="didThisWeek" label="이번 주 한 일" error={errors.didThisWeek}>
        <Textarea id="didThisWeek" name="didThisWeek" defaultValue={initial?.didThisWeek} rows={3} maxLength={2000} required />
      </Field>
      <Field id="planNextWeek" label="다음 주 계획" error={errors.planNextWeek}>
        <Textarea id="planNextWeek" name="planNextWeek" defaultValue={initial?.planNextWeek} rows={3} maxLength={2000} required />
      </Field>
      <Field id="issues" label="이슈 · 막힌 점 (선택)" error={errors.issues}>
        <Textarea id="issues" name="issues" defaultValue={initial?.issues ?? ""} rows={2} maxLength={2000} />
      </Field>
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700">첨부 (선택)</p>
        <WeeklyAttachmentList items={attachments} onRemove={(i) => setAttachments((l) => l.filter((_, j) => j !== i))} />
        {attachments.length < MAX_ATTACHMENTS && (
          <AttachmentAdder projectId={projectId} onAdd={(a) => setAttachments((l) => [...l, a])} />
        )}
      </div>
      {state.error && <p className="text-xs text-red-700">{state.error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" name="intent" value="submit" disabled={pending}>
          {submitted ? "이번 주 보고 수정" : "이번 주 보고 제출"}
        </Button>
        <Button type="submit" variant="secondary" name="intent" value="draft" disabled={pending} formNoValidate>
          임시저장
        </Button>
        {saved && <span className="text-xs text-slate-500">{saved}</span>}
      </div>
    </form>
  );
}

/** 파일/링크 탭. 바깥 폼 안에 있어 중첩 form 대신 버튼으로 처리한다 */
function AttachmentAdder({ projectId, onAdd }: { projectId: string; onAdd: (a: WeeklyAttachment) => void }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<WeeklyAttachment["kind"]>("FILE");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);

  if (!open) {
    return (
      <Button variant="text" size="sm" onClick={() => setOpen(true)}>
        + 사진 · 파일 · 링크 첨부
      </Button>
    );
  }

  const close = () => {
    setOpen(false);
    setError(null);
    setTitle("");
    setUrl("");
    setFile(null);
  };

  const addFile = async () => {
    if (!file) return setError("파일을 선택하세요");
    const err = validateUploadFile(file.name, file.size);
    if (err) return setError(err);
    setBusy(true);
    setError(null);
    const body = new FormData();
    body.set("file", file);
    body.set("projectId", projectId);
    body.set("kind", "weekly");
    const res = await fetch("/api/upload", { method: "POST", body }).catch(() => null);
    const json = (await res?.json().catch(() => ({}))) as { url?: string; error?: string } | undefined;
    setBusy(false);
    if (!res?.ok || !json?.url) return setError(json?.error ?? "업로드에 실패했습니다");
    onAdd({ kind: "FILE", title: title.trim() || file.name, url: json.url });
    close();
  };

  const addLink = () => {
    if (!title.trim()) return setError("제목을 입력하세요");
    if (!/^https?:\/\//i.test(url.trim())) return setError("http(s) URL만 입력할 수 있습니다");
    onAdd({ kind: "LINK", title: title.trim(), url: url.trim() });
    close();
  };

  const tabClass = (k: WeeklyAttachment["kind"]) =>
    cn("border-b-2 px-2 pb-1 text-xs font-medium transition-colors", tab === k ? "border-navy-700 text-navy-700" : "border-transparent text-slate-500 hover:text-slate-700");

  return (
    // 안의 입력칸에서 Enter 를 치면 바깥 보고 폼이 제출되므로 막는다
    <div
      className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3"
      onKeyDown={(e) => e.key === "Enter" && e.target instanceof HTMLInputElement && e.preventDefault()}
    >
      <div role="tablist" className="flex gap-3">
        <button type="button" role="tab" aria-selected={tab === "FILE"} className={tabClass("FILE")} onClick={() => setTab("FILE")}>
          파일
        </button>
        <button type="button" role="tab" aria-selected={tab === "LINK"} className={tabClass("LINK")} onClick={() => setTab("LINK")}>
          링크
        </button>
      </div>
      <Field id="weekly-att-title" label={tab === "FILE" ? "제목 (비우면 파일명)" : "제목"}>
        <Input id="weekly-att-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
      </Field>
      {tab === "FILE" ? (
        <Field id="weekly-att-file" label="파일 (사진 포함, 20MB 이하)">
          <FileInput id="weekly-att-file" accept={ACCEPT} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </Field>
      ) : (
        <Field id="weekly-att-url" label="URL">
          <Input id="weekly-att-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
        </Field>
      )}
      {error && <p className="text-xs text-red-700">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" disabled={busy} onClick={tab === "FILE" ? addFile : addLink}>
          {busy ? "업로드 중…" : "추가"}
        </Button>
        <Button variant="secondary" size="sm" disabled={busy} onClick={close}>
          취소
        </Button>
      </div>
    </div>
  );
}
