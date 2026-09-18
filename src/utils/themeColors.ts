import type { Theme } from "@/context/ThemeContextValue";

/**
 * Bridges CSS design tokens into canvas drawing code.
 *
 * The canvas cannot use Tailwind classes, so it has to read the resolved
 * values of the custom properties defined in src/index.css. Everything the
 * canvas paints is listed here, so the token layer stays the single source of
 * truth for color rather than duplicating hex values in TypeScript.
 */

/** One hue per pitch class, indexed by `midi % 12`. */
const NOTE_TOKENS = Array.from(
  { length: 12 },
  (_, index) => `--color-note-${index}`,
);

const CANVAS_TOKENS = {
  noteFg: "--color-note-fg",
  playhead: "--color-playhead",
  lane: "--color-lane",
  laneAlt: "--color-lane-alt",
  laneC: "--color-lane-c",
  keyWhite: "--color-key-white",
  keyBlack: "--color-key-black",
  keyBorder: "--color-key-border",
  surfaceSunken: "--color-surface-sunken",
  textMuted: "--color-text-muted",
} as const;

export type ThemeColors = Record<keyof typeof CANVAS_TOKENS, string> & {
  /** Twelve pitch-class hues, index 0 = C. */
  notes: string[];
};

/** Fallbacks matching the values in index.css, used if a token is missing
 *  (e.g. the stylesheet has not applied yet on the very first paint). */
const FALLBACKS: ThemeColors = {
  notes: [
    "#f0b429",
    "#e39320",
    "#e8743c",
    "#d55a45",
    "#e05561",
    "#e0457f",
    "#c93f8e",
    "#b545a4",
    "#9a4bb0",
    "#7d54ba",
    "#6560bd",
    "#4f6ec4",
  ],
  noteFg: "#1a1014",
  playhead: "#f5e6c8",
  lane: "#efeae1",
  laneAlt: "#e8e2d7",
  laneC: "#ddd4c5",
  keyWhite: "#fdfcfa",
  keyBlack: "#23202b",
  keyBorder: "#2a2530",
  surfaceSunken: "#f0ece5",
  textMuted: "#6b6357",
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
          `before colors are resolved, or the canvas will use stale values.`,
      );
    }
  }

  const styles = getComputedStyle(root);

  const read = (token: string, fallback: string) =>
    styles.getPropertyValue(token).trim() || fallback;

  // Derived from CANVAS_TOKENS rather than listed again, so adding a token is
  // a one-line change and the two lists cannot drift apart.
  const resolved = Object.fromEntries(
    Object.entries(CANVAS_TOKENS).map(([key, token]) => [
      key,
      read(token, FALLBACKS[key as keyof typeof CANVAS_TOKENS]),
    ]),
  ) as Record<keyof typeof CANVAS_TOKENS, string>;

  return {
    ...resolved,
    notes: NOTE_TOKENS.map((token, index) =>
      read(token, FALLBACKS.notes[index]),
    ),
  };
};

/**
 * The single place that maps a note to its fill color.
 *
 * Notes are coloured by pitch class, so the same pitch is always the same
 * hue and an octave reads as a repeat rather than a new colour. The ramp in
 * index.css is analogous (amber -> rose -> violet) rather than a full
 * rainbow, so simultaneous notes read as a related family.
 *
 * To colour by track instead, take the track index here and index the same
 * palette with it — this function and its call sites in MidiVisualizer are
 * the only places that map a note to a colour.
 */
export const getNoteColor = (colors: ThemeColors, midi: number): string =>
  colors.notes[((midi % 12) + 12) % 12];
