import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { summarize } from "@/lib/attendance/rules";
import { formatDate } from "@/lib/utils/date";
import { CheckEventCard } from "@/components/attendance/CheckEventCard";
import { CheckEventForm } from "@/components/attendance/CheckEventForm";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";

const th = "px-3 py-2 text-left text-xs font-medium text-slate-600";

export default async function AttendancePage() {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof Error && e.message === "FORBIDDEN") redirect("/");
    throw e;
  }
  const today = formatDate(new Date());
  const [members, rows] = await Promise.all([
    db.user.findMany({ where: { role: "MEMBER", approved: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    // ponytail: 기록 전체를 읽는다. 수백 건이 넘어가면 기간 필터를 붙일 것
    db.checkEvent.findMany({
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      select: {
        id: true, kind: true, title: true, date: true,
        entries: { select: { userId: true, done: true, user: { select: { name: true } } }, orderBy: { user: { name: "asc" } } },
      },
    }),
  ]);
  const events = rows.map((e) => ({
    ...e,
    date: formatDate(e.date),
    entries: e.entries.map((x) => ({ userId: x.userId, name: x.user.name, done: x.done })),
  }));
  const summary = summarize(members.map((m) => m.id), events, today);

  return (
    <div className="space-y-8">
      <PageHeader title="출석 · 참여" />
      <CheckEventForm today={today} />

      <section>
        <h2 className="mb-3 border-l-2 border-navy-500 pl-2 text-sm font-semibold text-slate-900">멤버별 현황</h2>
        {members.length === 0 ? (
          <EmptyState message="승인된 부원이 없습니다" />
        ) : (
          <div className="overflow-x-auto rounded-md border border-slate-200">
            <table className="w-full min-w-[640px] table-fixed">
              <colgroup>
                <col className="w-48" />
                <col className="w-32" />
                <col />
              </colgroup>
              <thead className="bg-navy-50">
                <tr>
                  <th className={`${th} pl-5`}>이름</th>
                  <th className={th}>회의 출석</th>
                  <th className={`${th} pr-5`}>불참 회의 · 미참여 투표/과제</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const s = summary[m.id];
                  return (
                    <tr key={m.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 pr-3 pl-5">
                        <span className="flex min-w-0 items-center gap-3 text-sm text-slate-900">
                          <Avatar name={m.name} />
                          <span className="truncate">{m.name}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2 text-sm text-slate-700 tabular-nums">
                        {s.meetings === 0 ? <span className="text-slate-400">-</span> : `${s.attended} / ${s.meetings}`}
                      </td>
                      <td className="py-2 pr-5 pl-3">
                        {s.missed.length === 0 ? (
                          <span className="text-xs text-slate-400">없음</span>
                        ) : (
                          <span className="flex flex-wrap gap-1.5">
                            {s.missed.map((e) => (
                              <Badge key={e.id} tone="red" title={e.date}>
                                {e.kind === "MEETING" ? `회의 ${e.date.slice(5).replace("-", "/")}` : e.title}
                              </Badge>
                            ))}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 border-l-2 border-navy-500 pl-2 text-sm font-semibold text-slate-900">기록 ({events.length})</h2>
        {events.length === 0 ? (
          <EmptyState message="아직 기록이 없습니다. 회의나 투표·과제가 있을 때 '새 기록'으로 만드세요" />
        ) : (
          <div className="space-y-3">
            {events.map((e) => (
              <CheckEventCard key={e.id} event={e} today={today} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
