/**
 * Create or update a studio admin user.
 *
 * There is deliberately no sign-up page: the studio has an owner and one or two
 * staff, and an open registration form on a back office is a liability.
 * Accounts are provisioned from the command line.
 *
 *   npm run user -- owner@studio.com "The Designer" owner
 *
 * The password is read from stdin so it never lands in shell history.
 */
import { createInterface } from "node:readline/promises";
import { getDb } from "../lib/db";
import { user } from "../lib/db/schema";
import { hashPassword } from "../lib/auth";

const [email, name, role = "owner"] = process.argv.slice(2);

if (!email || !name) {
  console.error(
    'Usage: npm run user -- <email> "<name>" [owner|admin|limited]',
  );
  process.exit(1);
}

if (!["owner", "admin", "limited"].includes(role)) {
  console.error(`Unknown role "${role}". Use owner, admin or limited.`);
  process.exit(1);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const password = await rl.question(`Password for ${email}: `);
rl.close();

if (password.length < 12) {
  console.error("Use at least 12 characters — this account can read every order.");
  process.exit(1);
}

const db = await getDb();
const passwordHash = await hashPassword(password);

await db
  .insert(user)
  .values({
    email: email.trim().toLowerCase(),
    name,
    role: role as "owner" | "admin" | "limited",
    passwordHash,
  })
  .onConflictDoUpdate({
    target: user.email,
    set: { name, role: role as "owner" | "admin" | "limited", passwordHash },
  });

console.log(`\n${email} is ready as ${role}. Sign in at /admin/sign-in`);
process.exit(0);
