import { cn } from "@/utils/cn";

export default function Button({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "w-full rounded-md inline-block px-4 py-2 text-white bg-[#3396ff] border-none cursor-pointer text-center transition-all duration-300",
        "active:brightness-[90%]",
        "hover:brightness-[90%]",
        "disabled:bg-gray-300 disabled:pointer-events-none",
        props.className
      )}
    >
      {children}
    </button>
  );
}
