import { describe, expect, it } from "vitest";
import { can, type Permission, type Role } from "./permissions";

/**
 * The role matrix, asserted explicitly rather than derived — if someone widens
 * a role, a test should fail rather than the change passing silently.
 *
 * Owner   — everything
 * Admin   — everything except settings and team
 * Limited — bench queue and orders only, no financial figures
 */

const ROLES: Role[] = ["owner", "admin", "limited"];
const PERMISSIONS: Permission[] = [
  "pieces",
  "orders",
  "inventory",
  "customers",
  "settings",
  "financials",
];

const EXPECTED: Record<Role, Record<Permission, boolean>> = {
  owner: {
    pieces: true,
    orders: true,
    inventory: true,
    customers: true,
    settings: true,
    financials: true,
  },
  admin: {
    pieces: true,
    orders: true,
    inventory: true,
    customers: true,
    settings: false,
    financials: true,
  },
  limited: {
    pieces: false,
    orders: true,
    inventory: false,
    customers: false,
    settings: false,
    financials: false,
  },
};

describe("role permissions", () => {
  for (const role of ROLES) {
    for (const permission of PERMISSIONS) {
      const expected = EXPECTED[role][permission];
      it(`${role} ${expected ? "may" : "may NOT"} access ${permission}`, () => {
        expect(can(role, permission)).toBe(expected);
      });
    }
  }

  it("gives no role more than the owner", () => {
    for (const role of ROLES) {
      for (const permission of PERMISSIONS) {
        if (can(role, permission)) expect(can("owner", permission)).toBe(true);
      }
    }
  });

  it("keeps settings owner-only — it holds the hold window and team roles", () => {
    expect(can("owner", "settings")).toBe(true);
    expect(can("admin", "settings")).toBe(false);
    expect(can("limited", "settings")).toBe(false);
  });

  it("hides every financial figure from limited staff", () => {
    // The bench assistant can move an order along but must not see revenue,
    // lifetime value, or order totals.
    expect(can("limited", "financials")).toBe(false);
    expect(can("limited", "customers")).toBe(false);
  });
});
