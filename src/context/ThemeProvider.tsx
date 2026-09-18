import { useCallback, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import {
  RevealOrigin,
  THEME_STORAGE_KEY,
  Theme,
  ThemeContext,
  applyThemeInstantly,
  getInitialTheme,
  revealTheme,
} from "./ThemeContextValue";

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  const setTheme = useCallback((next: Theme, origin?: RevealOrigin) => {
    revealTheme(() => {
      flushSync(() => {
        applyThemeInstantly(next);
        setThemeState(next);
      });
    }, origin);

    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* Private mode or blocked storage: the choice still applies this session. */
    }
  }, []);

  const toggleTheme = useCallback(
    (origin?: RevealOrigin) =>
      setTheme(theme === "dark" ? "light" : "dark", origin),
    [theme, setTheme],
  );

  const value = useMemo(
    () => ({ theme, toggleTheme, setTheme }),
    [theme, toggleTheme, setTheme],
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
};
