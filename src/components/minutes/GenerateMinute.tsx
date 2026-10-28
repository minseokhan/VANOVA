"use client";

import { ExternalLink, Plus, Sparkles, X } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { generateMinuteDraft, registerMinute } from "@/app/(dashboard)/minutes/actions";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { MAX_NOTES, type MinutesDraft } from "@/lib/minutes/compose";

const NOTES_PLACEHOLDER = `예)
성정헌은 학교 팀플 회의로 불참, 나머지 멤버는 다 참여함.
4-3은 팀원 목록이 헷갈린다고 해서 대시보드 팀원 정보 업데이트하기로 함.
7-2는 팀원 학습 수준 파악용 간단한 퀴즈를 다음 주까지 만들어 달라는 요청이 있었음.`;

type DraftState = Awaited<ReturnType<typeof generateMinuteDraft>> & { version?: number };

/**
 * 자유 메모 → LLM 초안 → 검토·수정 → 등록(드라이브 업로드).
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
  // 초안이 새로 올 때마다 편집기를 새로 그리도록 버전을 붙인다
  const [state, formAction, pending] = useActionState<DraftState, FormData>(
    async (prev, fd) => ({ ...(await generateMinuteDraft(prev, fd)), version: (prev.version ?? 0) + 1 }),
    {},
  );
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
    <div className="w-full space-y-4">
      <form action={formAction} className="space-y-4 rounded-md border border-slate-200 bg-white p-5">
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
          주요 프로젝트의 그 주 주간 보고(한 일·막힌 점·다음 주 계획)가 자동으로 반영됩니다. 회의 내용은 날짜별로 저장되고, 초안은 확인·수정한 뒤
          등록합니다.
        </p>
        {state.error && <p className="text-xs text-red-700">{state.error}</p>}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "생성 중…" : state.draft ? "다시 생성" : "초안 생성"}
          </Button>
          <Button variant="secondary" disabled={pending} onClick={() => setOpen(false)}>
            닫기
          </Button>
        </div>
      </form>

      {state.draft && <DraftEditor key={state.version} initial={state.draft} />}
    </div>
  );
}

function DraftEditor({ initial }: { initial: MinutesDraft }) {
  const [d, setD] = useState(initial);
  const [result, setResult] = useState<{ error?: string; url?: string }>({});
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof MinutesDraft>(k: K, v: MinutesDraft[K]) => setD((p) => ({ ...p, [k]: v }));
  const setDecision = (i: number, k: "label" | "text", v: string) =>
    set("decisions", d.decisions.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const setProject = (i: number, k: "progress" | "followUp" | "requirement", v: string) =>
    set("projects", d.projects.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  if (result.url) {
    return (
      <p className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-700">
        회의록을 드라이브에 저장하고 목록에 등록했습니다.{" "}
        <a href={result.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-navy-500 hover:underline">
          <ExternalLink size={14} strokeWidth={1.75} aria-hidden />
          열기
        </a>
      </p>
    );
  }

  const text = (id: string, label: string, k: "datetime" | "nextMeetingDate" | "attendees" | "absentees") => (
    <Field id={id} label={label}>
      <Input id={id} value={d[k]} onChange={(ev) => set(k, ev.target.value)} />
    </Field>
  );

  return (
    <section className="space-y-5 rounded-md border border-navy-100 bg-white p-5">
      <h3 className="text-sm font-semibold text-slate-900">초안 검토 · 수정</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        {text("dr-datetime", "일시", "datetime")}
        {text("dr-next", "다음 회의", "nextMeetingDate")}
      </div>
      <Field id="dr-conclusion" label="핵심 결론">
        <Textarea id="dr-conclusion" rows={2} value={d.keyConclusion} onChange={(ev) => set("keyConclusion", ev.target.value)} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        {text("dr-attend", "1. 참석 (쉼표로 구분 · 인원수 자동 계산)", "attendees")}
        {text("dr-absent", "불참 (없으면 비워 두기)", "absentees")}
      </div>
      <Field id="dr-remarks" label="특이사항">
        <Textarea id="dr-remarks" rows={2} value={d.remarks} onChange={(ev) => set("remarks", ev.target.value)} />
      </Field>

      <div>
        <p className="mb-1 text-xs font-medium text-slate-600">2. 핵심 결정사항</p>
        <div className="space-y-2">
          {d.decisions.map((x, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input className="w-24 shrink-0" value={x.label} placeholder="구분" aria-label={`결정사항 ${i + 1} 구분`} onChange={(ev) => setDecision(i, "label", ev.target.value)} />
              <Input value={x.text} placeholder="결정사항" aria-label={`결정사항 ${i + 1} 내용`} onChange={(ev) => setDecision(i, "text", ev.target.value)} />
              <Button variant="text" aria-label={`결정사항 ${i + 1} 삭제`} onClick={() => set("decisions", d.decisions.filter((_, j) => j !== i))}>
                <X size={16} aria-hidden />
              </Button>
            </div>
          ))}
          <Button variant="secondary" size="sm" onClick={() => set("decisions", [...d.decisions, { label: "", text: "" }])}>
            <Plus size={14} aria-hidden />
            결정사항 추가
          </Button>
        </div>
      </div>

      {d.projects.map((p, i) => (
        <fieldset key={p.project} className="space-y-3 border-t border-slate-100 pt-4">
          <legend className="text-sm font-semibold text-slate-900">{p.project}</legend>
          <Field id={`dr-p${i}-progress`} label="3. 진행 상황 및 피드백">
            <Textarea id={`dr-p${i}-progress`} rows={3} value={p.progress} onChange={(ev) => setProject(i, "progress", ev.target.value)} />
          </Field>
          <Field id={`dr-p${i}-follow`} label="4. 후속 액션 계획">
            <Textarea id={`dr-p${i}-follow`} rows={3} value={p.followUp} onChange={(ev) => setProject(i, "followUp", ev.target.value)} />
          </Field>
          <Field id={`dr-p${i}-req`} label="5. 추가 필요 및 요구 사항 (없으면 비워 두기)">
            <Textarea id={`dr-p${i}-req`} rows={2} value={p.requirement} onChange={(ev) => setProject(i, "requirement", ev.target.value)} />
          </Field>
        </fieldset>
      ))}

      {result.error && <p className="text-xs text-red-700">{result.error}</p>}
      <Button disabled={pending} onClick={() => startTransition(async () => setResult(await registerMinute(d)))}>
        {pending ? "등록 중…" : "이대로 등록"}
      </Button>
    </section>
  );
}
