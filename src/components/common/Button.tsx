import { cn } from "@/utils/cn";

type Variant = "primary" | "danger" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg",
  danger: "bg-danger text-danger-fg",
  ghost:
    "bg-surface-raised text-text border border-border hover:bg-surface-sunken",
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export default function Button({
  children,
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        // Only filter animates (the hover/active brightness), so switching
        // theme swaps the background instantly instead of fading.
        "inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border-none",
        "px-4 py-2 text-center text-sm font-semibold transition-[filter,background-color] duration-200",
        "active:brightness-[92%] hover:brightness-[92%]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:bg-disabled disabled:text-disabled-fg disabled:pointer-events-none disabled:border-transparent",
        VARIANTS[variant],
        props.className,
      )}
    >
      {children}
    </button>
  );
}
