import type { Theme } from "@/context/ThemeContextValue";

/**
 * Bridges CSS design tokens into canvas drawing code.
 *
 * The canvas cannot use Tailwind classes, so it has to read the resolved
 * values of the custom properties defined in src/index.css. Everything the
 * canvas paints is listed here, so the token layer stays the single source of
 * truth for color rather than duplicating hex values in TypeScript.
 */

const CANVAS_TOKENS = {
  note: "--color-note",
  noteFg: "--color-note-fg",
  noteStroke: "--color-note-stroke",
} as const;

export type ThemeColors = Record<keyof typeof CANVAS_TOKENS, string>;

/** Fallbacks matching the light values in index.css, used if a token is
 *  missing (e.g. the stylesheet has not applied yet on the very first paint). */
const FALLBACKS: ThemeColors = {
  note: "#6ca6e4",
  noteFg: "#ffffff",
  noteStroke: "#1e3a5f",
};

/**
 * Resolves the canvas tokens against <html>. Call this once per theme change
 * rather than per frame — getComputedStyle forces a style recalculation.
 *
 * `theme` is the theme the caller expects to be active. It is used to confirm
 * the <html> class has already been updated, guarding against reading the
 * outgoing theme's values if the class is ever applied after render (e.g. if
 * ThemeProvider's synchronous apply is refactored into an effect).
 */
export const readThemeColors = (theme: Theme): ThemeColors => {
  if (typeof window === "undefined") return FALLBACKS;

  const root = document.documentElement;

  if (import.meta.env.DEV) {
    const domIsDark = root.classList.contains("dark");
    if (domIsDark !== (theme === "dark")) {
      console.warn(
        `[themeColors] Reading tokens for "${theme}" but <html> is ` +
          `"${domIsDark ? "dark" : "light"}". The theme class must be applied ` +
          `before colors are resolved, or the canvas will use stale values.`
      );
    }
  }

  const styles = getComputedStyle(root);

  const read = (token: string, fallback: string) =>
    styles.getPropertyValue(token).trim() || fallback;

  return {
    note: read(CANVAS_TOKENS.note, FALLBACKS.note),
    noteFg: read(CANVAS_TOKENS.noteFg, FALLBACKS.noteFg),
    noteStroke: read(CANVAS_TOKENS.noteStroke, FALLBACKS.noteStroke),
  };
};

/**
 * The single place that maps a note to its fill color.
 *
 * Every note currently gets the same theme-invariant `--color-note`, so this
 * takes only the palette. To colour notes by pitch class or by track (as other
 * MIDI players do): add --color-note-1 ... --color-note-12 to index.css, read
 * them in readThemeColors above, then add a `note: Note` parameter here and
 * switch on `note.midi % 12` (or the track index). The canvas already calls
 * this per note, so that stays a change to this function plus its one call
 * site — not a sweep through the drawing code.
 */
export const getNoteColor = (colors: ThemeColors): string => colors.note;
