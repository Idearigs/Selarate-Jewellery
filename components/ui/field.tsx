import { cn } from "@/lib/cn";

/**
 * Form controls, transcribed from the Contact and Account prototypes.
 *
 * Inputs are bottom-rule only — no boxes. The only boxed control set in the
 * whole design is the reason/size chips. Errors render as 13px text below the
 * field in `#8A3B2E`, with the rule taking the same colour.
 *
 * All inputs are 16px: anything smaller triggers zoom-on-focus on iOS.
 */

const inputBase = cn(
  "w-full border-0 border-b bg-transparent py-3 text-[16px] text-ink",
  "outline-none transition-colors duration-200",
  "placeholder:text-ink/40",
);

export function Field({
  label,
  error,
  hint,
  className,
  id,
  ...props
}: React.ComponentPropsWithoutRef<"input"> & {
  label: string;
  error?: string | null;
  hint?: string;
}) {
  const fieldId = id ?? props.name;
  const errorId = error ? `${fieldId}-error` : undefined;

  return (
    <label className={cn("flex flex-col gap-2.5", className)} htmlFor={fieldId}>
      <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink/64">
        {label}
      </span>
      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={cn(
          inputBase,
          error ? "border-error focus:border-error" : "border-ink/30 focus:border-ink",
        )}
        {...props}
      />
      {hint && !error && (
        <span className="text-body-sm text-ink/55">{hint}</span>
      )}
      {error && (
        <span id={errorId} className="text-[13px] text-error">
          {error}
        </span>
      )}
    </label>
  );
}

export function TextArea({
  label,
  error,
  className,
  id,
  ...props
}: React.ComponentPropsWithoutRef<"textarea"> & {
  label: string;
  error?: string | null;
}) {
  const fieldId = id ?? props.name;
  return (
    <label className={cn("flex flex-col gap-2.5", className)} htmlFor={fieldId}>
      <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink/64">
        {label}
      </span>
      {/* The textarea is the one bordered input, per the Contact design. */}
      <textarea
        id={fieldId}
        rows={4}
        aria-invalid={error ? true : undefined}
        className={cn(
          "w-full border bg-transparent p-4 text-[16px] text-ink outline-none",
          "transition-colors duration-200 placeholder:text-ink/40",
          error ? "border-error" : "border-ink/25 focus:border-ink",
        )}
        {...props}
      />
      {error && <span className="text-[13px] text-error">{error}</span>}
    </label>
  );
}

export function Checkbox({
  label,
  className,
  ...props
}: React.ComponentPropsWithoutRef<"input"> & { label: React.ReactNode }) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 text-[14px] text-ink/72",
        className,
      )}
    >
      <input
        type="checkbox"
        className="size-[15px] accent-ink"
        {...props}
      />
      {label}
    </label>
  );
}
