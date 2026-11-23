#!/bin/bash
# PreToolUse[Bash] — DB를 비우거나 지울 수 있는 명령, 운영 DB에 닿는 명령은 실행 전에 사용자 확인을 받는다.
# 2026-11-23: `prisma migrate diff --shadow-database-url "$(... | sed ...)"`에서 sed 치환이 macOS에서 무효가 되어
# 섀도 DB 주소가 실제 로컬 DB와 같아졌고, Prisma가 섀도 DB를 초기화하면서 로컬 데이터가 전부 지워졌다.
# "diff"처럼 무해해 보이는 명령도 섀도 DB 주소를 받으면 그 DB를 리셋한다.
# SQL 키워드는 대문자로만 잡는다 — 소문자까지 잡으면 CSS 클래스 `truncate` 같은 코드 본문에 오탐한다.
INPUT=$(cat)
CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty')

ask() {
  jq -nc --arg r "$1" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"ask",permissionDecisionReason:$r}}'
  exit 0
}

# 운영 DB(Supabase)·운영 환경변수에 닿는 명령
if printf '%s' "$CMD" | grep -qE -e 'pooler\.supabase\.com|supabase\.co|:6543|vercel[[:space:]]+env[[:space:]]+pull|--environment=production'; then
  ask "운영 DB 또는 운영 환경변수에 접근하는 명령입니다. 운영 DB를 건드려도 되는지 사용자에게 확인하세요."
fi

# 데이터를 지울 수 있는 Prisma 옵션
if printf '%s' "$CMD" | grep -qE -e '--shadow-database-url|migrate[[:space:]]+reset|--force-reset|--accept-data-loss|db[[:space:]]+execute'; then
  ask "DB 데이터를 지울 수 있는 Prisma 명령입니다(섀도 DB 주소·reset·data-loss·db execute). 대상 DB 주소를 확인한 뒤 승인하세요."
fi

# 데이터를 지우는 SQL (대문자만)
if printf '%s' "$CMD" | grep -qE -e '\bTRUNCATE\b|DROP[[:space:]]+(SCHEMA|DATABASE|TYPE)|DELETE[[:space:]]+FROM|\bdropdb\b'; then
  ask "DB 데이터를 지우는 SQL입니다(TRUNCATE·DROP·DELETE FROM). 대상 DB 주소를 확인한 뒤 승인하세요."
fi
exit 0
