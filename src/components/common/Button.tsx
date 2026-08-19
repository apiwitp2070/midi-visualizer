import { cn } from "@/utils/cn";

export default function Button({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        // Only filter animates (the hover/active brightness), so switching
        // theme swaps the background instantly instead of fading.
        "w-full rounded-md inline-block px-4 py-2 text-accent-fg bg-accent border-none cursor-pointer text-center transition-[filter] duration-300",
        "active:brightness-[90%]",
        "hover:brightness-[90%]",
        "disabled:bg-disabled disabled:text-disabled-fg disabled:pointer-events-none",
        props.className
      )}
    >
      {children}
    </button>
  );
}
