"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  AdminField,
  AdminTextArea,
  MonoLabel,
} from "@/components/admin/primitives";
import { PlaceholderImage } from "@/components/ui/placeholder-image";
import { archivePiece, savePiece, type PieceFormState } from "@/app/actions/admin-pieces";
import { cn } from "@/lib/cn";

const RING_SIZES = ["5", "5½", "6", "6½", "7", "7½", "8"];

/**
 * The three availability cards. This is the single control that drives
 * inventory behaviour across the entire system, which is why it gets three
 * large explained options rather than a select.
 */
const AVAILABILITY = [
  {
    key: "unique",
    label: "One of a kind",
    note: "Stock of one. Holdable. Leaves the catalogue when sold.",
  },
  {
    key: "order",
    label: "Made to order",
    note: "No stock limit. Carries sizes and a 6–8 week lead time.",
  },
  {
    key: "draft",
    label: "Draft",
    note: "Invisible to the storefront entirely.",
  },
] as const;

export interface PieceFormValues {
  id?: string;
  name: string;
  slug: string;
  reference: string;
  category: "ooak" | "fine";
  availability: string;
  priceCents: number;
  materialLine: string;
  filterTag: string;
  story: string;
  season: string;
  defaultSize: string;
  sizeNote: string;
  sizes: string[];
  specs: { key: string; value: string }[];
}

