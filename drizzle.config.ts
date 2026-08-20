import type { Config } from "drizzle-kit";

export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgres://jewelry:jewelry@localhost:5432/jewelry",
  },
  strict: true,
  verbose: true,
} satisfies Config;
