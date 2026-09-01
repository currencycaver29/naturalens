import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateOtp, hashOtp, timingSafeEqual } from "./crypto.ts";
import { isValidEmail, parseDisplayName } from "./http.ts";

describe("otp crypto", () => {
  it("emits six digits", () => {
    const code = generateOtp();
    assert.match(code, /^\d{6}$/);
  });

  it("hashes the same email and code the same way", async () => {
    const a = await hashOtp("pepper", "you@field.org", "123456");
    const b = await hashOtp("pepper", "you@field.org", "123456");
    assert.equal(a, b);
    assert.equal(a.length, 64);
  });

  it("does not treat a different code as equal", async () => {
    const a = await hashOtp("pepper", "you@field.org", "123456");
    const b = await hashOtp("pepper", "you@field.org", "123457");
    assert.equal(timingSafeEqual(a, b), false);
  });
});

describe("fields", () => {
  it("accepts the same addresses as the waitlist", () => {
    assert.equal(isValidEmail("you@field.org"), true);
    assert.equal(isValidEmail("not-an-email"), false);
    assert.equal(isValidEmail("a".repeat(251) + "@x.y"), false);
  });

  it("trims display names and rejects overlong ones", () => {
    assert.deepEqual(parseDisplayName("  Abhay  Sharma  "), { ok: true, name: "Abhay Sharma" });
    assert.deepEqual(parseDisplayName("   "), { ok: true, name: null });
    assert.equal(parseDisplayName("x".repeat(81)).ok, false);
  });
});
