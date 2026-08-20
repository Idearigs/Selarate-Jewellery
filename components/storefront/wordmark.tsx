import Link from "next/link";
import { BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/cn";

/**
 * The wordmark: "SÉLARTÉ" set in Marcellus and tracked wide. This is
 * type, not artwork — if a drawn logotype ever arrives, replace the inner span
 * and keep the optical fix below.
 *
 * Optical fix — letter-spacing adds trailing space after the final letter, so a
 * centred wordmark reads as sitting left of centre. Compensating with a
 * padding-left equal to the tracking value re-centres it.
 */
export function Wordmark({
  className,
  as = "link",
}: {
  className?: string;
  /** Use "text" inside the footer, where it is not a link to itself. */
  as?: "link" | "text";
}) {
  const content = (
    <span
      className={cn(
        "font-display uppercase",
        "text-[17px] tracking-[0.28em] pl-[0.28em]",
        "xl:text-[27px] xl:tracking-[0.34em] xl:pl-[0.34em]",
        className,
      )}
    >
      {BRAND_NAME}
    </span>
  );

  if (as === "text") return content;

  return (
    <Link href="/" aria-label={`${BRAND_NAME} — home`}>
      {content}
    </Link>
  );
}
