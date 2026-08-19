import { cn } from "@/utils/cn";
import { ReactNode, useState } from "react";

interface AppLayoutProps {
  children: ReactNode;
}

const Sider = ({ children }: AppLayoutProps) => {
  const [showSidebar, setShowSidebar] = useState(true);

  return (
    <>
      <div
        className={cn(
          // Only width animates (the slide). Narrowed from transition-all so a
          // theme switch does not fade the background and border too.
          "h-full pb-4 border-r border-border bg-surface-sunken transition-[width] duration-500 ease-in-out overflow-y-scroll overflow-x-hidden",
          "scroll-hidden",
          showSidebar ? "w-[360px]" : "w-0"
        )}
      >
        <div className="w-[360px] p-4 flex flex-col gap-8">{children}</div>
      </div>

      <button
        onClick={() => setShowSidebar((prev) => !prev)}
        className={cn(
          "absolute top-0 z-20 transition-[left] duration-500 ease-in-out px-2 h-8 bg-surface-sunken text-text border border-border border-t-0 border-l-0 rounded-br-md text-sm cursor-pointer",
          showSidebar ? "left-[360px]" : "left-0"
        )}
      >
        {!showSidebar && "Menu"} ☰
      </button>
    </>
  );
};

export default Sider;
