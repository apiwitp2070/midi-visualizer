import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/utils/cn";
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
export type ActiveNotes = ReadonlyMap<number, number>;

/** Stable empty map, so an idle keyboard does not allocate one per render. */
const EMPTY_NOTES: ActiveNotes = new Map();

/** Thickness of the playhead line, in CSS px. */
const PLAYHEAD_THICKNESS = 1.5;

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
  const [stageRef, stageSize] = useElementSize<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  // In a ref because the draw effect re-runs on resize and theme change;
  // re-seeding the origin there would snap visuals back to t=0 while the
  // audio's already-scheduled timeouts kept going.
  const startTimeRef = useRef<number | null>(null);
  const prevTimeRef = useRef<number | null>(null);
  const [activeNotes, setActiveNotes] = useState<ActiveNotes>(new Map());

  // Both the DOM keys and the canvas note columns read from this one layout,
  // which is what stops them drifting apart.
  const layout = useMemo(() => {
    const natural = buildKeyboardLayout();
    if (!stageSize.width) return natural;

    const whiteKeyCount = natural.totalSize / natural.whiteKeySize;
    // Unclamped on purpose: a minimum key size would push the keyboard past
    // the stage edge, where overflow:hidden would clip the top octaves and
    // leave notes falling into columns with no key under them. Fitting wins.
    const fitted = stageSize.width / whiteKeyCount;
    return buildKeyboardLayout(fitted);
  }, [stageSize.width]);

  // Feeds songDelay, which the audio is scheduled against. Must stay equal to
  // `playheadY` in the draw effect or sound and visuals drift apart.
  const travelDistance = stageSize.height
    ? stageSize.height - config.playheadInset
    : 0;

  useEffect(() => {
    if (travelDistance > 0) setTravelDistance(travelDistance);
  }, [travelDistance, setTravelDistance]);

  const visibleNotes = useMemo(
    () => notes.filter((note) => note.time + note.duration > 0),
    [notes],
  );

  // getComputedStyle forces a style recalculation, so keep it out of the draw
  // effect, which re-runs on every resize frame.
  const noteFont = useMemo(() => {
    const monoFamily =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--font-mono")
        .trim() || "monospace";
    return `600 10px ${monoFamily}`;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = stageSize;
    if (!width || !height) return;

    // Render at device resolution so notes and labels stay crisp on retina,
    // then work in CSS pixels for the rest of the drawing code.
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const {
      pixelsPerSecond,
      noteInset,
      noteRadius,
      noteTailGap,
      playheadInset,
    } = config;
    // Where a note is played. Note positions and the audio lead time are both
    // derived from this, so it is what keeps sound and visuals agreeing.
    const playheadY = height - playheadInset;

    function drawLanes(ctx: CanvasRenderingContext2D, colors: ThemeColors) {
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
        ctx.fillRect(key.offset, 0, key.size, height);
      });
    }

    function drawPlayhead(ctx: CanvasRenderingContext2D, colors: ThemeColors) {
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = colors.playhead;
      // Drawn inward from playheadY so the line stays on canvas when the
      // playhead sits on the bottom edge.
      ctx.fillRect(
        0,
        playheadY - PLAYHEAD_THICKNESS,
        width,
        PLAYHEAD_THICKNESS,
      );
      ctx.restore();
    }

    function drawNote(
      ctx: CanvasRenderingContext2D,
      note: Note,
      currentTime: number,
      colors: ThemeColors,
    ) {
      const key = layout.byMidi.get(note.midi);
      // Notes outside the rendered key range have nowhere to land.
      if (!key) return;

      // startY is the note's leading edge — the point that lands on the
      // playhead. The body trails upward behind it, so a held note is still
      // crossing after its start has passed.
      const startY = playheadY - (note.time - currentTime) * pixelsPerSecond;
      const noteLength = Math.max(note.duration * pixelsPerSecond, 3);
      const top = startY - noteLength;

      if (startY < 0 || top > height) return;

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
        ctx.fillText(
          note.name,
          x + noteWidth / 2,
          drawnTop + drawnLength / 2,
        );
      }
    }

    function draw(
      ctx: CanvasRenderingContext2D,
      currentTime: number,
      colors: ThemeColors,
    ) {
      ctx.clearRect(0, 0, width, height);
      drawLanes(ctx, colors);
      visibleNotes.forEach((note) => {
        drawNote(ctx, note, currentTime, colors);
      });
      // Painted last so a note crossing the line cannot overdraw it.
      drawPlayhead(ctx, colors);
    }

    function updateActiveNotes(currentTime: number) {
      // Tested against the interval since the last frame, not this instant: a
      // note shorter than one frame would otherwise never light its key.
      const prevTime = prevTimeRef.current ?? currentTime;
      prevTimeRef.current = currentTime;

      // Keyed by pitch, valued by the note's start time. The value is what
      // makes a repeated note visible: two notes on one key are both "lit",
      // but the changing start time tells the key it was struck again.
      const newActiveNotes = new Map<number, number>();
      visibleNotes.forEach((note) => {
        if (note.time <= currentTime && note.time + note.duration >= prevTime) {
          // On overlap, the later start wins so a retrigger always registers.
          const existing = newActiveNotes.get(note.midi);
          if (existing === undefined || note.time > existing) {
            newActiveNotes.set(note.midi, note.time);
          }
        }
      });

      setActiveNotes((prev) => {
        // Compares start times, not just which keys are lit — a retrigger
        // keeps the same key lit and would otherwise look like no change.
        if (
          prev.size === newActiveNotes.size &&
          [...prev].every(([midi, start]) => newActiveNotes.get(midi) === start)
        ) {
          return prev;
        }
        return newActiveNotes;
      });
    }

    function startAnimation() {
      if (startTimeRef.current === null) {
        startTimeRef.current = performance.now();
      }
      const startTime = startTimeRef.current;

      // Starts the clock before zero so a note at time 0 falls the length of
      // the stage instead of appearing on the playhead. Must stay in step with
      // `songDelay`, which the audio is scheduled against — except for
      // AUDIO_LEAD_MS, left out here so sound arrives fractionally ahead of
      // the key lighting up.
      const leadIn = playheadY / pixelsPerSecond + DELAY_OFFSET / 1000;

      function animate() {
        if (!ctx || canvasState === "STOP") return;
        const currentTime = (performance.now() - startTime) / 1000 - leadIn;
        updateActiveNotes(currentTime);
        draw(ctx, currentTime, themeColors);
        animationRef.current = requestAnimationFrame(animate);
      }
      animate();
    }

    if (canvasState === "PLAY") {
      startAnimation();
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      // Released so the next Play starts a fresh clock.
      startTimeRef.current = null;
      prevTimeRef.current = null;
      // Idle still paints, so the stage reads as an instrument waiting.
      ctx.clearRect(0, 0, width, height);
      drawLanes(ctx, themeColors);
      drawPlayhead(ctx, themeColors);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
    // themeColors is a dep so a theme switch repaints immediately rather than
    // waiting for the next playback change.
  }, [canvasState, visibleNotes, noteFont, themeColors, stageSize, layout]);

  // Derived rather than reset in the effect: when playback stops, no key is
  // lit by definition, so there is no need to write state to say so.
  const litNotes = canvasState === "PLAY" ? activeNotes : EMPTY_NOTES;

  // Measured from the outer frame, not the stage: the stage's height depends
  // on this value, so reading it back would be a feedback loop.
  const keyboardDepth = Math.round(
    Math.max(44, Math.min(config.keyboardDepth, frameSize.height * 0.18)),
  );

  return (
    <div
      ref={frameRef}
      className="relative flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-surface-sunken shadow-lg"
    >
      <div ref={stageRef} className="canvas-container">
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

      <Keyboard
        layout={layout}
        activeNotes={litNotes}
        colors={themeColors}
        depth={keyboardDepth}
      />
    </div>
  );
};

