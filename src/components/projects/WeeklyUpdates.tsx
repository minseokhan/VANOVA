import { WeeklyUpdateForm, type WeeklyFormInitial } from "@/components/projects/WeeklyUpdateForm";
import { WeeklyUpdateViewer } from "@/components/projects/WeeklyUpdateViewer";
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
        <WeeklyUpdateViewer updates={updates} currentId={current?.id ?? null} />
      )}
    </div>
  );
}
