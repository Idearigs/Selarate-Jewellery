"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Section reveal: fade + 12px rise, 600ms, fired at ~15% visibility, once per
 * element. The transition itself lives in globals.css (.reveal) so that
 * prefers-reduced-motion can override it in one place — reduced motion drops
 * the transform and shortens to a 200ms fade.
 */
export function Reveal({
  children,
  className,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "li";
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    /* Anything already on screen at load — or already scrolled past, which
       happens on a browser-restored scroll position — must be shown at once
       rather than waiting for an intersection that has already been missed. */
    const box = el.getBoundingClientRect();
    if (box.top < window.innerHeight && box.bottom > 0) {
      setShown(true);
      return;
    }
    if (box.bottom <= 0) {
      setShown(true);
      return;
    }

    /*
     * Triggered by rootMargin, not by a visibility fraction.
     *
     * A 0.15 threshold asks for 15% of the ELEMENT to be on screen, which is a
     * moving target: on mobile these sections stack and grow several viewports
     * tall, so 15% of one could be most of a screenful and the reveal fired
     * long after the section had been read. Shrinking the root by 12% instead
     * fires as the top edge rises past that line, at the same moment on every
     * section regardless of how tall it is.
     */
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShown(true);
          observer.disconnect(); // once per element
        }
      },
      { threshold: 0, rootMargin: "0px 0px -12% 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      className={cn("reveal", className)}
      data-shown={shown}
    >
      {children}
    </Tag>
  );
}
