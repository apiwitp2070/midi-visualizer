import { ReactNode } from "react";

interface AccordionProps {
  id: string;
  title: string;
  children: ReactNode;
}

export default function Accordion({ id, title, children }: AccordionProps) {
  return (
    <div>
      <div className="w-full max-w-md mx-auto space-y-2">
        <input type="checkbox" id={id} className="peer hidden" />

        <label
          htmlFor={id}
          className="flex cursor-pointer items-center justify-between"
        >
          <b className="text-base">{title}</b>
          <svg
            className="h-5 w-5 transition-transform duration-300 peer-checked:rotate-180"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </label>

        <div className="max-h-0 overflow-y-auto transition-all duration-300 peer-checked:max-h-96 p-0 peer-checked:py-4 bg-white">
          {children}
        </div>
      </div>
      <div className="w-full h-[1px] bg-slate-400 mt-6" />
    </div>
  );
}
