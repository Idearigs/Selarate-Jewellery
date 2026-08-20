"use client";

import { useActionState } from "react";
import { AdminField, MonoLabel } from "./primitives";
import { saveSettings, type SettingsState } from "@/app/actions/admin-settings";
import { cn } from "@/lib/cn";

/** 38×20 square switch. No radius, like everything else. */
function Toggle({
  name,
  label,
  note,
  defaultChecked,
}: {
  name: string;
  label: string;
  note: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-6 border-b border-ink/10 py-4">
      <span className="flex flex-col gap-1">
        <span className="text-[13px]">{label}</span>
        <span className="text-[11px] leading-[1.5] text-ink/60">{note}</span>
      </span>
      <span className="relative shrink-0">
        <input
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
          className="peer sr-only"
        />
        <span
          className={cn(
            "block h-5 w-[38px] border border-ink/30 bg-transparent transition-colors",
            "peer-checked:border-ink peer-checked:bg-ink",
            "peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink",
          )}
        />
        <span className="pointer-events-none absolute left-[2px] top-[2px] size-4 bg-ink transition-transform peer-checked:translate-x-[18px] peer-checked:bg-paper" />
      </span>
    </label>
  );
}

export interface SettingsValues {
  studioName: string;
  studioEmail: string;
  studioPhone: string;
  studioAddress: string;
  holdWindowMinutes: number;
  taxRateBps: number;
  chatEnabled: boolean;
  chatHoursStart: number;
  chatHoursEnd: number;
  chatTimezone: string;
  notifyOnVisitor: boolean;
  insuredShipping: boolean;
  acceptWireTransfer: boolean;
  showPricesPublicly: boolean;
  acceptCommissions: boolean;
}

export function SettingsForm({ values }: { values: SettingsValues }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(
    saveSettings,
    {},
  );

  return (
    <form action={action} className="grid grid-cols-2 gap-10 p-7">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <MonoLabel>Studio identity</MonoLabel>
          <div className="grid grid-cols-2 gap-4">
            <AdminField label="Studio name" name="studioName" defaultValue={values.studioName} span />
            <AdminField
              label="Email"
              name="studioEmail"
              type="email"
              defaultValue={values.studioEmail}
            />
            <AdminField label="Telephone" name="studioPhone" defaultValue={values.studioPhone} />
            <AdminField label="Address" name="studioAddress" defaultValue={values.studioAddress} span />
          </div>
          <p className="text-[11px] leading-[1.5] text-ink/60">
            These feed the storefront&rsquo;s structured data. Stale values are a
            search problem, not just a copy one.
          </p>
        </div>

        <div className="flex flex-col">
          <MonoLabel>Commerce</MonoLabel>
          <Toggle
            name="insuredShipping"
            label="Insured shipping included"
            note="Shown as “Included” in the bag rather than as a line charge."
            defaultChecked={values.insuredShipping}
          />
          <Toggle
            name="acceptWireTransfer"
            label="Accept bank transfer"
            note="Offers “Reserve and pay by wire” at checkout for larger pieces."
            defaultChecked={values.acceptWireTransfer}
          />
          <Toggle
            name="showPricesPublicly"
            label="Show prices publicly"
            note="Prices appear on every product and in search results."
            defaultChecked={values.showPricesPublicly}
          />
          <Toggle
            name="acceptCommissions"
            label="Accept commissions"
            note="Shows the commissions band and the enquiry reason."
            defaultChecked={values.acceptCommissions}
          />
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <MonoLabel>Reservation window</MonoLabel>
          <AdminField
            label="Hold minutes"
            name="holdWindowMinutes"
            type="number"
            min={5}
            max={1440}
            defaultValue={values.holdWindowMinutes}
          />
          <p className="text-[11px] leading-[1.5] text-ink/60">
            How long a one-of-a-kind piece stays reserved when someone adds it to
            their bag. This is the value the storefront countdown and the
            dashboard alert both read. Bank transfer orders extend well past it.
          </p>

          <AdminField
            label="Estimated tax (basis points)"
            name="taxRateBps"
            type="number"
            min={0}
            max={3000}
            defaultValue={values.taxRateBps}
          />
          <p className="text-[11px] leading-[1.5] text-ink/60">
            750 = 7.5%. A flat rate shown as an estimate in the bag. Real
            multi-jurisdiction tax needs a tax service once a card gateway is
            chosen.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <MonoLabel>Live chat</MonoLabel>
          <Toggle
            name="chatEnabled"
            label="Show the chat widget"
            note="Turns the storefront widget on for every visitor."
            defaultChecked={values.chatEnabled}
          />
          <Toggle
            name="notifyOnVisitor"
            label="Alert me when someone arrives"
            note="A silent notification per new visitor. Crawlers never alert, and a site-wide cap of 30/hour stops a traffic spike flooding your phone."
            defaultChecked={values.notifyOnVisitor}
          />

          <div className="grid grid-cols-2 gap-4">
            <AdminField
              label="Open (hour)"
              name="chatHoursStart"
              type="number"
              min={0}
              max={23}
              defaultValue={values.chatHoursStart}
            />
            <AdminField
              label="Close (hour)"
              name="chatHoursEnd"
              type="number"
              min={0}
              max={23}
              defaultValue={values.chatHoursEnd}
            />
          </div>
          <AdminField
            label="Studio timezone"
            name="chatTimezone"
            defaultValue={values.chatTimezone}
            span
          />
          <p className="text-[11px] leading-[1.5] text-ink/60">
            Inside these hours the widget says the studio is replying now.
            Outside them it takes a message instead, so nobody is left typing
            into silence. A window that ends before it starts (22 to 4) is read
            as crossing midnight.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <MonoLabel>Team roles</MonoLabel>
          <dl className="flex flex-col text-[12px]">
            {[
              ["Owner", "Everything, including settings and team."],
              ["Admin", "Everything except settings and team."],
              ["Limited", "Bench queue and orders only. No financial figures."],
            ].map(([role, note]) => (
              <div
                key={role}
                className="grid grid-cols-[90px_1fr] gap-4 border-b border-ink/10 py-3"
              >
                <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink/60">
                  {role}
                </dt>
                <dd className="leading-[1.5] text-ink/72">{note}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-auto flex items-center gap-4">
          <button
            type="submit"
            disabled={pending}
            className={cn(
              "border px-[18px] py-3 text-[11px] uppercase tracking-[0.16em]",
              state.saved
                ? "border-ink bg-paper text-ink"
                : "border-ink bg-ink text-paper hover:opacity-88",
              "disabled:opacity-40",
            )}
          >
            {pending ? "Saving…" : state.saved ? "Saved" : "Save settings"}
          </button>
          {state.error && <span className="text-[12px] text-error">{state.error}</span>}
        </div>
      </div>
    </form>
  );
}
