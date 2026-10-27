# 프로젝트: VANOVA (VAN AI 혁신부 업무 대시보드)

VAN 학회 AI 혁신부 운영진·부원이 프로젝트 배치, 진행 상황, 주간 보고, 기획 질문을 한곳에서 관리하는 웹 대시보드.

## 기술 스택
- Next.js 15 (App Router) + React 19
- TypeScript strict mode
- Tailwind CSS v4 (테마 토큰은 `src/app/globals.css`의 `@theme`에 정의)
- Prisma + PostgreSQL (Vercel 배포, Neon/Supabase)
- 인증: 자체 ID/PW. bcryptjs 해시 + jose JWT httpOnly 쿠키
- 파일: @vercel/blob (기획안 업로드)
- 드래그 배치: @dnd-kit/core
- 테스트: vitest

## 아키텍처 규칙
- CRITICAL: 비즈니스 로직(권한 판단, 진행률 계산, 디스코드 메시지 조립, 입력 검증)은 `src/lib/`에 순수 함수로 두고 테스트를 먼저 작성한다. Server Action과 Route Handler는 lib 함수를 호출하는 얇은 껍데기여야 한다.
- CRITICAL: 모든 데이터 변경은 Server Action(`src/app/**/actions.ts`) 또는 Route Handler(`src/app/api/**`)에서만 수행한다. 클라이언트 컴포넌트가 Prisma·외부 API를 직접 호출하지 않는다.
- CRITICAL: 모든 Server Action은 첫 줄에서 `requireUser()` / `requireAdmin()`으로 세션과 권한을 확인한다. UI에서 버튼을 숨기는 것은 권한 검사가 아니다.
- CRITICAL: 비밀번호는 평문으로 저장·로그하지 않는다. JWT 시크릿·디스코드 웹훅·DB URL은 환경변수로만 읽는다.
- Prisma 클라이언트는 `src/lib/db.ts` 싱글턴만 사용한다.
- Server Component 기본. `"use client"`는 상호작용(폼, 드래그, 토글)이 필요한 말단 컴포넌트에만 붙인다.
- 컴포넌트는 `src/components/`, 타입은 Prisma 생성 타입을 우선 사용하고 추가 타입만 `src/types/`에 둔다.
- 디자인은 `docs/UI_GUIDE.md`를 따른다. 흰 바탕 + 남색 포인트. 보라색·글래스모피즘·그라데이션 텍스트 금지.

## 개발 프로세스
- CRITICAL: `src/lib/` 아래 새 모듈은 반드시 테스트(`*.test.ts`)를 먼저 작성하고, 통과하는 구현을 작성한다 (TDD). `.claude/hooks/tdd-guard.sh`가 이를 강제한다.
- 커밋 메시지는 conventional commits 형식 (feat:, fix:, docs:, refactor:, chore:).
- 사용자 개입이 필요한 항목(DB URL, Blob 토큰, 디스코드 웹훅 등)은 step을 `blocked` 처리하고 즉시 중단한다.
- Stop 훅의 검증 빌드는 `NEXT_DIST_DIR=.next-check`로 실행한다. `npm run build`를 `.next`에 직접 돌리면 실행 중인 dev 서버가 500/무스타일로 깨진다. 여러 세션이 동시에 작업할 때는 `git worktree`로 체크아웃을 분리한다.
- CRITICAL: 스키마를 바꿨으면 **dev 서버를 재시작해야 한다.** `prisma generate`는 `node_modules`의 클라이언트만 새로 쓰고, 실행 중인 서버는 시작할 때 require한 옛 모듈을 들고 있다. `src/lib/db.ts`가 인스턴스를 `globalThis`에 캐시하므로 HMR로도 교체되지 않는다. 증상은 코드 오타처럼 보이는 `Cannot read properties of undefined (reading 'findUnique')`다. 절차: `prisma migrate dev` → `prisma generate` → **dev 서버 재시작** → 실제 페이지 200 확인. `.claude/hooks/prisma-stale-guard.sh`(Stop 훅)가 턴 종료 시 생성 클라이언트 mtime과 서버 시작 시각을 비교해 낡았으면 자동 재시작한다.
- CRITICAL: 여러 세션이 같은 `node_modules`를 공유하면 Prisma 클라이언트는 **마지막으로 generate한 브랜치의 스키마**만 반영한다. 다른 worktree에서 `tsc`가 내 브랜치 모델을 모른다고 하면 내 코드 문제가 아니다. 이때 내 스키마로 재생성하면 반대쪽 세션이 깨지므로, 재생성 대신 lint로 확인하고 오류가 전부 Prisma 접근부인지만 확인한 뒤 넘어간다.

## 하네스 실행 규칙
- 각 step은 `phases/<phase>/step<N>.md`에 명시된 작업만 수행하고, 요청되지 않은 기능/파일을 만들지 않는다.
- AC를 직접 실행해 검증한 뒤 `phases/<phase>/index.json`의 step status를 갱신한다.
- step은 이 세션의 Claude가 직접 수행한다. `scripts/execute.py`는 `claude -p`로 자동 실행할 때만 쓴다.

## 명령어
npm run dev        # 개발 서버
npm run build      # 프로덕션 빌드
npm run lint       # ESLint
npm run test       # vitest
npx prisma migrate dev   # 마이그레이션
npx prisma db seed       # 시드 (운영진 계정 + 20개 프로젝트)

## 하네스
python3 scripts/execute.py <phase-dir> [--push]   # phase의 step을 순차 실행 (claude -p 호출)
python3 -m pytest scripts/test_execute.py         # 하네스 테스트

## Git / 이슈 워크플로우
- 원격: https://github.com/minseokhan/VANOVA
- Linear: https://linear.app/ai-agent-study/team/V/overview (팀 키 `V`, 팀명 VAN_AI_INNOVATION_WORK_DASHBOARD)
- 브랜치: `main`(배포) ← `dev`(통합) ← `feat/V-<번호>-<slug>`(기능). 기능 브랜치는 항상 `dev`에서 분기한다.
- CRITICAL: 기능 단위 작업은 사용자가 요청하지 않아도 Claude가 먼저 아래 전체 사이클을 **한 번에** 제안하고 실행한다. 단계별로 따로 물어보지 않는다.
  1. Linear에서 다음 이슈를 가져와(`V-<번호>`) 내용을 확인한다.
  2. GitHub 이슈를 생성한다 (제목: `[V-<번호>] <이슈 제목>`, 본문에 Linear 링크).
  3. `dev`에서 `feat/V-<번호>-<slug>` 브랜치를 만든다.
  4. TDD로 구현하고 conventional commit으로 커밋한다.
  5. `dev`를 base로 PR을 생성한다 (본문에 `Closes #<GitHub 이슈번호>` + Linear 링크). Linear 이슈는 In Review로 옮긴다.
  6. **여기서 멈추고 사용자의 PR 승인을 기다린다.**
  7. 승인되면: PR을 `dev`에 머지(squash) → GitHub 이슈 닫기 → 원격·로컬 기능 브랜치 삭제 → Linear 이슈 Done 처리.
- CRITICAL: `dev` → `main` 머지는 사용자가 명시적으로 요청할 때만 한다. 자동으로 하지 않는다.
- `main`·`dev`에 직접 커밋하지 않는다. 항상 기능 브랜치 + PR을 거친다.
