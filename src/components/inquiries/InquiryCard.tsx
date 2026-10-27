"use client";

import type { InquiryKind } from "@prisma/client";
import { useActionState, useState } from "react";
import { answerInquiry, deleteInquiry, replyInquiry, updateInquiry } from "@/app/(dashboard)/inquiries/actions";
import type { FormState } from "@/app/(dashboard)/projects/[id]/actions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field } from "@/components/ui/Field";
import { Textarea } from "@/components/ui/Textarea";
import { useRetainOnError } from "@/components/ui/useRetainOnError";
import { INQUIRY_KIND_LABEL, INQUIRY_KIND_TONE, MAX_INQUIRY } from "@/lib/inquiries/rules";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/date";

export type InquiryItem = {
  id: string;
  kind: InquiryKind;
  authorName: string;
  content: string;
  createdAt: Date;
  answer: string | null;
  answererName: string | null;
  answeredAt: Date | null;
  needsAnswer: boolean;
  replies: { id: string; authorName: string; fromAdmin: boolean; content: string; createdAt: Date }[];
};

export function InquiryCard({
  item,
  isAdmin,
  canDelete,
  canEdit,
  canReply,
}: {
  item: InquiryItem;
  isAdmin: boolean;
  canDelete: boolean;
  canEdit: boolean;
  canReply: boolean;
}) {
  const [answering, setAnswering] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState<FormState, FormData>(async (prev, fd) => {
    const r = await answerInquiry(item.id, prev, fd);
    if (!r.error && !r.fieldErrors) setAnswering(false);
    return r;
  }, {});
  const { formRef, submit } = useRetainOnError(formAction, state);

  return (
    <li className="rounded-md border border-slate-200 bg-white p-5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={INQUIRY_KIND_TONE[item.kind]}>{INQUIRY_KIND_LABEL[item.kind]}</Badge>
          <span>
            {item.authorName} · {formatDate(item.createdAt)}
          </span>
        </div>
        {item.needsAnswer && <Badge tone="amber">{item.answer ? "답변 대기" : "미답변"}</Badge>}
      </div>
      {editing ? (
        <EditForm item={item} onDone={() => setEditing(false)} />
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{item.content}</p>
      )}

      {item.answer && !answering && (
        <div className="mt-3 rounded-md bg-navy-50 p-3">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{item.answer}</p>
          <p className="mt-2 text-xs text-slate-500">
            {item.answererName ?? "운영진"} 답변 · {item.answeredAt ? formatDate(item.answeredAt) : ""}
          </p>
        </div>
      )}

      {item.answer &&
        item.replies.map((r) => (
          <div key={r.id} className={cn("mt-2 rounded-md p-3", r.fromAdmin ? "bg-navy-50" : "ml-6 border border-slate-200")}>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{r.content}</p>
            <p className="mt-2 text-xs text-slate-500">
              {r.authorName} · {formatDate(r.createdAt)}
            </p>
          </div>
        ))}

      {item.answer && canReply && !answering && <ReplyForm inquiryId={item.id} />}

      {answering && (
        <form ref={formRef} action={submit} className="mt-3 space-y-2">
          <Field id={`inq-answer-${item.id}`} label="답변" error={state.fieldErrors?.answer}>
            <Textarea
              id={`inq-answer-${item.id}`}
              name="answer"
              rows={3}
              maxLength={4000}
              defaultValue={item.answer ?? ""}
              autoFocus
              required
            />
          </Field>
          {state.error && <p className="text-xs text-red-700">{state.error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              저장
            </Button>
            <Button variant="secondary" size="sm" disabled={pending} onClick={() => setAnswering(false)}>
              취소
            </Button>
          </div>
        </form>
      )}

      {(isAdmin || canDelete || canEdit) && !answering && !editing && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {isAdmin && (
            <Button variant="text" size="sm" onClick={() => setAnswering(true)}>
              {item.answer ? "답변 수정" : "답변하기"}
            </Button>
          )}
          {canEdit && (
            <Button variant="text" size="sm" onClick={() => setEditing(true)}>
              수정
            </Button>
          )}
          {canDelete && (
            <ConfirmDialog
              label="삭제"
              title="문의 삭제"
              message="이 문의를 삭제할까요? 되돌릴 수 없습니다."
              confirmLabel="삭제"
              size="sm"
              onConfirm={() => deleteInquiry(item.id).then((r) => setError(r.error ?? null))}
            />
          )}
          {error && <p className="text-xs text-red-700">{error}</p>}
        </div>
      )}
    </li>
  );
}

function ReplyForm({ inquiryId }: { inquiryId: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    (prev, fd) => replyInquiry(inquiryId, prev, fd),
    {},
  );
  const { formRef, submit } = useRetainOnError(formAction, state);

  return (
    <form ref={formRef} action={submit} className="mt-3 space-y-2">
      <Field id={`inq-reply-${inquiryId}`} label="답글" error={state.fieldErrors?.content}>
        <Textarea id={`inq-reply-${inquiryId}`} name="content" rows={2} maxLength={4000} required />
      </Field>
      {state.error && <p className="text-xs text-red-700">{state.error}</p>}
      <Button type="submit" size="sm" disabled={pending}>
        답글 달기
      </Button>
    </form>
  );
}

function EditForm({ item, onDone }: { item: InquiryItem; onDone: () => void }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(async (prev, fd) => {
    const r = await updateInquiry(item.id, prev, fd);
    if (r.ok) onDone();
    return r;
  }, {});
  const { formRef, submit } = useRetainOnError(formAction, state);

  return (
    <form ref={formRef} action={submit} className="space-y-2">
      <Field id={`inq-edit-${item.id}`} label="문의 내용" error={state.fieldErrors?.content}>
        <Textarea
          id={`inq-edit-${item.id}`}
          name="content"
          rows={3}
          maxLength={MAX_INQUIRY}
          defaultValue={item.content}
          autoFocus
          required
        />
      </Field>
      {state.error && <p className="text-xs text-red-700">{state.error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          저장
        </Button>
        <Button variant="secondary" size="sm" disabled={pending} onClick={onDone}>
          취소
        </Button>
      </div>
    </form>
  );
}
