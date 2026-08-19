import { useMemo } from "react";
import { readThemeColors } from "@/utils/themeColors";
import { useTheme } from "./useTheme";

/**
 * Canvas-ready colors, re-resolved whenever the theme changes.
 *
 * Consumers should include the returned object in the dependency array of any
 * effect that paints, so a theme switch triggers a repaint.
 */
export const useThemeColors = () => {
  const { theme } = useTheme();

  // `theme` is passed through rather than merely listed as a dependency so the
  // memo genuinely depends on it. ThemeProvider updates the <html> class
  // synchronously before this re-renders, so getComputedStyle already sees the
  // incoming theme's values.
  return useMemo(() => readThemeColors(theme), [theme]);
};