export function PieceEditor({ piece }: { piece: PieceFormValues }) {
  const [state, action, pending] = useActionState<PieceFormState, FormData>(
    savePiece,
    {},
  );

  const [availability, setAvailability] = useState(piece.availability);
  const [sizes, setSizes] = useState<string[]>(piece.sizes);

  const toggleSize = (size: string) =>
    setSizes((current) =>
      current.includes(size)
        ? current.filter((s) => s !== size)
        : [...current, size],
    );

  return (
    <form action={action} className="grid flex-1 grid-cols-[1fr_340px] overflow-hidden">
      {piece.id && <input type="hidden" name="id" value={piece.id} />}
      <input type="hidden" name="availability" value={availability} />
      {sizes.map((s) => (
        <input key={s} type="hidden" name="sizes" value={s} />
      ))}

      {/* Left: photography, fields, spec table */}
      <div className="flex flex-col gap-8 overflow-y-auto border-r border-ink/12 p-7">
        <div className="flex flex-col gap-3.5">
          <MonoLabel>Photography</MonoLabel>
          <div className="grid grid-cols-5 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <PlaceholderImage
                key={i}
                src={null}
                label={["PRIMARY", "DETAIL", "ON BODY", "SCALE"][i]!}
                ratio="product"
                labelPosition="bottom"
              />
            ))}
            <button
              type="button"
              className="flex aspect-[4/5] items-center justify-center border border-dashed border-ink/30 font-mono text-[10px] uppercase tracking-[0.14em] text-ink/50 hover:border-ink hover:text-ink"
            >
              + Add
            </button>
          </div>
          <p className="text-[12px] text-ink/60">
            Uploads land in object storage. Alt text is required on save — it is
            an accessibility and search requirement, not a nicety.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <AdminField
            label="Name"
            name="name"
            defaultValue={piece.name}
            required
          />
          <AdminField
            label="Reference"
            name="reference"
            defaultValue={piece.reference}
            required
          />
          <AdminField
            label="URL slug"
            name="slug"
            defaultValue={piece.slug}
            required
          />
          <AdminField
            label="Price (USD)"
            name="price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={(piece.priceCents / 100).toFixed(2)}
            required
          />
          <AdminField
            label="Material line"
            name="materialLine"
            defaultValue={piece.materialLine}
            span
            required
          />

          <label className="flex flex-col gap-2">
            <MonoLabel>Category</MonoLabel>
            <select
              name="category"
              defaultValue={piece.category}
              className="border border-ink/20 bg-transparent px-3 py-2.5 text-[13px] outline-none focus:border-ink"
            >
              <option value="ooak">One of a Kind</option>
              <option value="fine">Fine Jewelry</option>
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <MonoLabel>Filter group</MonoLabel>
            <select
              name="filterTag"
              defaultValue={piece.filterTag}
              className="border border-ink/20 bg-transparent px-3 py-2.5 text-[13px] outline-none focus:border-ink"
            >
              {["Rings", "Earrings", "Necklaces", "Cuffs"].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <AdminField label="Season" name="season" defaultValue={piece.season} />
          <AdminField
            label="Size as made"
            name="defaultSize"
            defaultValue={piece.defaultSize}
            placeholder="6½"
          />
          <AdminTextArea label="Story" name="story" defaultValue={piece.story} />
          <AdminField
            label="Sizing note"
            name="sizeNote"
            defaultValue={piece.sizeNote}
            span
          />
        </div>

        {piece.specs.length > 0 && (
          <div className="flex flex-col gap-3.5">
            <MonoLabel>Specification</MonoLabel>
            <div className="flex flex-col">
              {piece.specs.map((spec) => (
                <div
                  key={spec.key}
                  className="grid grid-cols-[150px_1fr] items-center gap-4 border-b border-ink/10 py-[11px]"
                >
                  <MonoLabel className="tracking-[0.14em]">{spec.key}</MonoLabel>
                  <input
                    defaultValue={spec.value}
                    readOnly
                    className="border-0 bg-transparent text-[13px] outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right rail */}
      <div className="flex flex-col overflow-y-auto">
        <div className="flex flex-col gap-4 border-b border-ink/12 px-6 pb-[22px] pt-6">
          <MonoLabel>Availability</MonoLabel>
          <div className="flex flex-col gap-2">
            {AVAILABILITY.map((option) => {
              const on = availability === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setAvailability(option.key)}
                  aria-pressed={on}
                  className={cn(
                    "flex items-start justify-between gap-3 border p-3.5 text-left",
                    on ? "border-ink bg-ink/[0.04]" : "border-ink/20 hover:border-ink/50",
                  )}
                >
                  <span className="flex flex-col gap-[3px]">
                    <span className="text-[13px]">{option.label}</span>
                    <span className="text-[11px] leading-[1.5] text-ink/60">
                      {option.note}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 size-3 shrink-0 border",
                      on ? "border-ink bg-ink" : "border-ink/30",
                    )}
                  />
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-3.5 border-b border-ink/12 px-6 py-[22px]">
          <MonoLabel>Sizes offered</MonoLabel>
          <div className="flex flex-wrap gap-[7px]">
            {RING_SIZES.map((size) => {
              const on = sizes.includes(size);
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => toggleSize(size)}
                  aria-pressed={on}
                  className={cn(
                    "min-h-11 w-[52px] border text-[12px]",
                    on ? "border-ink bg-ink text-paper" : "border-ink/20 hover:border-ink/50",
                  )}
                >
                  {size}
                </button>
              );
            })}
          </div>
          <p className="text-[12px] leading-[1.6] text-ink/62">
            One-of-a-kind pieces ship in the size made; two sizes of adjustment
            are free.
          </p>
        </div>

        {state.errors && (
          <div className="border-b border-ink/12 px-6 py-4">
            {Object.entries(state.errors).map(([key, message]) => (
              <p key={key} className="text-[12px] text-error">
                {message}
              </p>
            ))}
          </div>
        )}

        <div className="mt-auto flex flex-col gap-2.5 px-6 py-[22px]">
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
            {pending ? "Saving…" : state.saved ? "Saved" : "Save changes"}
          </button>

          <Link
            href={`/piece/${piece.slug}`}
            target="_blank"
            className="border border-ink/25 px-[18px] py-3 text-center text-[11px] uppercase tracking-[0.16em] hover:border-ink"
          >
            Preview on site
          </Link>

          {piece.id && (
            <button
              type="button"
              onClick={() => {
                if (
                  confirm(
                    "Archive this piece? It will leave the catalogue but its page and order history stay intact.",
                  )
                ) {
                  void archivePiece(piece.id!);
                }
              }}
              className="border border-error/40 px-[18px] py-3 text-[11px] uppercase tracking-[0.16em] text-error hover:border-error"
            >
              Archive piece
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
