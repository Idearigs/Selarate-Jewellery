import type { Metadata } from "next";
import Link from "next/link";
import { AccountPanel } from "@/components/storefront/account-panel";
import { PlaceholderImage } from "@/components/ui/placeholder-image";
import { StatusPillLite } from "@/components/storefront/status-pill-lite";
import { signOutAction } from "@/app/actions/account";
import { getCurrentCustomer, getCustomerOrders } from "@/lib/customer-auth";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Account",
  // Signed-in state shows a customer's own orders; keep it out of the index.
  robots: { index: false, follow: true },
};

const BENEFITS = [
  { key: "Reservations", value: "Pieces you are holding, and how long is left" },
  { key: "Your sizes", value: "Ring and bangle sizes, remembered between visits" },
  { key: "Care record", value: "Every clean, polish and resize, for each piece" },
];

export default async function AccountPage() {
  const customer = await getCurrentCustomer();
  const orders = customer ? await getCustomerOrders(customer.id) : [];

  return (
    <div className="grid items-stretch xl:grid-cols-[1.05fr_1fr]">
      <div className="page-x py-16 xl:py-22 xl:pr-16">
        {customer ? (
          <div className="flex flex-col gap-10">
            <div className="flex flex-col gap-4.5">
              <p className="font-mono text-label uppercase tracking-[0.22em] text-ink/64">
                Account
              </p>
              <h1 className="text-title-m xl:text-[52px] xl:leading-[1.06]">
                {customer.name ?? customer.email}
              </h1>
              <p className="font-mono text-[13px] text-ink/64">{customer.email}</p>
            </div>

            <div className="flex flex-col gap-5">
              <h2 className="font-mono text-label uppercase tracking-[0.18em] text-ink/64">
                Your orders
              </h2>

              {orders.length === 0 ? (
                <p className="text-body text-ink/72">
                  Nothing yet.{" "}
                  <Link href="/collection" className="border-b border-ink/30 hover:border-ink">
                    Browse the collection
                  </Link>
                  .
                </p>
              ) : (
                <div className="flex flex-col border-t border-ink/12">
                  {orders.map((order) => (
                    <Link
                      key={order.id}
                      href={`/order/${order.lookupToken}`}
                      className="flex items-start justify-between gap-6 border-b border-ink/12 py-5 transition-colors hover:bg-ink/[0.02]"
                    >
                      <div className="flex flex-col gap-1.5">
                        <span className="font-display text-piece">
                          {order.items.map((i) => i.name).join(", ")}
                        </span>
                        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink/64">
                          {order.number} ·{" "}
                          {order.placedAt.toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-[15px]">
                          {formatPrice(order.totalCents)}
                        </span>
                        <StatusPillLite status={order.status} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <form action={signOutAction}>
              <button
                type="submit"
                className="border-b border-ink/30 pb-1 text-[11px] uppercase tracking-[0.16em] text-ink/64 transition-colors hover:border-ink hover:text-ink"
              >
                Sign out
              </button>
            </form>
          </div>
        ) : (
          <AccountPanel />
        )}
      </div>

      {/* Editorial image with an overlaid card listing what an account holds */}
      <div className="relative hidden xl:block">
        <PlaceholderImage
          src={null}
          label="EDITORIAL — worn piece, 3:4"
          ratio="free"
          sizes="50vw"
          className="h-full min-h-[820px]"
        />
        <div className="absolute inset-x-12 bottom-12 flex flex-col gap-5 bg-paper p-10">
          <p className="font-mono text-label uppercase tracking-[0.2em] text-ink/64">
            What an account holds
          </p>
          {BENEFITS.map((benefit) => (
            <div
              key={benefit.key}
              className="grid grid-cols-[150px_1fr] gap-5 border-t border-ink/12 pt-3.5"
            >
              <span className="font-display text-[17px]">{benefit.key}</span>
              <span className="text-[14px] leading-[1.6] text-ink/72">
                {benefit.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
