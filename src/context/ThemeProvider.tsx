import { useCallback, useMemo, useState } from "react";
import {
  THEME_STORAGE_KEY,
  Theme,
  ThemeContext,
  applyThemeInstantly,
  getInitialTheme,
} from "./ThemeContextValue";

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  // Derived in the initializer rather than a mount effect, so the first render
  // matches what the index.html anti-FOUC script already painted. This also
  // avoids react-hooks/set-state-in-effect, whose warning budget is exhausted.
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  // The <html> class is applied synchronously rather than in an effect:
  // useThemeColors resolves CSS custom properties during render via
  // getComputedStyle, and an effect would run after that render, leaving the
  // canvas reading the outgoing theme's values.
  const setTheme = useCallback((next: Theme) => {
    applyThemeInstantly(next);
    setThemeState(next);

    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* Private mode or blocked storage: the choice still applies this session. */
    }
  }, []);

  const toggleTheme = useCallback(
    () => setTheme(theme === "dark" ? "light" : "dark"),
    [theme, setTheme]
  );

  const value = useMemo(
    () => ({ theme, toggleTheme, setTheme }),
    [theme, toggleTheme, setTheme]
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
};
