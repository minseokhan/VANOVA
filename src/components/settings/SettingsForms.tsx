"use client";

import type { Position, SkillLevel } from "@prisma/client";
import { useActionState, useRef } from "react";
import { changePassword, updateAccount, updateProfile, type FormState } from "@/app/(dashboard)/settings/actions";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useFormDirty } from "@/components/ui/useFormDirty";
import { useRetainOnError } from "@/components/ui/useRetainOnError";
import { LEVELS, LEVEL_HINT, LEVEL_LABEL, MAX_PROFILE } from "@/lib/profile/validation";
import { POSITIONS, POSITION_LABEL } from "@/lib/projects/labels";

function SaveRow({
  state,
  pending,
  noChange,
  label = "저장",
}: {
  state: FormState;
  pending: boolean;
  noChange: boolean;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "저장 중…" : label}
      </Button>
      {noChange && <span className="text-xs text-slate-500">변경된 내용이 없습니다</span>}
      {state.ok && <span className="text-xs text-green-700">저장되었습니다</span>}
      {state.error && <span className="text-xs text-red-700">{state.error}</span>}
    </div>
  );
}

export function AccountForm({ username, name, discordId }: { username: string; name: string; discordId: string | null }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateAccount, {});
  const { formRef, submit } = useRetainOnError(action, state);
  const { noChange, check, guard } = useFormDirty(formRef, state);
  const e = state.fieldErrors ?? {};
  return (
    <form ref={formRef} action={guard(submit)} onInput={check} onChange={check} className="space-y-4">
      <Field id="name" label="이름" error={e.name}>
        <Input id="name" name="name" defaultValue={name} maxLength={20} required />
      </Field>
      <Field id="username" label="아이디 (영문 소문자·숫자·_ 3~20자)" error={e.username}>
        <Input id="username" name="username" defaultValue={username} autoComplete="username" required />
      </Field>
      <Field id="discordId" label="디스코드 사용자 ID (선택 · 문의 답변 알림에서 언급용)" error={e.discordId}>
        <Input id="discordId" name="discordId" defaultValue={discordId ?? ""} inputMode="numeric" />
        <p className="mt-1 text-xs text-slate-500">디스코드 설정 → 고급 → 개발자 모드를 켜고, 내 프로필 우클릭 → 사용자 ID 복사</p>
      </Field>
      <SaveRow state={state} pending={pending} noChange={noChange} />
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(changePassword, {});
  const formRef = useRef<HTMLFormElement>(null);
  const { noChange, check, guard } = useFormDirty(formRef, state);
  const e = state.fieldErrors ?? {};
  return (
    <form ref={formRef} action={guard(action)} onInput={check} onChange={check} className="space-y-4">
      <Field id="current" label="현재 비밀번호" error={e.current}>
        <Input id="current" name="current" type="password" autoComplete="current-password" required />
      </Field>
      <Field id="next" label="새 비밀번호 (8자 이상)" error={e.next}>
        <Input id="next" name="next" type="password" autoComplete="new-password" required />
      </Field>
      <Field id="confirm" label="새 비밀번호 확인" error={e.confirm}>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      <SaveRow state={state} pending={pending} noChange={noChange} label="비밀번호 변경" />
    </form>
  );
}

export type ProfileValues = {
  level: SkillLevel | null;
  preferredPosition: Position | null;
  tools: string | null;
  skills: string | null;
  interests: string | null;
  bio: string | null;
};

export function ProfileForm({ values }: { values: ProfileValues }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateProfile, {});
  const { formRef, submit } = useRetainOnError(action, state);
  const { noChange, check, guard } = useFormDirty(formRef, state);
  const e = state.fieldErrors ?? {};
  return (
    <form ref={formRef} action={guard(submit)} onInput={check} onChange={check} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="level" label="지금 수준" error={e.level}>
          {/* React 는 select 의 defaultValue 를 마운트 때만 반영해서, 저장 후 폼 reset 이 처음 값으로 되돌린다.
              저장된 값이 바뀌면 key 로 다시 마운트해 새 값을 기본값으로 삼게 한다 */}
          <Select key={values.level ?? ""} id="level" name="level" defaultValue={values.level ?? ""}>
            <option value="">선택 안 함</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {LEVEL_LABEL[l]} — {LEVEL_HINT[l]}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="preferredPosition" label="선호 포지션" error={e.preferredPosition}>
          <Select key={values.preferredPosition ?? ""} id="preferredPosition" name="preferredPosition" defaultValue={values.preferredPosition ?? ""}>
            <option value="">선택 안 함</option>
            {POSITIONS.map((p) => (
              <option key={p} value={p}>
                {POSITION_LABEL[p]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field id="tools" label={`주요 사용 언어 · 툴/도구 (${MAX_PROFILE.tools}자 이하)`} error={e.tools}>
        <Input
          id="tools"
          name="tools"
          defaultValue={values.tools ?? ""}
          maxLength={MAX_PROFILE.tools}
          placeholder="예) Python, TypeScript / React, FastAPI, Figma, Git"
        />
      </Field>
      <Field id="skills" label={`구현할 수 있는 것 (${MAX_PROFILE.skills}자 이하)`} error={e.skills}>
        <Textarea
          id="skills"
          name="skills"
          defaultValue={values.skills ?? ""}
          maxLength={MAX_PROFILE.skills}
          placeholder="예) React로 CRUD 화면 구현, FastAPI로 REST API, 간단한 RAG 챗봇 구축"
        />
      </Field>
      <Field id="interests" label={`관심 분야 · 만들고 싶은 것 (${MAX_PROFILE.interests}자 이하)`} error={e.interests}>
        <Textarea
          id="interests"
          name="interests"
          defaultValue={values.interests ?? ""}
          maxLength={MAX_PROFILE.interests}
          placeholder="예) LLM 에이전트, 데이터 시각화, 교육용 서비스"
        />
      </Field>
      <Field id="bio" label={`소개 · 경험 · 레퍼런스 (${MAX_PROFILE.bio}자 이하)`} error={e.bio}>
        <Textarea
          id="bio"
          name="bio"
          defaultValue={values.bio ?? ""}
          maxLength={MAX_PROFILE.bio}
          className="min-h-40"
          placeholder="해 본 프로젝트, 참여했던 활동, 배우고 싶은 것 등을 자유롭게 적어 주세요"
        />
      </Field>
      <SaveRow state={state} pending={pending} noChange={noChange} />
    </form>
  );
}
