"use client";

import { ChevronDown, Megaphone } from "lucide-react";
import { useActionState, useState } from "react";
import { deleteNotice, updateNotice } from "@/app/(dashboard)/notices/actions";
import type { FormState } from "@/app/(dashboard)/projects/[id]/actions";
import { NoticeBody } from "@/components/notices/NoticeBody";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useFormDirty } from "@/components/ui/useFormDirty";
import { useRetainOnError } from "@/components/ui/useRetainOnError";
import { MAX_NOTICE } from "@/lib/notices/rules";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/date";

export type NoticeItem = {
  id: string;
  title: string;
  content: string;
  authorName: string;
  createdAt: Date;
  updatedAt: Date;
};

export function NoticeCard({ notice, isAdmin, featured = false }: { notice: NoticeItem; isAdmin: boolean; featured?: boolean }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [state, formAction, pending] = useActionState<FormState, FormData>(async (prev, fd) => {
    const r = await updateNotice(notice.id, prev, fd);
    if (r.ok) setEditing(false);
    return r;
  }, {});
  const { formRef, submit } = useRetainOnError(formAction, state);
  const { noChange, check, guard } = useFormDirty(formRef, state);
  const e = state.fieldErrors ?? {};

  const edited = notice.updatedAt.getTime() - notice.createdAt.getTime() > 1000;

  if (editing) {
    const Wrapper = featured ? "div" : "li"; // 이전 공지는 <ul> 안에 들어간다
    return (
      <Wrapper className={cn("bg-white p-5", featured && "rounded-md border border-slate-200")}>
        <form ref={formRef} action={guard(submit)} onInput={check} onChange={check} className="space-y-3">
          <Field id={`notice-title-${notice.id}`} label="제목" error={e.title}>
            <Input id={`notice-title-${notice.id}`} name="title" defaultValue={notice.title} maxLength={MAX_NOTICE.title} required />
          </Field>
          <Field id={`notice-content-${notice.id}`} label="내용" error={e.content}>
            <Textarea
              id={`notice-content-${notice.id}`}
              name="content"
              defaultValue={notice.content}
              rows={8}
              maxLength={MAX_NOTICE.content}
              required
            />
          </Field>
          {state.error && <p className="text-xs text-red-700">{state.error}</p>}
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "저장 중…" : "저장"}
            </Button>
            <Button variant="secondary" size="sm" disabled={pending} onClick={() => setEditing(false)}>
              취소
            </Button>
            {noChange && <span className="text-xs text-slate-500">변경된 내용이 없습니다</span>}
          </div>
        </form>
      </Wrapper>
    );
  }

  const meta = (
    <>
      {notice.authorName} · {formatDate(notice.createdAt)}
      {edited && ` · ${formatDate(notice.updatedAt)} 수정`}
    </>
  );

  const actions = isAdmin && (
    <div className="mt-4 flex items-center gap-2">
      <Button variant="text" size="sm" onClick={() => setEditing(true)}>
        수정
      </Button>
      <ConfirmDialog
        label="삭제"
        title="공지 삭제"
        message={`"${notice.title}"을(를) 삭제할까요? 되돌릴 수 없습니다.`}
        confirmLabel="삭제"
        size="sm"
        onConfirm={() => deleteNotice(notice.id).then((r) => setError(r.error ?? null))}
      />
      {error && <span className="text-xs text-red-700">{error}</span>}
    </div>
  );

  // 최신 공지는 접지 않고 본문까지 크게 — 들어오자마자 읽히는 게 공지의 목적
  if (featured) {
    return (
      <article className="rounded-md border border-l-4 border-slate-200 border-l-navy-700 bg-white px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex shrink-0 items-center rounded bg-navy-100 px-2 py-0.5 text-xs font-medium text-navy-700">최신</span>
          <h2 className="min-w-0 flex-1 truncate text-base font-semibold text-slate-900">{notice.title}</h2>
          <span className="shrink-0 text-xs text-slate-500">{meta}</span>
        </div>
        <div className="mt-3">
          <NoticeBody content={notice.content} />
        </div>
        {actions}
      </article>
    );
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-slate-50",
          "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-navy-500",
          open && "bg-navy-50 hover:bg-navy-50",
        )}
      >
        <Megaphone size={16} strokeWidth={1.75} aria-hidden className="shrink-0 text-slate-400" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">{notice.title}</span>
        <span className="shrink-0 text-xs tabular-nums text-slate-500">{meta}</span>
        <ChevronDown
          size={16}
          strokeWidth={1.75}
          aria-hidden
          className={cn("shrink-0 text-slate-400 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="border-t border-slate-200 px-5 py-4 pl-12">
          <NoticeBody content={notice.content} />
          {actions}
        </div>
      )}
    </li>
  );
}
