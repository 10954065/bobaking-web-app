import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  AUTH_TRUST_HOST: z.string().optional(),

  // The one secret entry URL staff use to reach the sign-in page — see
  // proxy.ts. Everything under /admin, /pos, /kitchen, /rider, /account,
  // /login 404s for an unauthenticated visitor who doesn't come through
  // this path first, so the backend isn't discoverable by guessing common
  // paths. Shared across all staff logins (it only gates reaching the sign-in
  // form — the real per-user authorization is still full RBAC after that).
  STAFF_ACCESS_KEY: z.string().min(16, "STAFF_ACCESS_KEY must be at least 16 characters"),
  NEXTAUTH_URL: z.string().url().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DEFAULT_CURRENCY: z.string().default("GHS"),
  DEFAULT_TIMEZONE: z.string().default("Africa/Accra"),

  // Delivery maps & routing — see src/modules/delivery/providers/README.md.
  // Defaults point at OpenFreeMap (a free, no-API-key OSM vector tile
  // service — also self-hostable via their open-source tileserver) and the
  // public OSRM demo server, which explicitly asks not to be used for
  // production/commercial traffic (rate-limited, no SLA) — production must
  // override ROUTING_API_URL with a self-hosted or paid routing provider.
  NEXT_PUBLIC_MAP_STYLE_URL: z.string().url().default("https://tiles.openfreemap.org/styles/liberty"),
  ROUTING_API_URL: z.string().url().default("https://router.project-osrm.org"),

  // Absolute origin used to build redirect/callback URLs (payment gateway
  // return trip, etc.) — falls back to Vercel's own runtime var so this
  // needs no manual config on Vercel, only for other hosts/local dev.
  APP_URL: z.string().url().optional(),

  // Real Ghana Mobile Money gateway (MTN MoMo, Vodafone Cash, AirtelTigo,
  // routed through Paystack's hosted checkout). Optional: every payment
  // provider lookup falls back to MobileMoneyDevProvider until this is set,
  // so the app works unchanged today and "lights up" the moment a real key
  // is added — see providers/paystack.provider.ts.
  PAYSTACK_SECRET_KEY: z.string().optional(),

  // Real SMS delivery (Twilio REST API, called directly — no SDK
  // dependency). All three must be set together or none are used.
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),

  // Real email delivery (Resend REST API).
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM_ADDRESS: z.string().email().optional(),
});

type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

function loadEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

/**
 * Validated lazily, on first property access rather than at module import.
 * Next.js evaluates server modules during `next build`'s page-data
 * collection step even for routes nobody is requesting yet, and that can
 * happen before real runtime env vars exist — e.g. building a Docker image
 * where secrets are only injected at deploy/run time, not at build time.
 * Eagerly parsing here would fail the build itself; deferring the check to
 * the first actual read means it only ever runs at request time, when the
 * real environment is guaranteed to be present.
 */
export const env: Env = new Proxy({} as Env, {
  get(_target, prop: string | symbol) {
    return loadEnv()[prop as keyof Env];
  },
});
