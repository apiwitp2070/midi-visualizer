import { cn } from "@/utils/cn";
import { ReactNode } from "react";

interface SiderProps {
  children: ReactNode;
  open: boolean;
  onClose: () => void;
}

/**
 * The control column.
 *
 * Above `lg` it is an inline panel that collapses to zero width. Below `lg`
 * there is not enough room for both the controls and the keyboard, so it
 * becomes an overlay drawer with a scrim instead of squeezing the instrument.
 */
const Sider = ({ children, open, onClose }: SiderProps) => {
  return (
    <>
      {/* Scrim, drawer sizes only. */}
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 top-12 z-30 bg-black/50 transition-opacity duration-300 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden
      />

      <aside
        className={cn(
          "z-40 h-full shrink-0 border-r border-border bg-surface-sunken",
          "scroll-hidden overflow-x-hidden overflow-y-auto",
          // Only transform/width animate. Narrowed from transition-all so a
          // theme switch does not fade the background and border too.
          "max-lg:fixed max-lg:top-12 max-lg:bottom-0 max-lg:left-0 max-lg:w-[min(360px,85vw)]",
          "max-lg:transition-transform max-lg:duration-300 max-lg:ease-out",
          open ? "max-lg:translate-x-0" : "max-lg:-translate-x-full",
          "lg:transition-[width] lg:duration-300 lg:ease-in-out",
          open ? "lg:w-[340px]" : "lg:w-0",
        )}
      >
        <div className="flex w-[min(360px,85vw)] flex-col gap-6 p-4 lg:w-[340px]">
          {children}
        </div>
      </aside>
    </>
  );
};

export default Sider;

/**
 * A titled group of related panels.
 *
 * `note` carries a single explanation for the whole group — the MIDI-device
 * features previously repeated the same "connect your device" line three
 * times, once per panel.
 */
export const SiderSection = ({
  title,
  note,
  dimmed,
  children,
}: {
  title: string;
  note?: string;
  dimmed?: boolean;
  children: ReactNode;
}) => (
  <section className={cn(dimmed && "opacity-60")}>
    <div className="mb-3 flex items-baseline justify-between gap-2">
      <h2 className="text-[12px] font-bold text-text-muted">{title}</h2>
    </div>

    {note && <p className="mb-3 text-xs text-text-muted">{note}</p>}

    <div className="flex flex-col gap-2">{children}</div>
  </section>
);
