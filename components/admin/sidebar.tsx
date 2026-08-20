"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { can, type Role } from "@/lib/permissions";
import { signOutAction } from "@/app/actions/admin-auth";

/**
 * 236px solid-ink sidebar. Inactive items sit at 68% alpha; the active item
 * takes a 12% bone wash. Counts are right-aligned in mono.
 *
 * `productEdit` and `orderDetail` keep their parent nav item lit — hence the
 * prefix match rather than an exact one.
 *
 * Below `lg` it becomes an off-canvas drawer behind a worded "Menu" control,
 * so the admin is usable on a phone. The handoff called the admin desktop-only,
 * which was right when it was a workbench tool — but the owner now answers
 * live chat from their phone, and a chat you cannot navigate to is no use.
 */

const ITEMS = [
  { href: "/admin", label: "Dashboard", permission: null, exact: true },
  { href: "/admin/pieces", label: "Pieces", permission: "pieces" as const },
  { href: "/admin/orders", label: "Orders", permission: "orders" as const },
  { href: "/admin/chat", label: "Live chat", permission: "orders" as const },
  { href: "/admin/inventory", label: "Inventory", permission: "inventory" as const },
  { href: "/admin/customers", label: "Customers", permission: "customers" as const },
  { href: "/admin/settings", label: "Settings", permission: "settings" as const },
  { href: "/admin/install", label: "Install on phone", permission: "orders" as const },
];

export function Sidebar({
  role,
  name,
  counts,
}: {
  role: Role;
  name: string;
  counts: Record<string, number | undefined>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Navigating must dismiss the drawer, or a phone lands on the new page with
  // the menu still covering it.
  useEffect(() => setOpen(false), [pathname]);

  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      {/* Phone header. Hidden from `lg` up, where the rail is always present. */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-[52px] items-center justify-between bg-ink px-5 text-[#EDEAE3] lg:hidden">
        <span className="font-display text-[13px] uppercase tracking-[0.24em] pl-[0.24em]">
          {BRAND_NAME}
        </span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#EDEAE3]/70"
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {open && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-ink/50 lg:hidden"
        />
      )}

    <aside
      className={cn(
        "flex shrink-0 flex-col bg-ink text-[#EDEAE3]",
        "fixed inset-y-0 left-0 z-50 w-[236px] transition-transform duration-200 lg:static lg:h-screen lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="border-b border-[#EDEAE3]/14 px-5 pb-[22px] pt-6">
        <div className="font-display text-[15px] uppercase tracking-[0.26em] pl-[0.26em]">
          {BRAND_NAME}
        </div>
        <div className="pt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#EDEAE3]/50">
          Studio Admin
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
        {ITEMS.filter((item) => !item.permission || can(role, item.permission)).map(
          (item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const badge = counts[item.href];

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-between gap-2.5 px-3.5 py-[11px]",
                  "text-[13px] tracking-[0.04em]",
                  active
                    ? "bg-[#EDEAE3]/12 text-[#EDEAE3]"
                    : "text-[#EDEAE3]/68 hover:text-[#EDEAE3]",
                )}
              >
                <span>{item.label}</span>
                {badge !== undefined && badge > 0 && (
                  <span className="font-mono text-[10px] text-[#EDEAE3]/70">
                    {badge}
                  </span>
                )}
              </Link>
            );
          },
        )}
      </nav>

      <div className="flex flex-col gap-2.5 border-t border-[#EDEAE3]/14 px-5 pb-5 pt-4">
        <div className="flex items-center gap-3">
          <span className="flex size-[30px] items-center justify-center bg-[#EDEAE3]/16 font-mono text-[11px]">
            {initials}
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px]">{name}</span>
            <span className="font-mono text-[10px] capitalize text-[#EDEAE3]/50">
              {role}
            </span>
          </div>
        </div>
        {/* A server action, not a POST route: server actions carry Next's
            built-in Origin check, so a cross-site form cannot sign staff out. */}
        <form action={signOutAction}>
          <button
            type="submit"
            className="text-[11px] uppercase tracking-[0.14em] text-[#EDEAE3]/50 hover:text-[#EDEAE3]"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
    </>
  );
}
