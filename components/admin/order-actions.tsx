"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addOrderNote,
  advanceOrder,
  confirmWirePayment,
  refundOrder,
} from "@/app/actions/admin-orders";
import { MonoLabel } from "./primitives";

/**
 * The order detail right rail.
 *
 * Every action is available without hover and reachable by keyboard — the owner
 * uses this on a laptop at a workbench, often one-handed.
 */
export function OrderActions({
  orderId,
  status,
  provider,
  canTakeMoney,
}: {
  orderId: string;
  status: string;
  provider: string | null;
  canTakeMoney: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<void>) =>
    start(async () => {
      await fn();
      router.refresh();
    });

  const button =
    "border border-ink/25 px-[18px] py-3 text-[11px] uppercase tracking-[0.16em] hover:border-ink disabled:opacity-40";
  const primary =
    "border border-ink bg-ink px-[18px] py-3 text-[11px] uppercase tracking-[0.16em] text-paper hover:opacity-88 disabled:opacity-40";

  return (
    <div className="flex flex-col gap-2.5 border-b border-ink/12 px-6 py-[22px]">
      <MonoLabel>Actions</MonoLabel>

      {/* A wire order sits in `enquiry` until the studio says the money landed.
          This is the manual counterpart to the card webhook. */}
      {status === "enquiry" && provider === "wire" && canTakeMoney && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => confirmWirePayment(orderId))}
          className={primary}
        >
          Confirm transfer received
        </button>
      )}

      {status === "paid" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => advanceOrder(orderId, "in_studio"))}
          className={primary}
        >
          Start on the bench
        </button>
      )}

      {(status === "paid" || status === "in_studio") && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => advanceOrder(orderId, "dispatched"))}
          className={status === "in_studio" ? primary : button}
        >
          Mark dispatched
        </button>
      )}

      {status === "dispatched" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => advanceOrder(orderId, "delivered"))}
          className={primary}
        >
          Mark delivered
        </button>
      )}

      <button type="button" className={button} onClick={() => window.print()}>
        Print packing note
      </button>

      {canTakeMoney && status !== "refunded" && status !== "enquiry" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm("Refund this order in full? This cannot be undone.")) {
              run(() => refundOrder(orderId));
            }
          }}
          className="border border-error/40 px-[18px] py-3 text-[11px] uppercase tracking-[0.16em] text-error hover:border-error disabled:opacity-40"
        >
          Refund
        </button>
      )}
    </div>
  );
}

export function InternalNote({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <form
      className="flex flex-col gap-2.5 border-b border-ink/12 px-6 py-[22px]"
      action={(formData) =>
        start(async () => {
          await addOrderNote(orderId, String(formData.get("body") ?? ""));
          router.refresh();
        })
      }
    >
      <MonoLabel>Studio note</MonoLabel>
      <p className="text-[11px] leading-[1.5] text-ink/60">
        Internal only — never shown to the customer.
      </p>
      <textarea
        name="body"
        rows={3}
        className="border border-ink/20 bg-transparent px-3 py-2.5 text-[13px] outline-none focus:border-ink"
      />
      <button
        type="submit"
        disabled={pending}
        className="border border-ink/25 px-[18px] py-2.5 text-[11px] uppercase tracking-[0.16em] hover:border-ink disabled:opacity-40"
      >
        {pending ? "Saving…" : "Add note"}
      </button>
    </form>
  );
}
