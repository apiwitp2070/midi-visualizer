import { cn } from "@/utils/cn";

export default function Input({
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        // border-color and box-shadow animate on hover/focus. Listing them
        // explicitly (rather than bare `transition`) keeps a theme switch
        // instant while preserving those interactions.
        "w-full bg-transparent placeholder:text-text-placeholder text-text text-sm border border-border rounded-md px-3 py-2 transition-[border-color,box-shadow] duration-300 focus:outline-hidden focus:border-border-strong hover:border-border-strong shadow-xs focus:shadow-sm",
        props.className
      )}
    />
  );
}
