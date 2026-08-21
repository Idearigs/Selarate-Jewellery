import { sql } from "drizzle-orm";
import type { Db } from "./index";
import { piece, user } from "./schema";
import { env } from "@/lib/env";

/**
 * First-run setup for a database that migrations alone cannot finish.
 *
 * Migrations create the schema; they do not put a catalogue in it or give
 * anyone a way to sign in. On a platform that builds the Dockerfile for us
 * there is no step to run those by hand — and the runtime image is a
 * `standalone` build with no tsx and no dev dependencies, so `npm run db:seed`
 * cannot run inside the container either. Without this, a fresh deploy comes
 * up serving an empty shop that nobody can log in to fix.
 *
 * Both halves are strictly first-run:
 *
 *   • the catalogue is only seeded when `piece` is EMPTY, so a later deploy
 *     can never overwrite real products or resurrect ones the studio deleted
 *   • the owner account is only created when `user` is EMPTY, so rotating
 *     ADMIN_PASSWORD does not silently reset a live account, and removing the
 *     variables later changes nothing
 *
 * Every step is best-effort: a failure here is logged and swallowed. The
 * schema is already correct at this point, so a shop that boots without demo
 * data is recoverable from the admin, whereas a server that refuses to start
 * is not.
 */
export async function bootstrap(db: Db) {
  await seedCatalogue(db);
  await createFirstOwner(db);
}

async function isEmpty(db: Db, table: typeof piece | typeof user) {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(table)
    .limit(1);
  return (row?.n ?? 0) === 0;
}

async function seedCatalogue(db: Db) {
  // Opt-in. The seed is demo photography and invented reference numbers, and
  // silently inserting that into a shop someone is about to launch is worse
  // than leaving it empty.
  if (env.SEED_ON_BOOT !== "1") return;

  try {
    if (!(await isEmpty(db, piece))) return;

    const { seed } = await import("./seed");
    await seed(db);
    console.log("[db] seeded the catalogue (piece table was empty)");
  } catch (error) {
    console.error("[db] catalogue seed failed:", error);
  }
}

async function createFirstOwner(db: Db) {
  const email = env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = env.ADMIN_PASSWORD;
  if (!email || !password) return;

  try {
    if (!(await isEmpty(db, user))) return;

    const { hashPassword } = await import("@/lib/auth");

    await db.insert(user).values({
      email,
      name: env.ADMIN_NAME ?? "Studio",
      role: "owner",
      passwordHash: await hashPassword(password),
    });

    console.log(
      `[db] created the first owner account (${email}). ` +
        "Change the password from the admin, then remove ADMIN_PASSWORD.",
    );
  } catch (error) {
    console.error("[db] owner bootstrap failed:", error);
  }
}
