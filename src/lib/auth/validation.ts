export type RegisterInput = { username: string; password: string; name: string };

export type RegisterResult = { ok: true } | { ok: false; errors: Partial<Record<keyof RegisterInput, string>> };

function usernameError(username: string): string | undefined {
  return /^[a-z0-9_]{3,20}$/.test(username) ? undefined : "아이디는 3~20자의 영문 소문자, 숫자, _만 사용할 수 있습니다";
}

function passwordError(password: string): string | undefined {
  return password.length >= 8 ? undefined : "비밀번호는 8자 이상이어야 합니다";
}

function nameError(name: string): string | undefined {
  const t = name.trim();
  return t.length >= 1 && t.length <= 20 ? undefined : "이름은 1~20자여야 합니다";
}

export function validateRegister(input: RegisterInput): RegisterResult {
  const errors: Partial<Record<keyof RegisterInput, string>> = {};
  const [u, p, n] = [usernameError(input.username), passwordError(input.password), nameError(input.name)];
  if (u) errors.username = u;
  if (p) errors.password = p;
  if (n) errors.name = n;
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true };
}

export type AccountInput = { username: string; name: string; discordId?: string };

export function validateAccount(input: AccountInput): { ok: true } | { ok: false; errors: Partial<Record<keyof AccountInput, string>> } {
  const errors: Partial<Record<keyof AccountInput, string>> = {};
  const u = usernameError(input.username);
  const n = nameError(input.name);
  if (u) errors.username = u;
  if (n) errors.name = n;
  // 디스코드 사용자 ID(스노우플레이크). 사용자명(@alice)과 헷갈리기 쉬워 숫자만 받는다
  if (input.discordId && !/^\d{17,20}$/.test(input.discordId)) errors.discordId = "디스코드 사용자 ID는 17~20자리 숫자입니다";
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true };
}

export type PasswordChangeInput = { current: string; next: string; confirm: string };

export function validatePasswordChange(
  input: PasswordChangeInput,
): { ok: true } | { ok: false; errors: Partial<Record<keyof PasswordChangeInput, string>> } {
  const errors: Partial<Record<keyof PasswordChangeInput, string>> = {};
  if (!input.current) errors.current = "현재 비밀번호를 입력하세요";
  const p = passwordError(input.next);
  if (p) errors.next = p;
  else if (input.next === input.current) errors.next = "현재 비밀번호와 다른 비밀번호를 입력하세요";
  if (input.confirm !== input.next) errors.confirm = "새 비밀번호가 일치하지 않습니다";
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true };
}
