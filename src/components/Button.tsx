export default function Button({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className="w-full rounded-md inline-block px-4 py-2 text-white bg-[#3396ff] border-none cursor-pointer text-center transition-colors duration-300 active:bg-[#204e80]"
      {...props}
    >
      {children}
    </button>
  );
}
