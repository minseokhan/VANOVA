"use client";

import { ExternalLink, Plus, Sparkles } from "lucide-react";
import { useActionState, useState } from "react";
import { createMinute, deleteMinute, generateMinute } from "@/app/(dashboard)/minutes/actions";
import type { FormState } from "@/app/(dashboard)/projects/[id]/actions";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useRetainOnError } from "@/components/ui/useRetainOnError";
import { MAX_NOTES } from "@/lib/minutes/compose";
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

const NOTES_PLACEHOLDER = `예)
성정헌은 학교 팀플 회의로 불참, 나머지 멤버는 다 참여함.
4-3은 팀원 목록이 헷갈린다고 해서 대시보드 팀원 정보 업데이트하기로 함.
7-2는 팀원 학습 수준 파악용 간단한 퀴즈를 다음 주까지 만들어 달라는 요청이 있었음.`;

/** 자유 메모를 적으면 주요 프로젝트 주간 보고와 합쳐 LLM 이 양식대로 회의록을 만들어 드라이브에 올린다 */
export function GenerateMinuteForm({ defaultDate, defaultRoster }: { defaultDate: string; defaultRoster: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(generateMinute, {});
  const { formRef, submit } = useRetainOnError(formAction, state);
  const e = state.fieldErrors ?? {};

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Sparkles size={16} strokeWidth={2} aria-hidden />
        회의록 생성
      </Button>
    );
  }

  return (
    <form ref={formRef} action={submit} className="w-full space-y-4 rounded-md border border-slate-200 bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-[11rem_1fr]">
        <Field id="gm-date" label="회의 날짜" error={e.date}>
          <Input id="gm-date" name="date" type="date" defaultValue={defaultDate} required />
        </Field>
        <Field id="gm-roster" label="참석 대상 명단 (쉼표로 구분)" error={e.roster}>
          <Input id="gm-roster" name="roster" defaultValue={defaultRoster} required />
        </Field>
      </div>
      <Field id="gm-notes" label="회의 내용 (불참자와 사유, 프로젝트별 피드백, 결정사항, 요구사항 등을 자유롭게)" error={e.notes}>
        <Textarea id="gm-notes" name="notes" rows={10} maxLength={MAX_NOTES} placeholder={NOTES_PLACEHOLDER} required />
      </Field>
      <p className="text-xs text-slate-500">
        주요 프로젝트의 이번 주 주간 보고(한 일·막힌 점·다음 주 계획)는 자동으로 반영됩니다. 생성에 1분 정도 걸립니다.
      </p>
      {state.error && <p className="text-xs text-red-700">{state.error}</p>}
      {state.ok && state.url && (
        <p className="text-sm text-slate-700">
          회의록을 만들어 드라이브에 저장했습니다.{" "}
          <a href={state.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-navy-500 hover:underline">
            <ExternalLink size={14} strokeWidth={1.75} aria-hidden />
            열기
          </a>
        </p>
      )}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "생성 중…" : "생성"}
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
