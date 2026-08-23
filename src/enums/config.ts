/**
 * Geometry only. Colors live in the design tokens in src/index.css and reach
 * the canvas via src/utils/themeColors.ts, so they can follow the theme.
 */
export const config = {
  // Full 88-key piano. Notes outside this range are still played but have no
  // key to land on, so narrowing it means notes you hear but cannot see.
  startMidi: 21, // A0
  endMidi: 108, // C8
  // Keys have two independent axes: `size` along the pitch axis, where only
  // white keys take up space, and depth toward the player, where black keys
  // stop short so the white key shows below them.
  whiteKeySize: 22,
  blackKeySizeRatio: 0.62, // of a white key, along the pitch axis
  keyboardDepth: 110,
  blackKeyDepthRatio: 0.62, // of the keyboard depth

  // Keeps adjacent note columns visually separated.
  noteInset: 1.5,

  // Trimmed off each note's tail so a repeated note reads as two notes rather
  // than one long one.
  noteTailGap: 1.5,

  // How far above the bottom edge the playhead sits. Any inset leaves a strip
  // of lane below it, reading as a gap between the playhead and the keys.
  playheadInset: 0,

  noteRadius: 3,
};

/** Pitch classes that are black keys on a piano. */
const BLACK_PITCH_CLASSES = new Set([1, 3, 6, 8, 10]);

export const isBlackKey = (midi: number): boolean =>
  BLACK_PITCH_CLASSES.has(((midi % 12) + 12) % 12);

/**
 * Position of one key along the pitch axis.
 *
 * Deliberately orientation-neutral: `offset`/`size` describe where a pitch
 * sits along the pitch axis without saying which screen axis that is. The
 * keyboard renders it as x, and the canvas uses the identical numbers to
 * place note columns and lane striping — which is what stops the two halves
 * of the visualizer from drifting apart.
 */
export interface KeyLayout {
  midi: number;
  isBlack: boolean;
  /** Distance from the low-pitch end of the keyboard to this key's near edge. */
  offset: number;
  /** Extent along the pitch axis. */
  size: number;
  /** Centre line, used to place the matching note column. */
  center: number;
  /** Fraction of the keyboard depth this key occupies. Black keys stop short. */
  depth: number;
}

export interface KeyboardLayout {
  keys: KeyLayout[];
  byMidi: Map<number, KeyLayout>;
  /** Total extent along the pitch axis. */
  totalSize: number;
  whiteKeySize: number;
}

/**
 * Builds the keyboard layout, low notes first.
 *
 * White keys tile the pitch axis in ascending order at `whiteKeySize` each.
 * A black key is then centred on the seam between its two neighbouring white
 * keys and made narrower, so it overlaps both — the same relationship a real
 * keyboard has.
 *
 * `totalSize` is the natural extent at `whiteKeySize`; callers that need to
 * fill a specific pixel span pass a scaled `whiteKeySize` instead.
 */
export const buildKeyboardLayout = (
  whiteKeySize: number = config.whiteKeySize,
): KeyboardLayout => {
  const { startMidi, endMidi, blackKeySizeRatio, blackKeyDepthRatio } = config;

  const whiteMidis: number[] = [];
  for (let midi = startMidi; midi <= endMidi; midi++) {
    if (!isBlackKey(midi)) whiteMidis.push(midi);
  }

  const totalSize = whiteMidis.length * whiteKeySize;

  // Ascending: the lowest white key sits at the low-pitch end.
  const whiteOffsets = new Map<number, number>();
  whiteMidis.forEach((midi, index) => {
    whiteOffsets.set(midi, index * whiteKeySize);
  });

  const blackSize = whiteKeySize * blackKeySizeRatio;
  const keys: KeyLayout[] = [];

  for (let midi = startMidi; midi <= endMidi; midi++) {
    if (!isBlackKey(midi)) {
      const offset = whiteOffsets.get(midi)!;
      keys.push({
        midi,
        isBlack: false,
        offset,
        size: whiteKeySize,
        center: offset + whiteKeySize / 2,
        depth: 1,
      });
      continue;
    }

    // A black key straddles the seam between the white key below it in pitch
    // and the one above. Both exist for every black key in a contiguous
    // range, except at a range boundary — fall back to whichever exists.
    const belowOffset = whiteOffsets.get(midi - 1);
    const aboveOffset = whiteOffsets.get(midi + 1);
    const seam =
      belowOffset !== undefined
        ? belowOffset + whiteKeySize
        : aboveOffset !== undefined
          ? aboveOffset
          : 0;

    const offset = seam - blackSize / 2;
    keys.push({
      midi,
      isBlack: true,
      offset,
      size: blackSize,
      center: seam,
      depth: blackKeyDepthRatio,
    });
  }

  return {
    keys,
    byMidi: new Map(keys.map((key) => [key.midi, key])),
    totalSize,
    whiteKeySize,
  };
};
