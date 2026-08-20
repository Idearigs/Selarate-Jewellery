import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { Sql as PostgresClient } from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

/**
 * Production runs against a real Postgres container (postgres-js).
 *
 * Local development, where neither Docker nor Postgres may be installed, falls
 * back to PGlite — real Postgres compiled to WASM, running in this process.
 * Same dialect, same migrations, same schema, zero setup.
 *
 * ── The one rule for the embedded database ────────────────────────────────
 * `.pglite` is a single-owner data directory. Whichever process opens it owns
 * it. Do NOT run `npm run db:seed` while `npm run dev` is running — two
 * processes on one directory aborts the WASM runtime
 * ("Aborted(). Build with -sASSERTIONS"). The dev server seeds itself on first
 * boot, so you should never need to.
 *
 * Both drivers expose an identical query builder, so we surface a single
 * concrete type; a union would collapse the builder's overloads and break
 * `.returning()` at every call site.
 */
export type Db = PostgresJsDatabase<typeof schema>;

async function createPostgres(): Promise<Db> {
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const postgres = (await import("postgres")).default;
  const client = postgres(env.DATABASE_URL!, { max: 10 });
  const db = drizzle(client, { schema });

  if (process.env.MIGRATE_ON_BOOT !== "0") await migrateOnBoot(db, client);

  return db;
}

/**
 * Run pending migrations when the server starts.
 *
 * Platforms that build and run a Dockerfile for you — Coolify, Railway, Render
 * — have no equivalent of the one-shot `migrate` service in
 * docker/docker-compose.yml, so without this the schema is simply never
 * created and every page 500s against an empty database.
 *
 * The advisory lock is what makes this safe to do on boot. Two containers
 * starting together would otherwise both try to apply the same migration; the
 * second would fail on an object that already exists and crash-loop. A session
 * lock on a fixed key serialises them: the first migrates, the second waits and
 * then finds nothing to do. The key is arbitrary but must never change.
 *
 * Set MIGRATE_ON_BOOT=0 to opt out where migrations run as their own deploy
 * step, which is the better arrangement once there is more than one instance.
 */
async function migrateOnBoot(db: Db, client: PostgresClient) {
  // A plain number, not a bigint literal: the driver binds this as int8 and
  // the value sits inside Number.MAX_SAFE_INTEGER.
  const LOCK_KEY = 8_147_213_905_442_117;

  try {
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    await client`select pg_advisory_lock(${LOCK_KEY})`;
    try {
      await migrate(db, { migrationsFolder: "./drizzle" });
    } finally {
      await client`select pg_advisory_unlock(${LOCK_KEY})`;
    }
  } catch (error) {
    /* Loudly, then rethrow. A server that starts against a schema it does not
       understand is worse than one that refuses to start: the healthcheck
       would pass and it would take live traffic. */
    console.error("[db] migration on boot failed:", error);
    throw error;
  }
}

/**
 * PGlite is a single WASM instance and is NOT safe to query concurrently —
 * overlapping calls abort the runtime. A Next dev server does exactly that: a
 * page render and a route handler run at the same time. So every call is
 * funnelled through a promise chain.
 *
 * Only top-level client methods are wrapped; the transaction object PGlite
 * hands back is already exclusive, so inner queries bypass the queue and
 * cannot deadlock. Real Postgres needs none of this.
 */
function serializeClient<T extends object>(client: T): T {
  const GUARDED = new Set(["query", "exec", "transaction"]);
  let chain: Promise<unknown> = Promise.resolve();

  return new Proxy(client, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function") return value;
      if (!GUARDED.has(String(prop))) return value.bind(target);

      return (...args: unknown[]) => {
        const run = chain.then(() => value.apply(target, args));
        chain = run.then(
          () => undefined,
          () => undefined,
        );
        return run;
      };
    },
  });
}

async function createPglite(): Promise<Db> {
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const { PGlite } = await import("@electric-sql/pglite");

  /**
   * `next build` fans page generation out across processes, and a file-backed
   * PGlite cannot be opened twice. Builds only ever READ the catalogue, so each
   * build process gets its own in-memory database seeded from the same fixture
   * — identical output, no shared file, no contention.
   *
   * The dev server keeps the persisted directory so carts and holds survive
   * across requests.
   */
  const isBuild = process.env.NEXT_PHASE === "phase-production-build";

  let raw;
  try {
    raw = await PGlite.create(isBuild ? {} : { dataDir: "./.pglite" });
  } catch (cause) {
    // A raw "Aborted()" from WASM tells you nothing. This almost always means
    // the directory is already open in another process, or was left corrupt by
    // a hard kill mid-write.
    throw new Error(
      "Could not open the embedded dev database (./.pglite).\n" +
        "  • Is another process using it? Only one may — stop any other `npm run dev`,\n" +
        "    and never run `npm run db:seed` while the dev server is running.\n" +
        "  • Otherwise it is corrupt: stop everything, delete ./.pglite and restart.\n" +
        "    It will migrate and re-seed itself.\n" +
        "  • Or set DATABASE_URL to use a real Postgres.",
      { cause },
    );
  }

  const client = serializeClient(raw);
  const db = drizzle(client, { schema });

  // The embedded database has no deploy step, so migrate on connect. Drizzle
  // tracks what has already run, making this a no-op after the first boot.
  await migrate(db, { migrationsFolder: "./drizzle" });

  // Seed on first boot so `npm run dev` alone gives a working catalogue, and
  // so nobody has to run the seed script against a directory the dev server
  // already owns.
  const existing = await db.query.piece.findFirst({ columns: { id: true } });
  if (!existing) {
    const { seed } = await import("./seed");
    await seed(db as unknown as Db);
  }

  return db as unknown as Db;
}

// Cached across hot reloads; Next re-evaluates modules on every edit in dev.
const globalForDb = globalThis as unknown as { __db?: Promise<Db> };

export function getDb(): Promise<Db> {
  globalForDb.__db ??= env.DATABASE_URL ? createPostgres() : createPglite();
  return globalForDb.__db;
}

export { schema };
