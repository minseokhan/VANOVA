import { WeeklyAttachmentList } from "@/components/projects/WeeklyAttachmentList";
import { WeeklyUpdateForm, type WeeklyFormInitial } from "@/components/projects/WeeklyUpdateForm";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import type { WeeklyAttachment } from "@/lib/projects/info";
import { formatWeekLabel, getWeekStart, isCurrentWeek } from "@/lib/utils/week";

export type WeeklyUpdateItem = {
  id: string;
  weekStart: Date;
  authorName: string;
  didThisWeek: string;
  planNextWeek: string;
  issues: string | null;
  attachments: WeeklyAttachment[];
};

export type WeeklyDraftItem = WeeklyFormInitial & { updatedByName: string; updatedAt: Date };

function Entry({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-600">{label}</dt>
      <dd className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{text}</dd>
    </div>
  );
}

export function WeeklyUpdates({
  projectId,
  canEdit,
  updates,
  draft,
}: {
  projectId: string;
  canEdit: boolean;
  updates: WeeklyUpdateItem[];
  draft: WeeklyDraftItem | null;
}) {
  const current = updates.find((u) => isCurrentWeek(u.weekStart)) ?? null;
  return (
    <div className="space-y-4">
      {canEdit && (
        <WeeklyUpdateForm
          projectId={projectId}
          weekLabel={formatWeekLabel(getWeekStart(new Date()))}
          initial={
            draft ??
            (current && {
              didThisWeek: current.didThisWeek,
              planNextWeek: current.planNextWeek,
              issues: current.issues ?? undefined,
              attachments: current.attachments,
            })
          }
          submitted={current !== null}
          draft={draft && { by: draft.updatedByName, at: draft.updatedAt }}
        />
      )}
      {updates.length === 0 ? (
        <EmptyState message="아직 주간 보고가 없습니다" />
      ) : (
        <ol className="space-y-3">
          {updates.map((w) => (
            <li key={w.id} className="rounded-md border border-slate-200 p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-medium">{formatWeekLabel(w.weekStart)}</span>
                <span>· {w.authorName}</span>
                {isCurrentWeek(w.weekStart) && <Badge tone="navy">이번 주</Badge>}
              </div>
              <dl className="space-y-2">
                <Entry label="이번 주 한 일" text={w.didThisWeek} />
                <Entry label="다음 주 계획" text={w.planNextWeek} />
                {w.issues && <Entry label="이슈 · 막힌 점" text={w.issues} />}
              </dl>
              {w.attachments.length > 0 && (
                <div className="mt-3">
                  <WeeklyAttachmentList items={w.attachments} />
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
