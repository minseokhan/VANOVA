"use client";

import { Plus } from "lucide-react";
import { useActionState, useState } from "react";
import { createMinute, deleteMinute } from "@/app/(dashboard)/minutes/actions";
import type { FormState } from "@/app/(dashboard)/projects/[id]/actions";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { useRetainOnError } from "@/components/ui/useRetainOnError";
import { MAX_MINUTE_TITLE } from "@/lib/minutes/rules";

/** 날짜·제목·회의록 링크로 등록한다 */
export function MinuteForm({ today }: { today: string }) {
  const [open, setOpen] = useState(false);

  const [state, formAction, pending] = useActionState<FormState, FormData>(async (prev, fd) => {
    const r = await createMinute(prev, fd);
    if (r.ok) setOpen(false);
    return r;
  }, {});
  const { formRef, submit } = useRetainOnError(formAction, state);
  const e = state.fieldErrors ?? {};

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus size={16} strokeWidth={2} aria-hidden />
        회의록 등록
      </Button>
    );
  }

  return (
    <form ref={formRef} action={submit} className="w-full space-y-4 rounded-md border border-slate-200 bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-[11rem_1fr]">
        <Field id="mn-date" label="회의 날짜" error={e.date}>
          <Input id="mn-date" name="date" type="date" defaultValue={today} required />
        </Field>
        <Field id="mn-title" label="제목" error={e.title}>
          <Input id="mn-title" name="title" maxLength={MAX_MINUTE_TITLE} placeholder="예) 10월 1주차 정기 회의" required />
        </Field>
      </div>
      <Field id="mn-url" label="회의록 링크 (구글 독스 등 · 링크 공유를 '보기 가능'으로 열어 두세요)" error={e.fileUrl}>
        <Input id="mn-url" name="fileUrl" type="url" placeholder="https://docs.google.com/document/d/..." required />
      </Field>
      {state.error && <p className="text-xs text-red-700">{state.error}</p>}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "등록 중…" : "등록"}
        </Button>
        <Button variant="secondary" disabled={pending} onClick={() => setOpen(false)}>
          닫기
        </Button>
      </div>
    </form>
  );
}

export function DeleteMinuteButton({ id, title }: { id: string; title: string }) {
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <ConfirmDialog
        label="삭제"
        title="회의록 삭제"
        message={`"${title}"을(를) 삭제할까요? 되돌릴 수 없습니다. 링크된 원본 문서는 지워지지 않습니다.`}
        confirmLabel="삭제"
        size="sm"
        onConfirm={() => deleteMinute(id).then((r) => setError(r.error ?? null))}
      />
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}
