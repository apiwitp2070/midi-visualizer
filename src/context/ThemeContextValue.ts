import { createContext } from "react";

/**
 * The theme in effect. There is no "system" state: the OS preference seeds the
 * initial value on a first visit, after which the theme is purely manual.
 */
export type Theme = "light" | "dark";

/**
 * Must stay in sync with the anti-FOUC script in index.html, which reads this
 * same key before React boots.
 */
export const THEME_STORAGE_KEY = "midi-theme";

const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";

export interface ThemeContextProps {
  theme: Theme;
  /** Flips between light and dark. */
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

export const ThemeContext = createContext<ThemeContextProps | undefined>(
  undefined
);

const prefersDark = (): boolean =>
  typeof window !== "undefined" && window.matchMedia(DARK_MEDIA_QUERY).matches;

/**
 * The stored theme if the user has ever chosen one, otherwise the OS
 * preference. Read once at startup — later OS changes are not tracked, because
 * an explicit toggle is the only way the theme changes after first paint.
 */
export const getInitialTheme = (): Theme => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* Private mode or blocked storage. */
  }
  return prefersDark() ? "dark" : "light";
};

/** Mirrors the theme onto <html>, matching the index.html script. */
export const applyThemeClass = (theme: Theme): void => {
  document.documentElement.classList.toggle("dark", theme === "dark");
};

/**
 * Applies a theme with CSS transitions suppressed, so the switch is instant
 * even on elements that animate color for hover affordances.
 *
 * The `.theme-switching` class (see index.css) is removed after the browser has
 * painted the new colors: the first rAF fires before that paint, so a second is
 * needed to land after it. Without the delay the class would be gone in the
 * same frame and the transitions would still run.
 */
export const applyThemeInstantly = (theme: Theme): void => {
  const root = document.documentElement;

  root.classList.add("theme-switching");
  applyThemeClass(theme);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => root.classList.remove("theme-switching"));
  });
};
