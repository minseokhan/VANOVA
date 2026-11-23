"use client";

import { Plus } from "lucide-react";
import { useActionState, useState } from "react";
import { createCheckEvent } from "@/app/(dashboard)/attendance/actions";
import type { FormState } from "@/app/(dashboard)/projects/[id]/actions";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useRetainOnError } from "@/components/ui/useRetainOnError";
import { CHECK_KIND_LABEL, CHECK_KINDS, MAX_CHECK_TITLE, type CheckKind } from "@/lib/attendance/rules";

/** 회의 출석 또는 기한 있는 투표·과제를 만든다. 대상은 만드는 시점의 승인된 부원 전원 */
export function CheckEventForm({ today }: { today: string }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<CheckKind>("MEETING");
  const [state, formAction, pending] = useActionState<FormState, FormData>(async (prev, fd) => {
    const r = await createCheckEvent(prev, fd);
    if (r.ok) setOpen(false);
    return r;
  }, {});
  const { formRef, submit } = useRetainOnError(formAction, state);
  const e = state.fieldErrors ?? {};

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus size={16} strokeWidth={2} aria-hidden />새 기록
      </Button>
    );
  }

  return (
    <form ref={formRef} action={submit} className="w-full space-y-4 rounded-md border border-slate-200 bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-[10rem_11rem_1fr]">
        <Field id="ck-kind" label="종류" error={e.kind}>
          <Select id="ck-kind" name="kind" value={kind} onChange={(ev) => setKind(ev.target.value as CheckKind)}>
            {CHECK_KINDS.map((k) => (
              <option key={k} value={k}>
                {CHECK_KIND_LABEL[k]}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="ck-date" label={kind === "MEETING" ? "회의 날짜" : "마감일"} error={e.date}>
          <Input id="ck-date" name="date" type="date" defaultValue={today} required />
        </Field>
        <Field id="ck-title" label="제목" error={e.title}>
          <Input
            id="ck-title"
            name="title"
            maxLength={MAX_CHECK_TITLE}
            placeholder={kind === "MEETING" ? "예) 11월 4주차 정기 회의" : "예) MT 날짜 투표, 회고 폼 작성"}
            required
          />
        </Field>
      </div>
      <p className="text-xs text-slate-500">
        지금 승인된 부원 전원이 대상입니다. 만든 뒤 이름을 눌러 {kind === "MEETING" ? "출석한" : "참여한"} 사람을 체크하세요.
        {kind === "TASK" && " 마감일이 지나도 체크되지 않은 사람은 미참여로 표시됩니다."}
      </p>
      {state.error && <p className="text-xs text-red-700">{state.error}</p>}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "만드는 중…" : "만들기"}
        </Button>
        <Button variant="secondary" disabled={pending} onClick={() => setOpen(false)}>
          닫기
        </Button>
      </div>
    </form>
  );
}
