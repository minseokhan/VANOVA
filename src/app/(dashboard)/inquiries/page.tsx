import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { canDeleteInquiry, canEditInquiry, canModifyPost, canReplyInquiry, inquiryWhere, type InquiryScope } from "@/lib/inquiries/rules";
import { cn } from "@/lib/utils/cn";
import { InquiryCard } from "@/components/inquiries/InquiryCard";
import { InquiryForm } from "@/components/inquiries/InquiryForm";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";

const SCOPES: { key: InquiryScope; label: string }[] = [
  { key: "ALL", label: "전체" },
  { key: "MINE", label: "내 문의" },
  { key: "UNANSWERED", label: "미답변" },
];

export default async function InquiriesPage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const scope = SCOPES.some((s) => s.key === sp.scope) ? (sp.scope as InquiryScope) : "ALL";
  const isAdmin = user.role === "ADMIN";

  const [visible, unanswered] = await Promise.all([
    db.inquiry.findMany({
      where: inquiryWhere(scope, user.id),
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        author: { select: { name: true } },
        answeredBy: { select: { name: true } },
        replies: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true, role: true } } } },
      },
    }),
    db.inquiry.count({ where: { answer: null } }),
  ]);

  return (
    <>
      <PageHeader title="문의 · 건의" />
      <div className="space-y-6">
        <p className="text-sm text-slate-500">
          이 사이트 자체에 대한 문의, 개선 건의, 버그 제보를 남겨 주세요. 프로젝트 관련 질문은{" "}
          <Link href="/questions" className="text-navy-500 hover:underline">
            질문
          </Link>{" "}
          페이지를 이용하세요.
        </p>

        <InquiryForm />

        <div role="group" aria-label="범위" className="inline-flex rounded-md border border-slate-300">
          {SCOPES.map((s) => (
            <Link
              key={s.key}
              href={s.key === "ALL" ? "/inquiries" : `/inquiries?scope=${s.key}`}
              aria-current={scope === s.key ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors first:rounded-l-md last:rounded-r-md",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-500",
                scope === s.key ? "bg-navy-100 font-medium text-navy-700" : "text-slate-600 hover:bg-slate-50",
              )}
            >
              {s.label}
              {s.key === "UNANSWERED" && unanswered > 0 && <Badge tone="amber">{unanswered}</Badge>}
            </Link>
          ))}
        </div>

        {visible.length === 0 ? (
          <EmptyState message="표시할 문의가 없습니다" />
        ) : (
          <ul className="space-y-3">
            {visible.map((i) => (
              <InquiryCard
                key={i.id}
                isAdmin={isAdmin}
                canDelete={canDeleteInquiry(user, i)}
                canEdit={canEditInquiry(user, i)}
                canReply={canReplyInquiry(user, i)}
                item={{
                  id: i.id,
                  kind: i.kind,
                  authorName: i.author.name,
                  content: i.content,
                  createdAt: i.createdAt,
                  answer: i.answer,
                  answererName: i.answeredBy?.name ?? null,
                  answeredAt: i.answeredAt,
                  answerMine: canModifyPost(user, i.answeredById),
                  replies: i.replies.map((r) => ({
                    id: r.id,
                    authorName: r.author.name,
                    fromAdmin: r.author.role === "ADMIN",
                    mine: canModifyPost(user, r.authorId),
                    content: r.content,
                    createdAt: r.createdAt,
                  })),
                }}
              />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
