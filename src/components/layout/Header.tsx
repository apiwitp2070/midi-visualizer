import ThemeToggle from "./ThemeToggle";

export default function Header() {
  return (
    <header className="w-full px-4 bg-surface-raised text-text border-b border-border h-12 flex justify-between items-center shadow-xs font-bold">
      <p>Midi Visualizer</p>

      <div className="flex items-center gap-4">
        <ThemeToggle />

        <a
          href="https://github.com/apiwitp2070/midi-visualizer"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View source on GitHub"
        >
          {/* The mark is a fixed dark glyph on transparency, so it vanishes on
              a dark background. Invert it there to keep it legible. */}
          <img
            src="github-mark.svg"
            width={24}
            height={24}
            alt=""
            className="block dark:invert"
          />
        </a>
      </div>
    </header>
  );
}
