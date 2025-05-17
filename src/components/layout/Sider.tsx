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
          "h-full pb-4 border-r border-gray-300 transition-all duration-500 ease-in-out overflow-y-scroll overflow-x-hidden",
          showSidebar ? "w-[360px]" : "w-0"
        )}
      >
        <div className="w-[360px] p-4 flex flex-col gap-8">{children}</div>
      </div>

      <button
        onClick={() => setShowSidebar((prev) => !prev)}
        className={cn(
          "absolute top-0 z-20 transition-all duration-500 ease-in-out px-2 h-8 bg-gray-100 text-sm",
          showSidebar ? "left-[360px]" : "left-0"
        )}
      >
        {!showSidebar && "Menu"} ☰
      </button>
    </>
  );
};

export default Sider;
