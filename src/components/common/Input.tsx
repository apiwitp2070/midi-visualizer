import { cn } from "@/utils/cn";

export default function Input({
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-300 rounded-md px-3 py-2 transition duration-300 focus:outline-hidden focus:border-slate-400 hover:border-slate-300 shadow-xs focus:shadow-sm",
        props.className
      )}
    />
  );
}
