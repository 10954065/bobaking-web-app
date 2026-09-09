import { describe, it, expect } from "vitest";
import { generateOtpCode, hashOtpCode } from "./customer-otp.service";

describe("generateOtpCode", () => {
  it("always returns a 6-digit numeric string", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateOtpCode();
      expect(code).toMatch(/^\d{6}$/);
    }
  });
});

describe("hashOtpCode", () => {
  it("is deterministic for the same phone and code", () => {
    expect(hashOtpCode("+233244123456", "123456")).toBe(hashOtpCode("+233244123456", "123456"));
  });

  it("differs when the code differs", () => {
    expect(hashOtpCode("+233244123456", "123456")).not.toBe(hashOtpCode("+233244123456", "654321"));
  });

  it("differs when the phone differs, even with the same code", () => {
    expect(hashOtpCode("+233244123456", "123456")).not.toBe(hashOtpCode("+233501234567", "123456"));
  });
});
