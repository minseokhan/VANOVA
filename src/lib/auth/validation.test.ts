import { describe, expect, it } from "vitest";
import { validateAccount, validatePasswordChange, validateRegister } from "./validation";

const valid = { username: "alice_01", password: "password1", name: "앨리스" };

describe("validateRegister", () => {
  it("정상 입력은 ok", () => {
    expect(validateRegister(valid)).toEqual({ ok: true });
  });

  it("username: 3~20자, [a-z0-9_]만 허용", () => {
    for (const username of ["ab", "a".repeat(21), "Alice", "al ice", "al-ice", "한글아이디"]) {
      const r = validateRegister({ ...valid, username });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errors.username).toMatch(/아이디/);
    }
    expect(validateRegister({ ...valid, username: "abc" }).ok).toBe(true);
    expect(validateRegister({ ...valid, username: "a".repeat(20) }).ok).toBe(true);
  });

  it("password: 8자 이상", () => {
    const r = validateRegister({ ...valid, password: "1234567" });
    expect(r).toEqual({ ok: false, errors: { password: expect.stringMatching(/비밀번호/) } });
    expect(validateRegister({ ...valid, password: "12345678" }).ok).toBe(true);
  });

  it("name: trim 후 1~20자", () => {
    expect(validateRegister({ ...valid, name: "   " }).ok).toBe(false);
    expect(validateRegister({ ...valid, name: "가".repeat(21) }).ok).toBe(false);
    expect(validateRegister({ ...valid, name: "  앨리스  " }).ok).toBe(true);
  });

  it("여러 필드가 틀리면 필드별 에러를 모두 돌려준다", () => {
    const r = validateRegister({ username: "", password: "", name: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["name", "password", "username"]);
  });
});

describe("validateAccount", () => {
  it("아이디·이름 규칙은 가입과 같다", () => {
    expect(validateAccount({ username: "alice_01", name: "앨리스" })).toEqual({ ok: true });
    expect(validateAccount({ username: "Alice", name: "앨리스" }).ok).toBe(false);
    expect(validateAccount({ username: "alice_01", name: "   " }).ok).toBe(false);
  });

  it("틀린 필드만 에러로 돌려준다", () => {
    const r = validateAccount({ username: "A", name: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["name", "username"]);
  });

  it("디스코드 ID는 비워도 되고, 넣으면 17~20자리 숫자", () => {
    const base = { username: "alice_01", name: "앨리스" };
    expect(validateAccount({ ...base, discordId: "" })).toEqual({ ok: true });
    expect(validateAccount({ ...base, discordId: "123456789012345678" })).toEqual({ ok: true });
    for (const discordId of ["1234", "alice#1234", "@alice", "12345678901234567a"]) {
      const r = validateAccount({ ...base, discordId });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(Object.keys(r.errors)).toEqual(["discordId"]);
    }
  });
});

describe("validatePasswordChange", () => {
  const valid = { current: "oldpassword", next: "newpassword", confirm: "newpassword" };

  it("정상 입력은 ok", () => {
    expect(validatePasswordChange(valid)).toEqual({ ok: true });
  });

  it("현재 비밀번호는 비울 수 없다", () => {
    const r = validatePasswordChange({ ...valid, current: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.current).toBeTruthy();
  });

  it("새 비밀번호는 8자 이상", () => {
    const r = validatePasswordChange({ ...valid, next: "1234567", confirm: "1234567" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.next).toMatch(/비밀번호/);
  });

  it("현재와 같은 비밀번호는 거부", () => {
    const r = validatePasswordChange({ current: "oldpassword", next: "oldpassword", confirm: "oldpassword" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.next).toMatch(/현재/);
  });

  it("확인이 다르면 거부", () => {
    const r = validatePasswordChange({ ...valid, confirm: "different1" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.confirm).toMatch(/일치/);
  });
});
