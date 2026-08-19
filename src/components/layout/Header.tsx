import { useMIDIOutputs } from "@react-midi/hooks";
import ThemeToggle from "./ThemeToggle";
import { cn } from "@/utils/cn";

export default function Header() {
  const { output } = useMIDIOutputs();

  return (
    <header className="flex h-12 w-full items-center justify-between gap-4 border-b border-border bg-surface-raised px-4 text-text shadow-xs">
      <div className="flex min-w-0 items-baseline gap-3">
        <span className="font-display text-lg font-bold tracking-tight whitespace-nowrap">
          MIDI<span className="text-accent">.</span>visualizer
        </span>
      </div>

      <div className="hidden min-w-0 flex-1 items-center gap-4 text-xs text-text-muted sm:flex sm:flex-row-reverse">
        <span className="flex items-center gap-1.5">
          <span
            className={cn(
              "size-1.5 rounded-full",
              output ? "bg-green-400" : "bg-text-placeholder",
            )}
          />
          {output ? "MIDI Device connected" : "No MIDI device"}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <ThemeToggle />

        <a
          href="https://github.com/apiwitp2070/midi-visualizer"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View source on GitHub"
          className="rounded-md p-1 text-text-muted transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {/* The mark is a fixed dark glyph on transparency, so it vanishes on
              a dark background. Invert it there to keep it legible. */}
          <img
            src="github-mark.svg"
            width={20}
            height={20}
            alt=""
            className="block dark:invert"
          />
        </a>
      </div>
    </header>
  );
}
