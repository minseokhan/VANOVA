"use client";

import { Plus } from "lucide-react";
import { useActionState, useState } from "react";
import { createTask } from "@/app/(dashboard)/attendance/actions";
import type { FormState } from "@/app/(dashboard)/projects/[id]/actions";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { useRetainOnError } from "@/components/ui/useRetainOnError";
import { MAX_TASK_TITLE } from "@/lib/attendance/rules";

/** 카톡 투표·"언제까지 ~ 해주세요" 같은 기한 있는 요청. 대상은 만드는 시점의 승인된 부원 전원 */
export function TaskForm({ today }: { today: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<FormState, FormData>(async (prev, fd) => {
    const r = await createTask(prev, fd);
    if (r.ok) setOpen(false);
    return r;
  }, {});
  const { formRef, submit } = useRetainOnError(formAction, state);
  const e = state.fieldErrors ?? {};

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Plus size={16} strokeWidth={2} aria-hidden />
        투표 · 과제 추가
      </Button>
    );
  }

  return (
    <form ref={formRef} action={submit} className="w-full space-y-4 rounded-md border border-slate-200 bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-[11rem_1fr]">
        <Field id="task-due" label="마감일" error={e.dueDate}>
          <Input id="task-due" name="dueDate" type="date" defaultValue={today} required />
        </Field>
        <Field id="task-title" label="제목" error={e.title}>
          <Input id="task-title" name="title" maxLength={MAX_TASK_TITLE} placeholder="예) MT 날짜 투표, 회고 폼 작성" required />
        </Field>
      </div>
      <p className="text-xs text-slate-500">
        지금 승인된 부원 전원이 대상입니다. 참여한 사람 이름을 눌러 체크하세요. 마감일이 지나도 체크되지 않은 사람은 미참여로 표시됩니다.
      </p>
      {state.error && <p className="text-xs text-red-700">{state.error}</p>}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "추가 중…" : "추가"}
        </Button>
        <Button variant="secondary" disabled={pending} onClick={() => setOpen(false)}>
          닫기
        </Button>
      </div>
    </form>
  );
}
