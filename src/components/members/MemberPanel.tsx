"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { deleteMember, getMemberDetail, setMemberLevel, setRole, type MemberDetail } from "@/app/(dashboard)/members/actions";
import { ProfileView } from "@/components/settings/ProfileView";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Select } from "@/components/ui/Select";
import { LEVELS, LEVEL_HINT, LEVEL_LABEL } from "@/lib/profile/validation";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/projects/labels";
import { formatDate } from "@/lib/utils/date";

const sectionTitle = "mb-3 border-l-2 border-navy-500 pl-2 text-sm font-semibold text-slate-900";

export function MemberPanel({
  userId,
  isSelf,
  adminCount,
  onClose,
}: {
  userId: string;
  isSelf: boolean;
  adminCount: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState<MemberDetail | null>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    getMemberDetail(userId)
      .then((d) => {
        setDetail(d);
        setMissing(d === null);
      })
      // 다른 운영진이 내 권한을 내렸으면 requireAdmin 이 throw 한다 — 로딩 상태로 굳지 않게 받는다
      .catch(() => {
        setMissing(true);
        setError("권한이 없거나 불러오지 못했습니다");
      });
  }, [userId]);

  useEffect(() => {
    setDetail(null);
    setError(null);
    load();
  }, [load]);

  useEffect(() => {
    // 삭제 확인 모달이 떠 있을 때의 Esc 는 모달만 닫는다
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !document.querySelector("dialog[open]") && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // 포커스가 뒤 표에 남아 있으면 Tab·Enter 가 가려진 행을 건드린다
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => opener?.focus();
  }, []);

  const run = (fn: () => Promise<{ error?: string }>) =>
    startSaving(async () => {
      let res: { error?: string };
      try {
        res = await fn();
      } catch {
        setError("권한이 없거나 저장하지 못했습니다"); // 던져진 에러가 에러 바운더리로 올라가지 않게
        return;
      }
      setError(res.error ?? null);
      if (!res.error) {
        load();
        router.refresh(); // 표의 역할·수준도 갱신
      }
    });

  const isAdmin = detail?.role === "ADMIN";
  const canDemote = !isSelf && adminCount > 1;

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="멤버 상세">
      <button type="button" aria-label="닫기" onClick={onClose} className="absolute inset-0 cursor-default bg-slate-900/20" />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex w-full max-w-3xl animate-[slide-in-right_200ms_ease-out] flex-col border-l border-slate-200 bg-white shadow-xl outline-none"
      >
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
          {detail ? (
            <>
              <Avatar name={detail.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{detail.name}</p>
                <p className="truncate text-xs text-slate-500">
                  {detail.username} · 가입 {formatDate(detail.createdAt)}
                </p>
              </div>
              <Badge tone={isAdmin ? "navy" : "neutral"}>{isAdmin ? "운영진" : "부원"}</Badge>
            </>
          ) : (
            <p className="flex-1 text-sm text-slate-500">{missing ? (error ?? "삭제된 멤버입니다") : "불러오는 중…"}</p>
          )}
          <Button variant="secondary" size="sm" onClick={onClose}>
            닫기
          </Button>
        </div>

        {detail && (
          <div className="flex-1 space-y-8 overflow-y-auto px-6 py-6">
            <section>
              <h2 className={sectionTitle}>운영진 · 수준 지정</h2>
              <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-2">
                  {isAdmin ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={saving || !canDemote}
                      onClick={() => run(() => setRole(detail.id, "MEMBER"))}
                    >
                      운영진 해제
                    </Button>
                  ) : (
                    <Button variant="secondary" size="sm" disabled={saving || isSelf} onClick={() => run(() => setRole(detail.id, "ADMIN"))}>
                      운영진 지정
                    </Button>
                  )}
                  {isSelf && <span className="text-xs text-slate-500">본인 계정입니다</span>}
                </div>
                <label htmlFor="panel-level" className="block text-xs font-medium text-slate-600">
                  수준 (운영진 판단 — 아래 본인 자기평가와 별도로 기록됩니다)
                </label>
                <Select
                  id="panel-level"
                  value={detail.adminLevel ?? ""}
                  disabled={saving}
                  onChange={(e) => run(() => setMemberLevel(detail.id, e.target.value))}
                >
                  <option value="">선택 안 함</option>
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {LEVEL_LABEL[l]} — {LEVEL_HINT[l]}
                    </option>
                  ))}
                </Select>
                {error && <p className="text-xs text-red-700">{error}</p>}
              </div>
            </section>

            <section>
              <h2 className={sectionTitle}>참여 프로젝트 ({detail.projects.length})</h2>
              {detail.projects.length === 0 ? (
                <p className="text-sm text-slate-400">배치된 프로젝트가 없습니다</p>
              ) : (
                <ul className="space-y-3">
                  {detail.projects.map((p) => (
                    <li key={p.id} className="rounded-md border border-slate-200 p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                        <Link href={`/projects/${p.id}`} className="truncate text-sm text-navy-500 hover:underline">
                          {p.code} {p.title}
                        </Link>
                      </div>
                      <ProgressBar value={p.progress} />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className={sectionTitle}>역량 프로필 (본인 작성)</h2>
              <ProfileView data={detail} />
            </section>

            {!isSelf && (
              <section className="border-t border-slate-200 pt-5">
                <ConfirmDialog
                  label="회원 삭제"
                  size="sm"
                  title="회원을 삭제할까요?"
                  message={`"${detail.name}" 계정과 이 회원이 작성한 주간 보고·질문·문의·비용 청구·공지, 올린 기획안·포트폴리오가 모두 삭제되며 되돌릴 수 없습니다.`}
                  confirmLabel="삭제"
                  onConfirm={async () => {
                    let res: { error?: string };
                    try {
                      res = await deleteMember(detail.id);
                    } catch {
                      res = { error: "권한이 없거나 삭제하지 못했습니다" };
                    }
                    if (res.error) return setError(res.error);
                    router.refresh();
                    onClose();
                  }}
                />
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
