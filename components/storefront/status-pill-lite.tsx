/**
 * Order status on the customer's own account page.
 *
 * NOT the admin StatusPill: the admin's four status tones are a back-office
 * language and must never appear on the storefront, which has no accent colour
 * at all. This is the same information rendered in ink alone.
 */
const LABEL: Record<string, string> = {
  enquiry: "Reserved",
  paid: "Confirmed",
  in_studio: "In the studio",
  dispatched: "Dispatched",
  delivered: "Delivered",
  refunded: "Refunded",
  cancelled: "Cancelled",
};

export function StatusPillLite({ status }: { status: string }) {
  return (
    <span className="border border-ink/25 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink/64">
      {LABEL[status] ?? status}
    </span>
  );
}
