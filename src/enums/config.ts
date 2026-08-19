/**
 * Geometry only. Colors live in the design tokens in src/index.css and reach
 * the canvas via src/utils/themeColors.ts, so they can follow the theme.
 */
export const config = {
  laneHeight: 15,
  startMidi: 36,
  endMidi: 96,
  pixelsPerSecond: 200,

  // note config
  noteHeight: 14,
  noteSpacing: 1,
  noteStartOffset: 500,

  // note geometry
  noteRadius: 2,
  noteBorderWidth: 1,
};
