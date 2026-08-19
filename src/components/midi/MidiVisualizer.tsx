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

/** Stable empty set, so an idle keyboard does not allocate one per render. */
const EMPTY_NOTES: Set<number> = new Set();

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
          : { width, height }
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
  // The playback clock's origin. Held in a ref rather than recomputed inside
  // the draw effect: that effect re-runs on resize and theme change, and
  // re-seeding the origin there would snap the visuals back to t=0 while the
  // audio's already-scheduled timeouts kept going.
  const startTimeRef = useRef<number | null>(null);
  // Previous frame's time, so active-note detection can test an interval
  // rather than an instant.
  const prevTimeRef = useRef<number | null>(null);
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());

  // The keyboard is scaled so the full MIDI range exactly fills the available
  // width — the instrument always spans the stage, at any window size. Both
  // the DOM keys and the canvas note columns read from this one layout, so
  // the two halves of the visualizer cannot drift apart.
  const layout = useMemo(() => {
    const natural = buildKeyboardLayout();
    if (!stageSize.width) return natural;

    const whiteKeyCount = natural.totalSize / natural.whiteKeySize;
    // Unclamped on purpose. A floor here would make the keyboard wider than
    // the stage on a narrow viewport, and the frame's overflow:hidden would
    // then silently cut off the top octaves — leaving notes falling into
    // columns with no key beneath them. Fitting always wins; the `labelable`
    // check below already drops key labels once they stop fitting.
    const fitted = stageSize.width / whiteKeyCount;
    return buildKeyboardLayout(fitted);
  }, [stageSize.width]);

  // Publish how far a note falls before it reaches the playhead, so the audio
  // scheduler leads the visuals by the matching amount. Must stay equal to
  // `playheadY` in the draw effect: `songDelay` and the draw loop's `leadIn`
  // are both derived from it, and they have to agree. This is a genuine
  // React-to-external sync — the measurement lives in the DOM, not in state.
  const travelDistance = stageSize.height
    ? stageSize.height - config.playheadInset
    : 0;

  useEffect(() => {
    if (travelDistance > 0) setTravelDistance(travelDistance);
  }, [travelDistance, setTravelDistance]);

  // Filtered here rather than inside the draw effect: that effect re-runs on
  // every resize frame, and re-walking the whole note array while dragging a
  // window edge is wasted work.
  const visibleNotes = useMemo(
    () => notes.filter((note) => note.time + note.duration > 0),
    [notes]
  );

  // getComputedStyle forces a style recalculation, so it is resolved once here
  // rather than inside the draw effect, which re-runs on every resize frame.
  // --font-mono is theme-invariant (only colors change between themes), so a
  // single read on mount is enough.
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

    const { pixelsPerSecond, noteInset, noteRadius, playheadInset } = config;
    // The playhead sits just above the keyboard strip, at the bottom of the
    // stage: notes fall onto it.
    const playheadY = height - playheadInset;

    function drawLanes(ctx: CanvasRenderingContext2D, colors: ThemeColors) {
      layout.keys.forEach((key) => {
        if (key.isBlack) return;
        // Lane columns follow the white keys, so every column on the canvas
        // has a key beneath it.
        //
        // Banded by pitch class rather than by column index: the pattern then
        // repeats every octave and lines up with the black keys, instead of
        // drifting when the keyboard is scaled to fit. C is marked slightly
        // stronger as the octave landmark.
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
      ctx.fillRect(0, playheadY - 1.5, width, 1.5);
      // A short gradient above the line suggests the direction of travel
      // without competing with the notes.
      const glow = ctx.createLinearGradient(0, playheadY - 26, 0, playheadY);
      glow.addColorStop(0, "transparent");
      glow.addColorStop(1, colors.playhead);
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = glow;
      ctx.fillRect(0, playheadY - 26, width, 26);
      ctx.restore();
    }

    function drawNote(
      ctx: CanvasRenderingContext2D,
      note: Note,
      currentTime: number,
      colors: ThemeColors
    ) {
      const key = layout.byMidi.get(note.midi);
      // Notes outside the rendered key range have nowhere to land.
      if (!key) return;

      // A note in the future has time > currentTime, so the term is positive
      // and startY sits above the playhead, descending toward it as time
      // advances and passing below it once the note has been played.
      const startY = playheadY - (note.time - currentTime) * pixelsPerSecond;
      const noteLength = Math.max(note.duration * pixelsPerSecond, 3);
      // startY is the note's leading (lower) edge — the point that lands on
      // the playhead. A held note's body trails upward behind it, so a longer
      // note is still crossing the playhead after its start has passed.
      const top = startY - noteLength;

      if (startY < 0 || top > height) return;

      const fill = getNoteColor(colors, note.midi);
      const noteWidth = Math.max(key.size - noteInset * 2, 3);
      const x = key.offset + noteInset;

      ctx.save();

      // Notes brighten as they approach the playhead, so the eye is drawn to
      // what is about to be played rather than to the whole field equally.
      const distance = Math.abs(startY - playheadY);
      if (distance < 120) {
        ctx.shadowColor = fill;
        ctx.shadowBlur = 16 * (1 - distance / 120);
      }

      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.roundRect(x, top, noteWidth, noteLength, noteRadius);
      ctx.fill();
      ctx.restore();

      // Label only when the column is wide enough and the note long enough to
      // hold the text. With ~36 white keys across the stage most notes fail
      // this, so labels drop out rather than overflow their column.
      if (noteWidth >= 22 && noteLength >= 26) {
        ctx.fillStyle = colors.noteFg;
        ctx.font = noteFont;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(note.name, x + noteWidth / 2, top + noteLength / 2);
      }
    }

    function draw(
      ctx: CanvasRenderingContext2D,
      currentTime: number,
      colors: ThemeColors
    ) {
      ctx.clearRect(0, 0, width, height);
      drawLanes(ctx, colors);
      drawPlayhead(ctx, colors);
      visibleNotes.forEach((note) => {
        drawNote(ctx, note, currentTime, colors);
      });
    }

    function updateActiveNotes(currentTime: number) {
      // Tested against the interval since the last frame rather than against
      // this instant: a note shorter than one frame (~16ms) can begin and end
      // between two samples, and a point test would never light its key.
      // Grace notes and trills are the common case.
      const prevTime = prevTimeRef.current ?? currentTime;
      prevTimeRef.current = currentTime;

      const newActiveNotes = new Set<number>();
      visibleNotes.forEach((note) => {
        if (note.time <= currentTime && note.time + note.duration >= prevTime) {
          newActiveNotes.add(note.midi);
        }
      });

      setActiveNotes((prev) => {
        if (
          prev.size === newActiveNotes.size &&
          [...prev].every((midi) => newActiveNotes.has(midi))
        ) {
          return prev;
        }
        return newActiveNotes;
      });
    }

    function startAnimation() {
      // Seeded only once per playback. A resize or theme change re-runs this
      // effect and must resume the existing clock, not restart it.
      if (startTimeRef.current === null) {
        startTimeRef.current = performance.now();
      }
      const startTime = startTimeRef.current;

      // The clock starts negative, by two terms that must match the first two
      // terms of `songDelay`:
      //   playheadY / pixelsPerSecond — the time a note takes to fall from the
      //     top of the stage to the playhead. Without it a note at time 0
      //     would render already sitting on the playhead instead of falling.
      //   DELAY_OFFSET / 1000 — the scheduling cushion songDelay adds. Omitting
      //     it here made the audio trail the visuals by exactly that much.
      // songDelay also subtracts AUDIO_LEAD_MS, which is deliberately absent
      // here: that asymmetry is what puts the sound ahead of the key light.
      // Mirroring it would cancel the lead and change nothing.
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
      // Released so the next Play starts a fresh clock rather than resuming
      // the finished song's origin.
      startTimeRef.current = null;
      prevTimeRef.current = null;
      // Idle still paints the lanes and playhead, so the stage reads as an
      // instrument waiting rather than an empty box.
      ctx.clearRect(0, 0, width, height);
      drawLanes(ctx, themeColors);
      drawPlayhead(ctx, themeColors);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
    // themeColors is included so a theme switch repaints with the new palette
    // instead of waiting for the next playback change. Re-running on resize,
    // theme, or layout no longer disturbs playback: the clock's origin lives
    // in startTimeRef and survives across runs.
  }, [
    canvasState,
    visibleNotes,
    noteFont,
    themeColors,
    stageSize,
    layout,
  ]);

  // Derived rather than reset in the effect: when playback stops, no key is
  // lit by definition, so there is no need to write state to say so.
  const litNotes = canvasState === "PLAY" ? activeNotes : EMPTY_NOTES;

  // The keyboard gives up depth before the note stage does: on a short
  // window the falling notes are the part that has to stay readable. Measured
  // from the outer frame rather than the stage, since the stage's own height
  // depends on this value — reading it back would be a feedback loop.
  const keyboardDepth = Math.round(
    Math.max(44, Math.min(config.keyboardDepth, frameSize.height * 0.18))
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
                Choose a MIDI file to see it play across the keys.
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
  activeNotes: Set<number>;
  colors: ThemeColors;
  /** Depth of the keyboard strip, in px. Black keys occupy a fraction of it. */
  depth: number;
}

/**
 * The piano itself: a horizontal strip below the note stage, low notes left.
 *
 * White keys are absolutely positioned from the shared layout and black keys
 * are drawn over them at a shallower depth, so the white key shows below —
 * the way a real keyboard looks from above. An active key lights in the same
 * pitch-class colour as the note that landed on it, which is what visually
 * ties the falling note to the key it belongs to.
 */
const Keyboard = ({ layout, activeNotes, colors, depth }: KeyboardProps) => {
  // Labels are dropped rather than allowed to overflow when a key is too
  // narrow to hold them. 9px text on a C key needs well under the 18px this
  // once used: at 52 white keys a threshold that high would hide the octave
  // markers on any normal laptop window, and they are the only thing
  // orienting the eye along an 88-key strip.
  const labelable = layout.whiteKeySize >= 12;

  const renderKey = (key: KeyLayout) => {
    const isActive = activeNotes.has(key.midi);
    const glow = getNoteColor(colors, key.midi);
    // Only C keys are labelled: enough to orient by octave, without the
    // noise of naming all 61 keys.
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
          "absolute top-0 flex items-end justify-center pb-1",
          "transition-[background-color,box-shadow] duration-75",
          key.isBlack
            ? // Raised above the white keys, with a cast shadow to sell it.
              "z-10 rounded-b-[3px] bg-key-black shadow-[0_2px_5px_rgba(0,0,0,.5)]"
            : // Only white keys are separated by a rule; the black keys
              // already read as distinct by colour and elevation.
              "z-0 rounded-b-[2px] border-r border-key-border/25 bg-key-white"
        )}
      >
        {showLabel && (
          <span
            className={cn(
              "font-mono text-[9px] leading-none tracking-tight",
              isActive ? "text-note-fg" : "text-text-muted"
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
