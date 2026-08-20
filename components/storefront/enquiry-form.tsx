"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Field, TextArea } from "@/components/ui/field";
import { submitEnquiry, type EnquiryState } from "@/app/actions/enquiry";
import { CONTACT } from "@/lib/content";

/**
 * The studio enquiry form.
 *
 * Reason chips are the only boxed control set on the storefront. Validation is
 * on blur rather than on keystroke, per the handoff — errors that appear while
 * someone is still typing their email address read as nagging.
 */
export function EnquiryForm() {
  const [state, action, pending] = useActionState<EnquiryState, FormData>(
    submitEnquiry,
    {},
  );

  /**
   * `?piece=` is read here rather than on the page, so /contact stays
   * statically prerendered. Reading searchParams on the server would make the
   * studio's local-search page render on demand for no benefit.
   */
  const pieceSlug = useSearchParams().get("piece") ?? undefined;

  const [reason, setReason] = useState<string>(
    pieceSlug ? "piece" : CONTACT.reasons[0].value,
  );

  if (state.sent) {
    return (
      <div className="flex flex-col gap-4 border border-ink/25 p-8">
        <h3 className="font-display text-[26px]">Thank you.</h3>
        <p className="max-w-[420px] text-body-sm leading-[1.7] text-ink/72">
          Your message is with the studio. Replies usually come within a day —
          two if the bench is busy.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-7">
      <input type="hidden" name="reason" value={reason} />
      {pieceSlug && <input type="hidden" name="pieceSlug" value={pieceSlug} />}

      {/* Honeypot — visually and programmatically hidden from real users. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] size-px opacity-0"
      />

      <div className="grid gap-7 md:grid-cols-2">
        <Field label="Name" name="name" autoComplete="name" required error={state.errors?.name} />
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          error={state.errors?.email}
        />
      </div>

      <fieldset className="flex flex-col gap-4">
        <legend className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink/64">
          What is this about?
        </legend>
        <div className="flex flex-wrap gap-2">
          {CONTACT.reasons.map((r) => (
            <Chip
              key={r.value}
              variant="boxed"
              active={reason === r.value}
              onClick={() => setReason(r.value)}
            >
              {r.label}
            </Chip>
          ))}
        </div>
      </fieldset>

      <TextArea
        label="Message"
        name="message"
        required
        rows={5}
        error={state.errors?.message}
        placeholder={
          pieceSlug
            ? "I would like to see this piece in the studio…"
            : "A stone I have, a piece I saw, or a time that suits…"
        }
      />

      {state.errors?.form && (
        <p role="alert" className="text-[13px] text-error">
          {state.errors.form}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-6">
        <Button type="submit" disabled={pending} className="px-10">
          {pending ? "Sending…" : "Send message"}
        </Button>
        <p className="text-body-sm text-ink/55">
          Or call {CONTACT.details[1].value}
        </p>
      </div>
    </form>
  );
}
