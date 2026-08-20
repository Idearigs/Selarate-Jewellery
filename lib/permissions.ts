/**
 * Roles and permissions — pure data, no server imports.
 *
 * Kept separate from lib/auth.ts on purpose: the sidebar is a client component
 * and needs `can()` to decide which nav items to render. Importing it from
 * lib/auth would drag `next/headers` and node:crypto into the browser bundle.
 *
 * Owner   — everything
 * Admin   — everything except settings and team
 * Limited — bench queue and orders only, no financial figures
 */

export type Role = "owner" | "admin" | "limited";

export type Permission =
  | "pieces"
  | "orders"
  | "inventory"
  | "customers"
  | "settings"
  | "financials";

const PERMISSIONS: Record<Role, Permission[]> = {
  owner: ["pieces", "orders", "inventory", "customers", "settings", "financials"],
  admin: ["pieces", "orders", "inventory", "customers", "financials"],
  limited: ["orders"],
};

export function can(role: Role, permission: Permission) {
  return PERMISSIONS[role].includes(permission);
}
