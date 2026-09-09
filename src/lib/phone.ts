import { z } from "zod";

/**
 * Accepts the common shapes a customer might type — 0244123456,
 * 244123456, +233244123456, 00233244123456, with spaces/dashes — and
 * returns the canonical "+233XXXXXXXXX" form, or null if it isn't a
 * valid Ghanaian mobile number. Canonicalizing (not just validating)
 * matters: the storefront and OTP login both look customers up by exact
 * phone string, so without one canonical form the same person typing
 * "0244123456" one visit and "+233244123456" the next would silently
 * become two different customers/accounts.
 */
export function normalizeGhanaPhone(raw: string): string | null {
  const cleaned = raw.replace(/[^\d+]/g, "");

  let national: string | null = null;
  if (cleaned.startsWith("+233")) {
    national = cleaned.slice(4);
  } else if (cleaned.startsWith("00233")) {
    national = cleaned.slice(5);
  } else if (cleaned.startsWith("233") && cleaned.length === 12) {
    national = cleaned.slice(3);
  } else if (cleaned.startsWith("0") && cleaned.length === 10) {
    national = cleaned.slice(1);
  } else if (cleaned.length === 9) {
    national = cleaned;
  }

  if (!national) return null;
  // Ghanaian mobile numbers: 9 digits after the country code, starting
  // with 2 or 5 (MTN/Vodafone/AirtelTigo all fall under 02x/05x locally).
  if (!/^[25]\d{8}$/.test(national)) return null;

  return `+233${national}`;
}

export const GHANA_PHONE_FORMAT_HINT = "+233XXXXXXXXX";

/** Validates and canonicalizes to "+233XXXXXXXXX" — use for any phone field a customer submits. */
export const ghanaPhoneSchema = z
  .string()
  .transform((raw, ctx) => {
    const normalized = normalizeGhanaPhone(raw);
    if (!normalized) {
      ctx.addIssue({ code: "custom", message: `Enter a valid Ghana phone number, e.g. ${GHANA_PHONE_FORMAT_HINT}.` });
      return z.NEVER;
    }
    return normalized;
  });
