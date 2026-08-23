import { ReactNode } from "react";
import { cn } from "@/utils/cn";

interface AccordionProps {
  id: string;
  title: string;
  children: ReactNode;
  /** Merged onto the expandable panel. */
  className?: string;
}

/**
 * A collapsible card. Stays CSS-only (checkbox `peer` + max-height) so it
 * costs no state, but reads as a raised panel rather than a hairline rule.
 */
export default function Accordion({
  id,
  title,
  children,
  className,
}: AccordionProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface-raised shadow-xs">
      <input type="checkbox" id={id} className="peer sr-only" />

      <label
        htmlFor={id}
        className={cn(
          "flex cursor-pointer items-center justify-between gap-2 px-3 py-2.5",
          "text-sm font-semibold text-text transition-colors hover:bg-surface-sunken/40",
          // The label is the visible control, so it carries the focus ring for
          // the visually-hidden checkbox.
          "peer-focus-visible:outline-2 peer-focus-visible:-outline-offset-2 peer-focus-visible:outline-accent",
        )}
      >
        {title}
        <svg
          className="size-4 shrink-0 text-text-muted transition-transform duration-300 [:checked~label_&]:rotate-180"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </label>

      <div
        className={cn(
          "max-h-0 overflow-y-auto transition-[max-height,padding] duration-300",
          "px-3 peer-checked:max-h-96 peer-checked:py-3",
          "border-t border-transparent peer-checked:border-border",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
