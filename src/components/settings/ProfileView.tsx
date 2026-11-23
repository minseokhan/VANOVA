import { FileText, Link2 } from "lucide-react";
import type { PlanDocKind, Position, SkillLevel } from "@prisma/client";
import { Badge } from "@/components/ui/Badge";
import { LEVEL_HINT, LEVEL_LABEL } from "@/lib/profile/validation";
import { POSITION_LABEL } from "@/lib/projects/labels";
import { formatDate } from "@/lib/utils/date";

export type ProfileViewData = {
  level: SkillLevel | null;
  preferredPosition: Position | null;
  tools: string | null;
  skills: string | null;
  interests: string | null;
  bio: string | null;
  profileLinks: { id: string; kind: PlanDocKind; title: string; url: string; createdAt: Date }[];
};

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-4 first:pt-0 last:pb-0 sm:grid sm:grid-cols-[9rem_1fr] sm:gap-4">
      <h3 className="mb-1.5 text-xs font-semibold text-slate-500 sm:mb-0 sm:pt-0.5">{title}</h3>
      <div>{children}</div>
    </div>
  );
}

const EMPTY = <p className="text-sm text-slate-400">작성하지 않았습니다</p>;

/** 운영진이 보는 읽기 전용 역량 프로필 */
export function ProfileView({ data }: { data: ProfileViewData }) {
  return (
    <div className="divide-y divide-slate-100 rounded-md border border-slate-200 px-4 py-4">
      <Block title="지금 수준">
        {data.level ? (
          <p className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
            <Badge tone="navy">{LEVEL_LABEL[data.level]}</Badge>
            {LEVEL_HINT[data.level]}
          </p>
        ) : (
          EMPTY
        )}
      </Block>
      <Block title="선호 포지션">
        {data.preferredPosition ? <Badge tone="navy">{POSITION_LABEL[data.preferredPosition]}</Badge> : EMPTY}
      </Block>
      <Block title="주요 사용 언어 · 툴/도구">
        {data.tools ? <p className="text-sm leading-relaxed text-slate-700">{data.tools}</p> : EMPTY}
      </Block>
      <Block title="구현할 수 있는 것">
        {data.skills ? <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{data.skills}</p> : EMPTY}
      </Block>
      <Block title="관심 분야 · 만들고 싶은 것">
        {data.interests ? <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{data.interests}</p> : EMPTY}
      </Block>
      <Block title="소개 · 경험 · 레퍼런스">
        {data.bio ? <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{data.bio}</p> : EMPTY}
      </Block>
      <Block title="포트폴리오 · 이력서">
        {data.profileLinks.length === 0 ? (
          <p className="text-sm text-slate-400">등록된 포트폴리오가 없습니다</p>
        ) : (
          <ul className="space-y-2">
            {data.profileLinks.map((d) => {
              const Icon = d.kind === "FILE" ? FileText : Link2;
              return (
                <li key={d.id} className="flex items-center gap-2 text-sm">
                  <Icon size={16} strokeWidth={1.75} aria-hidden className="shrink-0 text-slate-500" />
                  <a href={d.url} target="_blank" rel="noopener noreferrer" className="truncate text-navy-500 hover:underline">
                    {d.title}
                  </a>
                  <span className="text-xs text-slate-500">{formatDate(d.createdAt)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Block>
    </div>
  );
}
