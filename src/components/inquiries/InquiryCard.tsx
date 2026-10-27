"use client";

import type { InquiryKind } from "@prisma/client";
import { MoreVertical } from "lucide-react";
import { useActionState, useState } from "react";
import {
  answerInquiry,
  deleteAnswer,
  deleteInquiry,
  deleteReply,
  replyInquiry,
  updateAnswer,
  updateInquiry,
  updateReply,
} from "@/app/(dashboard)/inquiries/actions";
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
  answerMine: boolean;
  replies: { id: string; authorName: string; fromAdmin: boolean; mine: boolean; content: string; createdAt: Date }[];
};

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

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
  const [mode, setMode] = useState<"answer" | "reply" | "edit" | null>(null);
  const [showThread, setShowThread] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const close = () => setMode(null);

  return (
    <li className="rounded-md border border-slate-200 bg-white p-5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={INQUIRY_KIND_TONE[item.kind]}>{INQUIRY_KIND_LABEL[item.kind]}</Badge>
          <span>
            {item.authorName} · {formatDate(item.createdAt)}
          </span>
        </div>
        {!item.answer && <Badge tone="amber">미답변</Badge>}
      </div>
      {mode === "edit" ? (
        <TextForm
          id={`inq-edit-${item.id}`}
          label="문의 내용"
          maxLength={MAX_INQUIRY}
          defaultValue={item.content}
          action={(prev, fd) => updateInquiry(item.id, prev, fd)}
          onDone={close}
        />
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{item.content}</p>
      )}

      {item.answer && (
        <Post
          id={`inq-ans-${item.id}`}
          content={item.answer}
          meta={`${item.answererName ?? "운영진"} 답변 · ${item.answeredAt ? formatDate(item.answeredAt) : ""}`}
          className="mt-3 bg-navy-50"
          mine={item.answerMine}
          update={(prev, fd) => updateAnswer(item.id, prev, fd)}
          remove={() => deleteAnswer(item.id)}
        />
      )}

      {item.replies.length > 0 && (
        <button
          type="button"
          aria-expanded={showThread}
          onClick={() => setShowThread((v) => !v)}
          className="mt-2 text-xs text-navy-500 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-500"
        >
          {showThread ? "대화 접기" : `이어진 대화 ${item.replies.length}개 보기`}
        </button>
      )}

      {showThread &&
        item.replies.map((r) => (
          <Post
            key={r.id}
            id={`inq-reply-${r.id}`}
            content={r.content}
            meta={`${r.authorName} · ${formatDate(r.createdAt)}`}
            className={cn("mt-2", r.fromAdmin ? "bg-navy-50" : "ml-6 border border-slate-200")}
            mine={r.mine}
            update={(prev, fd) => updateReply(r.id, prev, fd)}
            remove={() => deleteReply(r.id)}
          />
        ))}

      {mode === "answer" && (
        <div className="mt-3">
          <TextForm
            id={`inq-answer-${item.id}`}
            label="답변"
            name="answer"
            action={(prev, fd) => answerInquiry(item.id, prev, fd)}
            onDone={close}
          />
        </div>
      )}

      {mode === "reply" && (
        <div className="mt-3">
          <TextForm
            id={`inq-new-reply-${item.id}`}
            label="답글"
            submitLabel="답글 달기"
            action={(prev, fd) => replyInquiry(item.id, prev, fd)}
            onDone={() => {
              close();
              setShowThread(true);
            }}
          />
        </div>
      )}

      {mode === null && (
        <div className="mt-3 flex flex-wrap items-center gap-3 empty:hidden">
          {isAdmin && !item.answer && (
            <Button variant="soft" size="sm" onClick={() => setMode("answer")}>
              답변하기
            </Button>
          )}
          {item.answer && canReply && (
            <Button variant="soft" size="sm" onClick={() => setMode("reply")}>
              답글 달기
            </Button>
          )}
          {canEdit && (
            <Button variant="soft" size="sm" onClick={() => setMode("edit")}>
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

/** 답변·답글 한 건. 내가 쓴 글이면 오른쪽 ⋮ 메뉴로 수정·삭제 */
function Post({
  id,
  content,
  meta,
  className,
  mine,
  update,
  remove,
}: {
  id: string;
  content: string;
  meta: string;
  className: string;
  mine: boolean;
  update: Action;
  remove: () => Promise<{ error?: string }>;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (editing) {
    return (
      <div className={cn("rounded-md p-3", className)}>
        <TextForm id={id} label="수정" defaultValue={content} action={update} onDone={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div className={cn("relative rounded-md p-3", mine && "pr-10", className)}>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{content}</p>
      <p className="mt-2 text-xs text-slate-500">{meta}</p>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
      {mine && (
        <details className="absolute right-2 top-2">
          <summary
            aria-label="더보기"
            className="flex cursor-pointer list-none rounded-md p-1 text-slate-500 hover:bg-slate-200/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-500 [&::-webkit-details-marker]:hidden"
          >
            <MoreVertical size={16} strokeWidth={1.75} aria-hidden />
          </summary>
          <div className="absolute right-0 z-10 mt-1 flex w-28 flex-col gap-1 rounded-md border border-slate-200 bg-white p-1 shadow-md">
            <Button variant="soft" size="sm" onClick={() => setEditing(true)}>
              수정하기
            </Button>
            <ConfirmDialog
              label="삭제하기"
              title="삭제"
              message="이 글을 삭제할까요? 되돌릴 수 없습니다."
              confirmLabel="삭제"
              size="sm"
              onConfirm={() => remove().then((r) => setError(r.error ?? null))}
            />
          </div>
        </details>
      )}
    </div>
  );
}

function TextForm({
  id,
  label,
  name = "content",
  maxLength = 4000,
  defaultValue = "",
  submitLabel = "저장",
  action,
  onDone,
}: {
  id: string;
  label: string;
  name?: string;
  maxLength?: number;
  defaultValue?: string;
  submitLabel?: string;
  action: Action;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(async (prev, fd) => {
    const r = await action(prev, fd);
    if (!r.error && !r.fieldErrors) onDone();
    return r;
  }, {});
  const { formRef, submit } = useRetainOnError(formAction, state);

  return (
    <form ref={formRef} action={submit} className="space-y-2">
      <Field id={id} label={label} error={state.fieldErrors?.[name]}>
        <Textarea id={id} name={name} rows={3} maxLength={maxLength} defaultValue={defaultValue} autoFocus required />
      </Field>
      {state.error && <p className="text-xs text-red-700">{state.error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {submitLabel}
        </Button>
        <Button variant="secondary" size="sm" disabled={pending} onClick={onDone}>
          취소
        </Button>
      </div>
    </form>
  );
}
