import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  buildKeyboardLayout,
  config,
  type KeyLayout,
  type KeyboardLayout,
} from "@/enums/config";
import { Note } from "@tonejs/midi/dist/Note";
import { useMidiVisualization } from "@/context/useMidiVisualization";
import { DELAY_OFFSET } from "@/context/MidiVisualizeContext";
import { useThemeColors } from "@/context/useThemeColors";
import { getNoteColor, type ThemeColors } from "@/utils/themeColors";

/**
 * Lit keys, by pitch, valued by the start time of the note lighting them.
 * The value is what distinguishes a retrigger from a held note: both keep the
 * key lit, but only a retrigger changes the start time.
 */
type ActiveNotes = Map<number, number>;

/** Thickness of the playhead line, in CSS px. */
const PLAYHEAD_THICKNESS = 1.5;

/** Duration of a key's strike flash, in seconds. Mirrors the old CSS keyframe. */
const STRIKE_SECONDS = 0.08;

/** Peak opacity of that flash, matching the keyframe's `from`. */
const STRIKE_ALPHA = 0.85;

/** Tracks the rendered pixel size of an element, for a size-driven canvas. */
const useElementSize = <T extends HTMLElement>() => {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((prev) =>
        prev.width === width && prev.height === height
          ? prev
          : { width, height },
      );
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, size] as const;
};

