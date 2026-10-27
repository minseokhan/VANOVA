import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { PageHeader } from "@/components/ui/PageHeader";
import { PortfolioLinks } from "@/components/settings/PortfolioLinks";
import { AccountForm, PasswordForm, ProfileForm } from "@/components/settings/SettingsForms";

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      {description && <p className="mt-1 mb-4 text-xs text-slate-500">{description}</p>}
      <div className={description ? undefined : "mt-4"}>{children}</div>
    </section>
  );
}

export default async function SettingsPage() {
  const me = await requireUser();
  const user = await db.user.findUnique({
    where: { id: me.id },
    select: {
      username: true,
      name: true,
      discordId: true,
      level: true,
      preferredPosition: true,
      tools: true,
      skills: true,
      interests: true,
      bio: true,
      profileLinks: { orderBy: { createdAt: "desc" }, select: { id: true, kind: true, title: true, url: true, createdAt: true } },
    },
  });
  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="개인 설정" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="계정">
          <AccountForm username={user.username} name={user.name} discordId={user.discordId} />
        </Section>
        <Section title="비밀번호 변경">
          <PasswordForm />
        </Section>
      </div>
      <Section
        title="역량 프로필"
        description="운영진이 프로젝트를 배치할 때 참고합니다. 부족한 부분도 솔직하게 적어 주세요."
      >
        <ProfileForm values={user} />
      </Section>
      <Section title="포트폴리오 · 이력서" description="포트폴리오 사이트, 노션, 깃허브 링크나 이력서 파일을 등록하세요.">
        <PortfolioLinks items={user.profileLinks} />
      </Section>
    </div>
  );
}
