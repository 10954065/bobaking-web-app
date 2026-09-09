import { describe, it, expect } from "vitest";
import { normalizeGhanaPhone, ghanaPhoneSchema } from "./phone";

describe("normalizeGhanaPhone", () => {
  it("normalizes a local 0-prefixed number", () => {
    expect(normalizeGhanaPhone("0244123456")).toBe("+233244123456");
  });

  it("normalizes an already-canonical +233 number", () => {
    expect(normalizeGhanaPhone("+233244123456")).toBe("+233244123456");
  });

  it("normalizes a 00233-prefixed number", () => {
    expect(normalizeGhanaPhone("00233244123456")).toBe("+233244123456");
  });

  it("normalizes a bare 233-prefixed number", () => {
    expect(normalizeGhanaPhone("233244123456")).toBe("+233244123456");
  });

  it("normalizes a bare 9-digit national number", () => {
    expect(normalizeGhanaPhone("244123456")).toBe("+233244123456");
  });

  it("strips spaces and dashes before normalizing", () => {
    expect(normalizeGhanaPhone("024 412-3456")).toBe("+233244123456");
  });

  it("accepts a 5x-prefixed (Vodafone) number", () => {
    expect(normalizeGhanaPhone("0501234567")).toBe("+233501234567");
  });

  it("rejects a number that is too short", () => {
    expect(normalizeGhanaPhone("024412345")).toBeNull();
  });

  it("rejects a number that is too long", () => {
    expect(normalizeGhanaPhone("02441234567")).toBeNull();
  });

  it("rejects a national number not starting with 2 or 5", () => {
    expect(normalizeGhanaPhone("0344123456")).toBeNull();
  });

  it("rejects a non-Ghana country code", () => {
    expect(normalizeGhanaPhone("+14155552671")).toBeNull();
  });

  it("rejects garbage input", () => {
    expect(normalizeGhanaPhone("not a phone number")).toBeNull();
  });
});

describe("ghanaPhoneSchema", () => {
  it("parses and canonicalizes a valid local number", () => {
    const result = ghanaPhoneSchema.safeParse("0244123456");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("+233244123456");
  });

  it("fails on an invalid number", () => {
    const result = ghanaPhoneSchema.safeParse("12345");
    expect(result.success).toBe(false);
  });
});