export default MidiVisualizer;

// helpers

interface KeyboardProps {
  layout: KeyboardLayout;
  activeNotes: ActiveNotes;
  colors: ThemeColors;
  /** Depth of the keyboard strip, in px. Black keys occupy a fraction of it. */
  depth: number;
}

/**
 * The piano: a horizontal strip below the note stage, low notes left.
 *
 * An active key lights in the same pitch-class colour as the note that landed
 * on it, which is what ties a falling note to the key it belongs to.
 */
const Keyboard = ({ layout, activeNotes, colors, depth }: KeyboardProps) => {
  // Kept as low as the text allows — the octave markers are the only thing
  // orienting the eye along the strip.
  const labelable = layout.whiteKeySize >= 12;

  const renderKey = (key: KeyLayout) => {
    const startedAt = activeNotes.get(key.midi);
    const isActive = startedAt !== undefined;
    const glow = getNoteColor(colors, key.midi);
    // C only: enough to orient by octave without naming every key.
    const showLabel = !key.isBlack && key.midi % 12 === 0 && labelable;

    return (
      <div
        key={key.midi}
        style={{
          left: key.offset,
          width: key.size,
          height: depth * key.depth,
          ...(isActive
            ? { backgroundColor: glow, boxShadow: `0 0 14px ${glow}` }
            : {}),
        }}
        className={cn(
          "absolute top-0 flex items-end justify-center overflow-hidden pb-1",
          // The sustained lit colour. The strike itself is the .key-strike
          // overlay above, which is what makes a repeated note visible.
          "transition-[background-color,box-shadow] duration-80",
          key.isBlack
            ? "z-10 rounded-b-[3px] bg-key-black shadow-[0_2px_5px_rgba(0,0,0,.5)]"
            : "z-0 rounded-b-[2px] border-r border-key-border/25 bg-key-white",
        )}
      >
        {/* Keyed by the note's start time so a repeated note remounts this
            element and replays the flash. Without the remount a jack would
            hold one steady light, since the key never stops being active. */}
        {isActive && (
          <span
            key={startedAt}
            style={{ backgroundColor: glow }}
            className="key-strike pointer-events-none absolute inset-0"
            aria-hidden
          />
        )}

        {showLabel && (
          <span
            className={cn(
              "relative font-mono text-[9px] leading-none tracking-tight",
              isActive ? "text-note-fg" : "text-text-muted",
            )}
          >
            {midiToNoteName(key.midi)}
          </span>
        )}
      </div>
    );
  };

  return (
    <div
      className="relative w-full shrink-0 border-t border-key-border bg-surface-sunken"
      style={{ height: depth }}
      aria-hidden
    >
      {/* White keys first so the black keys paint over their seams. */}
      {layout.keys.filter((key) => !key.isBlack).map(renderKey)}
      {layout.keys.filter((key) => key.isBlack).map(renderKey)}
    </div>
  );
};

const midiToNoteName = (midi: number) => {
  const noteNames = [
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
  const octave = Math.floor((midi - 12) / 12);
  const note = noteNames[midi % 12];
  return `${note}${octave}`;
};