const MidiVisualizer = () => {
  const {
    originalMidi,
    canvasState,
    midiNotes: notes,
    setTravelDistance,
  } = useMidiVisualization();

  // Canvas cannot read CSS classes, so token values are resolved to strings.
  const themeColors = useThemeColors();

  const [frameRef, frameSize] = useElementSize<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  // In a ref because the draw loop must survive resize and theme changes;
  // re-seeding the origin would snap visuals back to t=0 while the audio's
  // already-scheduled notes kept going.
  const startTimeRef = useRef<number | null>(null);
  const prevTimeRef = useRef<number | null>(null);
  // A ref, not state: this changes on almost every frame during playback, and
  // committing it to React would re-render the component 60 times a second.
  // The draw loop is the only reader, so nothing needs a render to see it.
  const activeNotesRef = useRef<ActiveNotes>(new Map());

  // The keyboard is part of the canvas, so its depth has to be known before
  // sizing the drawing surface. Measured from the outer frame, since the
  // stage's height is derived from this value.
  const keyboardDepth = Math.round(
    Math.max(44, Math.min(config.keyboardDepth, frameSize.height * 0.18)),
  );

  // The canvas fills the frame; the note stage is what remains above the keys.
  const canvasWidth = frameSize.width;
  const canvasHeight = frameSize.height;
  const stageHeight = Math.max(canvasHeight - keyboardDepth, 0);

  // Both the keyboard and the canvas note columns read from this one layout,
  // which is what stops them drifting apart.
  const layout = useMemo(() => {
    const natural = buildKeyboardLayout();
    if (!canvasWidth) return natural;

    const whiteKeyCount = natural.totalSize / natural.whiteKeySize;
    // Unclamped on purpose: a minimum key size would push the keyboard past
    // the stage edge, where clipping would hide the top octaves and leave
    // notes falling into columns with no key under them. Fitting wins.
    const fitted = canvasWidth / whiteKeyCount;
    return buildKeyboardLayout(fitted);
  }, [canvasWidth]);

  // Feeds songDelay, which the audio is scheduled against. Must stay equal to
  // `playheadY` in the draw effect or sound and visuals drift apart.
  const travelDistance = stageHeight
    ? stageHeight - config.playheadInset
    : 0;

  useEffect(() => {
    if (travelDistance > 0) setTravelDistance(travelDistance);
  }, [travelDistance, setTravelDistance]);

  const visibleNotes = useMemo(
    () => notes.filter((note) => note.time + note.duration > 0),
    [notes],
  );

  // getComputedStyle forces a style recalculation, so keep it out of the draw
  // loop, which runs every frame.
  const noteFont = useMemo(() => {
    const monoFamily =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--font-mono")
        .trim() || "monospace";
    return `600 10px ${monoFamily}`;
  }, []);

  // Everything the draw loop reads, behind one ref. The loop is started by an
  // effect keyed only on playback state, so without this a resize or theme
  // change would tear the loop down and rebuild it mid-song.
  const sceneRef = useRef({
    layout,
    themeColors,
    visibleNotes,
    noteFont,
    canvasWidth,
    canvasHeight,
    stageHeight,
    keyboardDepth,
  });
  // Written in an effect, not during render: a ref mutated mid-render is not
  // safe under concurrent rendering, and the draw loop only needs the values
  // that were actually committed.
  useEffect(() => {
    sceneRef.current = {
      layout,
      themeColors,
      visibleNotes,
      noteFont,
      canvasWidth,
      canvasHeight,
      stageHeight,
      keyboardDepth,
    };
  }, [
    layout,
    themeColors,
    visibleNotes,
    noteFont,
    canvasWidth,
    canvasHeight,
    stageHeight,
    keyboardDepth,
  ]);

  const reducedMotion = useRef(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => (reducedMotion.current = query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  // Sizing the backing store is a separate concern from drawing: it must not
  // happen inside the animation loop, where it would clear the canvas and
  // reset the transform on every frame.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvasWidth || !canvasHeight) return;

    // Render at device resolution so notes and labels stay crisp on retina,
    // then work in CSS pixels for the rest of the drawing code.
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(canvasWidth * dpr);
    canvas.height = Math.round(canvasHeight * dpr);
    const ctx = canvas.getContext("2d");
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, [canvasWidth, canvasHeight]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const paint = (currentTime: number | null) => {
      drawScene(ctx, sceneRef.current, currentTime, activeNotesRef.current, {
        reducedMotion: reducedMotion.current,
      });
    };

    if (canvasState !== "PLAY") {
      // Released so the next Play starts a fresh clock.
      startTimeRef.current = null;
      prevTimeRef.current = null;
      activeNotesRef.current = new Map();
      // Idle still paints, so the stage reads as an instrument waiting.
      paint(null);
      return;
    }

    if (startTimeRef.current === null) {
      startTimeRef.current = performance.now();
    }
    const startTime = startTimeRef.current;

    // Starts the clock before zero so a note at time 0 falls the length of
    // the stage instead of appearing on the playhead. Must stay in step with
    // `songDelay`, which the audio is scheduled against — except for
    // AUDIO_LEAD_MS, left out here so sound arrives fractionally ahead of
    // the key lighting up.
    const leadIn =
      (sceneRef.current.stageHeight - config.playheadInset) /
        config.pixelsPerSecond +
      DELAY_OFFSET / 1000;

    const animate = () => {
      const currentTime = (performance.now() - startTime) / 1000 - leadIn;
      updateActiveNotes(
        sceneRef.current.visibleNotes,
        activeNotesRef.current,
        currentTime,
        prevTimeRef,
      );
      paint(currentTime);
      animationRef.current = requestAnimationFrame(animate);
    };

    // Scheduled rather than called straight through, so animationRef always
    // holds the live frame — a synchronous first call would run one frame
    // before the ref was set, leaving that frame uncancellable.
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [canvasState]);

  // A theme switch or resize while stopped has no running loop to repaint the
  // idle stage, so it is repainted here.
  useEffect(() => {
    if (canvasState === "PLAY") return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !canvasWidth || !canvasHeight) return;
    drawScene(ctx, sceneRef.current, null, new Map(), {
      reducedMotion: reducedMotion.current,
    });
  }, [canvasState, themeColors, layout, canvasWidth, canvasHeight, visibleNotes]);

  return (
    <div
      ref={frameRef}
      className="relative flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-surface-sunken shadow-lg"
    >
      <canvas ref={canvasRef} className="canvas-element" />

      {!originalMidi && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-lg border border-border bg-surface-raised/90 px-6 py-4 text-center shadow-lg backdrop-blur-sm">
            <p className="font-display text-lg font-semibold tracking-tight text-text">
              No file loaded
            </p>
            <p className="mt-1 text-sm text-text-muted">
              Choose a MIDI file to start playing.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MidiVisualizer;

// helpers

interface Scene {
  layout: KeyboardLayout;
  themeColors: ThemeColors;
  visibleNotes: Note[];
  noteFont: string;
  canvasWidth: number;
  canvasHeight: number;
  stageHeight: number;
  keyboardDepth: number;
}

/**
 * Recomputes which keys are lit, in place.
 *
 * Mutates `active` rather than building a new map each frame: at 60fps the
 * allocation is the whole cost of this function, and nothing outside the draw
 * loop observes the map.
 */
function updateActiveNotes(
  notes: Note[],
  active: ActiveNotes,
  currentTime: number,
  prevTimeRef: React.RefObject<number | null>,
) {
  // Tested against the interval since the last frame, not this instant: a
  // note shorter than one frame would otherwise never light its key.
  const prevTime = prevTimeRef.current ?? currentTime;
  prevTimeRef.current = currentTime;

  active.clear();
  for (const note of notes) {
    if (note.time <= currentTime && note.time + note.duration >= prevTime) {
      // On overlap, the later start wins so a retrigger always registers.
      const existing = active.get(note.midi);
      if (existing === undefined || note.time > existing) {
        active.set(note.midi, note.time);
      }
    }
  }
}

/**
 * Paints one whole frame: lanes, falling notes, playhead, and the keyboard.
 *
 * `currentTime` of null means the stage is idle — lanes, playhead and unlit
 * keys, with no notes in flight.
 */
function drawScene(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  currentTime: number | null,
  active: ActiveNotes,
  options: { reducedMotion: boolean },
) {
  const {
    layout,
    themeColors: colors,
    visibleNotes,
    noteFont,
    canvasWidth: width,
    canvasHeight: height,
    stageHeight,
    keyboardDepth,
  } = scene;
  if (!width || !height) return;

  // Where a note is played. Note positions and the audio lead time are both
  // derived from this, so it is what keeps sound and visuals agreeing.
  const playheadY = stageHeight - config.playheadInset;

  ctx.clearRect(0, 0, width, height);

  // The stage is clipped so a note never paints over the keyboard below it.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, width, stageHeight);
  ctx.clip();

  drawLanes(ctx, layout, colors, stageHeight);
  if (currentTime !== null) {
    visibleNotes.forEach((note) => {
      drawNote(
        ctx,
        note,
        currentTime,
        colors,
        layout,
        playheadY,
        stageHeight,
        noteFont,
      );
    });
  }

  // Painted last so a note crossing the line cannot overdraw it.
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = colors.playhead;
  // Drawn inward from playheadY so the line stays on canvas when the playhead
  // sits on the stage's bottom edge.
  ctx.fillRect(0, playheadY - PLAYHEAD_THICKNESS, width, PLAYHEAD_THICKNESS);
  ctx.restore();

  drawKeyboard(
    ctx,
    layout,
    colors,
    active,
    currentTime,
    stageHeight,
    keyboardDepth,
    width,
    options.reducedMotion,
  );
}

function drawLanes(
  ctx: CanvasRenderingContext2D,
  layout: KeyboardLayout,
  colors: ThemeColors,
  stageHeight: number,
) {
  layout.keys.forEach((key) => {
    if (key.isBlack) return;
    // Banded by pitch class, not column index, so the pattern repeats per
    // octave instead of drifting when the keyboard is scaled to fit.
    const pitchClass = ((key.midi % 12) + 12) % 12;
    ctx.fillStyle =
      pitchClass === 0
        ? colors.laneC
        : pitchClass < 5
          ? colors.lane
          : colors.laneAlt;
    ctx.fillRect(key.offset, 0, key.size, stageHeight);
  });
}

function drawNote(
  ctx: CanvasRenderingContext2D,
  note: Note,
  currentTime: number,
  colors: ThemeColors,
  layout: KeyboardLayout,
  playheadY: number,
  stageHeight: number,
  noteFont: string,
) {
  const key = layout.byMidi.get(note.midi);
  // Notes outside the rendered key range have nowhere to land.
  if (!key) return;

  const { pixelsPerSecond, noteInset, noteRadius, noteTailGap } = config;

  // startY is the note's leading edge — the point that lands on the
  // playhead. The body trails upward behind it, so a held note is still
  // crossing after its start has passed.
  const startY = playheadY - (note.time - currentTime) * pixelsPerSecond;
  const noteLength = Math.max(note.duration * pixelsPerSecond, 3);
  const top = startY - noteLength;

  if (startY < 0 || top > stageHeight) return;

  const fill = getNoteColor(colors, note.midi);
  const noteWidth = Math.max(key.size - noteInset * 2, 3);
  const x = key.offset + noteInset;

  // Trimmed off the tail so a repeated note reads as two notes rather than
  // one long one. Taken from the trailing edge, leaving the leading edge
  // on the playhead so the note still lands when it sounds. Short notes
  // scale the trim instead of taking it whole, which would erase them.
  const drawnLength =
    noteLength > noteTailGap * 2
      ? noteLength - noteTailGap
      : Math.max(noteLength * 0.6, 2);
  const drawnTop = top + (noteLength - drawnLength);

  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(
    x,
    drawnTop,
    noteWidth,
    drawnLength,
    Math.min(noteRadius, drawnLength / 2),
  );
  ctx.fill();

  // Labels drop out rather than overflow when a note is too small.
  if (noteWidth >= 22 && drawnLength >= 26) {
    ctx.fillStyle = colors.noteFg;
    ctx.font = noteFont;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(note.name, x + noteWidth / 2, drawnTop + drawnLength / 2);
  }
}

/**
 * The piano: a horizontal strip below the note stage, low notes left.
 *
 * An active key lights in the same pitch-class colour as the note that landed
 * on it, which is what ties a falling note to the key it belongs to. Drawn on
 * the canvas rather than as DOM nodes so playback costs no React renders —
 * 88 keys re-rendering per note was the visualizer's dominant frame cost.
 */
function drawKeyboard(
  ctx: CanvasRenderingContext2D,
  layout: KeyboardLayout,
  colors: ThemeColors,
  active: ActiveNotes,
  currentTime: number | null,
  top: number,
  depth: number,
  width: number,
  reducedMotion: boolean,
) {
  ctx.save();
  ctx.translate(0, top);

  ctx.fillStyle = colors.surfaceSunken;
  ctx.fillRect(0, 0, width, depth);

  // Kept as low as the text allows — the octave markers are the only thing
  // orienting the eye along the strip.
  const labelable = layout.whiteKeySize >= 12;

  // White keys first so the black keys paint over their seams.
  layout.keys.forEach((key) => {
    if (key.isBlack) return;
    drawKey(ctx, key, colors, active, currentTime, depth, labelable, reducedMotion);
  });
  layout.keys.forEach((key) => {
    if (!key.isBlack) return;
    drawKey(ctx, key, colors, active, currentTime, depth, labelable, reducedMotion);
  });

  // The strip's top edge, matching the border the DOM keyboard used to carry.
  ctx.fillStyle = colors.keyBorder;
  ctx.fillRect(0, 0, width, 1);

  ctx.restore();
}

function drawKey(
  ctx: CanvasRenderingContext2D,
  key: KeyLayout,
  colors: ThemeColors,
  active: ActiveNotes,
  currentTime: number | null,
  depth: number,
  labelable: boolean,
  reducedMotion: boolean,
) {
  const startedAt = active.get(key.midi);
  const isActive = startedAt !== undefined;
  const glow = getNoteColor(colors, key.midi);
  const keyHeight = depth * key.depth;

  ctx.fillStyle = isActive
    ? glow
    : key.isBlack
      ? colors.keyBlack
      : colors.keyWhite;
  ctx.fillRect(key.offset, 0, key.size, keyHeight);

  if (!key.isBlack) {
    // The seam between adjacent white keys.
    ctx.fillStyle = colors.keyBorder;
    ctx.globalAlpha = 0.25;
    ctx.fillRect(key.offset + key.size - 1, 0, 1, keyHeight);
    ctx.globalAlpha = 1;
  }

  // The strike flash. A held key would otherwise show one steady light, with
  // nothing marking a repeated note; this replays per note start, which is
  // what makes a retrigger visible.
  if (isActive && currentTime !== null && !reducedMotion) {
    const age = currentTime - startedAt;
    if (age >= 0 && age < STRIKE_SECONDS) {
      ctx.save();
      // Overbrightened rather than a different colour, so a strike reads as
      // the key surging rather than blinking.
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = STRIKE_ALPHA * (1 - age / STRIKE_SECONDS);
      ctx.fillStyle = glow;
      ctx.fillRect(key.offset, 0, key.size, keyHeight);
      ctx.restore();
    }
  }

  // C only: enough to orient by octave without naming every key.
  if (!key.isBlack && key.midi % 12 === 0 && labelable) {
    ctx.fillStyle = isActive ? colors.noteFg : colors.textMuted;
    ctx.font = "600 9px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(midiToNoteName(key.midi), key.center, keyHeight - 4);
  }
}

const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

const midiToNoteName = (midi: number) => {
  const octave = Math.floor((midi - 12) / 12);
  return `${NOTE_NAMES[midi % 12]}${octave}`;
};
