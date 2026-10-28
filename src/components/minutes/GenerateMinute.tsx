"use client";

import { ExternalLink, Sparkles } from "lucide-react";
import { useActionState, useState } from "react";
import { generateMinute } from "@/app/(dashboard)/minutes/actions";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { MAX_NOTES } from "@/lib/minutes/compose";

const NOTES_PLACEHOLDER = `예)
성정헌은 학교 팀플 회의로 불참, 나머지 멤버는 다 참여함.
4-3은 팀원 목록이 헷갈린다고 해서 대시보드 팀원 정보 업데이트하기로 함.
7-2는 팀원 학습 수준 파악용 간단한 퀴즈를 다음 주까지 만들어 달라는 요청이 있었음.`;

/**
 * 자유 메모 → 구글 독스 회의록 생성 → 링크 표시. 목록 등록은 문서를 확인한 뒤 "회의록 등록"으로 직접 한다.
 * 메모는 회의 날짜별로 저장되고, 달력에서 메모가 있는 날을 고르면 그때 쓴 메모가 다시 채워진다.
 */
export function GenerateMinuteForm({
  defaultDate,
  defaultRoster,
  savedNotes,
}: {
  defaultDate: string;
  defaultRoster: string;
  savedNotes: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(defaultDate);
  const [roster, setRoster] = useState(defaultRoster);
  const [notes, setNotes] = useState(savedNotes[defaultDate] ?? "");
  const [state, formAction, pending] = useActionState(generateMinute, {});
  const e = state.fieldErrors ?? {};

  const pickDate = (d: string) => {
    setDate(d);
    if (d in savedNotes) setNotes(savedNotes[d]);
  };

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Sparkles size={16} strokeWidth={2} aria-hidden />
        회의록 생성
      </Button>
    );
  }

  return (
    <form action={formAction} className="w-full space-y-4 rounded-md border border-slate-200 bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-[11rem_1fr]">
        <Field id="gm-date" label="회의 날짜" error={e.date}>
          <DatePicker
            id="gm-date"
            value={date}
            onChange={pickDate}
            marked={new Set(Object.keys(savedNotes))}
            markedLabel="회의 내용이 저장된 날짜 (누르면 불러옴)"
          />
          <input type="hidden" name="date" value={date} />
        </Field>
        <Field id="gm-roster" label="참석 대상 명단 (쉼표로 구분)" error={e.roster}>
          <Input id="gm-roster" name="roster" value={roster} onChange={(ev) => setRoster(ev.target.value)} required />
        </Field>
      </div>
      <Field id="gm-notes" label="회의 내용 (불참자와 사유, 프로젝트별 피드백, 결정사항, 요구사항 등을 자유롭게)" error={e.notes}>
        <Textarea
          id="gm-notes"
          name="notes"
          rows={10}
          maxLength={MAX_NOTES}
          placeholder={NOTES_PLACEHOLDER}
          value={notes}
          onChange={(ev) => setNotes(ev.target.value)}
          required
        />
      </Field>
      <p className="text-xs text-slate-500">
        주요 프로젝트의 그 주 주간 보고(한 일·막힌 점·다음 주 계획)가 자동으로 반영되어 드라이브 회의록 폴더에 구글 독스로 저장됩니다. 문서를
        확인한 뒤 &quot;회의록 등록&quot;으로 목록에 올려 주세요. 회의 내용은 날짜별로 저장됩니다.
      </p>
      {state.error && <p className="text-xs text-red-700">{state.error}</p>}
      {state.url && !pending && (
        <p className="text-sm text-slate-700">
          회의록을 만들었습니다.{" "}
          <a href={state.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-navy-500 hover:underline">
            <ExternalLink size={14} strokeWidth={1.75} aria-hidden />
            구글 독스에서 열기
          </a>
        </p>
      )}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "생성 중…" : "회의록 생성"}
        </Button>
        <Button variant="secondary" disabled={pending} onClick={() => setOpen(false)}>
          닫기
        </Button>
      </div>
    </form>
  );
}
