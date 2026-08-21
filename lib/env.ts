import { z } from "zod";

/**
 * Environment contract. Validated once at module load so a misconfigured
 * container fails loudly on boot instead of silently at the first request.
 *
 * Anything genuinely required to serve traffic is enforced in production only,
 * which keeps `next build` and local dev runnable with an empty .env.
 */

/**
 * `next build` runs with NODE_ENV=production but has no runtime secrets, so
 * enforcing there would break every Docker image build. Enforce only when we
 * are genuinely about to serve traffic.
 */
const isBuildPhase =
  process.env.NEXT_PHASE === "phase-production-build" ||
  process.env.SKIP_ENV_VALIDATION === "1";
const isProd = process.env.NODE_ENV === "production" && !isBuildPhase;

const requiredInProd = (label: string) =>
  isProd
    ? z.string().min(1, `${label} is required in production`)
    : z.string().min(1).optional();

const schema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),

    /** Canonical origin. Feeds sitemap, canonical URLs, OG tags and JSON-LD. */
    SITE_URL: z.string().url().default("http://localhost:3000"),

    /**
     * Postgres connection string. Required in production. In dev, leaving it
     * unset points the app at the local `npm run db:dev` server on :5433.
     */
    DATABASE_URL: requiredInProd("DATABASE_URL"),

    /** Object storage for photography (MinIO in prod, S3-compatible). */
    S3_ENDPOINT: z.string().url().optional(),
    S3_BUCKET: z.string().min(1).default("pieces"),
    S3_ACCESS_KEY_ID: z.string().min(1).optional(),
    S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    /** Public base URL images are served from; also drives next/image config. */
    S3_PUBLIC_URL: z.string().url().optional(),

    /** Auth. */
    AUTH_SECRET: requiredInProd("AUTH_SECRET"),

    /**
     * Pre-launch holding page. With this set, the storefront is replaced by
     * "coming soon" for everyone except a visitor who has been through
     * /preview, and the site is marked noindex so a crawler that arrives
     * early does not bank the holding page as the homepage.
     *
     * Off unless explicitly "1" — a launched site must never be one typo in
     * an unrelated variable away from going dark.
     */
    PREVIEW_MODE: z.enum(["0", "1"]).default("0"),
    /**
     * Optional. Unset, /preview alone opens the site — fine for keeping
     * passers-by out, useless against anyone who guesses the path. Set it and
     * the link becomes /preview?key=<token>, which is worth doing before the
     * domain is public anywhere.
     */
    PREVIEW_TOKEN: z.string().min(1).optional(),

    /** Payments — Stripe is the reference provider (US/USD). */
    STRIPE_SECRET_KEY: z.string().min(1).optional(),
    STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),

    /** Transactional email over SMTP. */
    SMTP_URL: z.string().optional(),
    MAIL_FROM: z.string().default("studio@example.com"),

    /**
     * Web Push (VAPID). Generate a pair with `npm run push:keys`.
     *
     * Optional on purpose: with these unset the chat still works end to end in
     * the browser, only the phone notifications go quiet. That keeps local
     * development runnable without minting keys, and means a missing key
     * degrades one feature instead of failing boot.
     *
     * The private key is a signing credential — treat it like AUTH_SECRET.
     */
    VAPID_PUBLIC_KEY: z.string().min(1).optional(),
    VAPID_PRIVATE_KEY: z.string().min(1).optional(),
    /** mailto: or https: contact, sent to push services per RFC 8292. */
    VAPID_SUBJECT: z.string().default("mailto:studio@example.com"),
  })
  .transform((env) => ({
    ...env,
    isProd: env.NODE_ENV === "production",
  }));

/**
 * An empty variable means "not set".
 *
 * Zod treats "" as a present value, so `.optional()` lets it through to
 * `.url()`, which rejects it, and `.default()` never fires. Deployment
 * platforms produce empty strings constantly: a Dockerfile's
 * `ENV FOO=${FOO}` with no --build-arg, a compose `env_file` line with
 * nothing after the `=`, a UI field saved blank. Every one of those means
 * absent, and none of them should fail a build.
 */
const present = Object.fromEntries(
  Object.entries(process.env).filter(([, value]) => value !== ""),
);

const parsed = schema.safeParse(present);

if (!parsed.success) {
  const detail = parsed.error.issues
    .map((i) => `  ${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("\n");
  throw new Error(`Invalid environment configuration:\n${detail}`);
}

export const env = parsed.data;
export type Env = typeof env;
