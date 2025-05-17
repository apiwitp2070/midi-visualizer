import { useEffect, useRef, useState } from "react";
import { config } from "@/enums/config";
import { Note } from "@tonejs/midi/dist/Note";
import { useMidiVisualization } from "@/context/MidiVisualizeContext";

const MidiVisualizer = () => {
  const {
    originalMidi,
    canvasState,
    midiNotes: notes,
  } = useMidiVisualization();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const [activeNotes, setActiveNotes] = useState(new Set());

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    if (!ctx) return;

    const noteHeight = config.noteHeight;
    const noteSpacing = config.noteSpacing;
    const pixelsPerSecond = config.pixelsPerSecond;
    const borderRadius = config.noteRadius;
    const borderWidth = config.noteBorderWidth;

    const visibleNotes = notes.filter((note) => note.time + note.duration > 0);

    function drawNote(
      ctx: CanvasRenderingContext2D,
      note: Note,
      currentTime: number
    ) {
      const startX =
        width -
        config.noteStartOffset -
        (currentTime - note.time) * pixelsPerSecond;

      if (startX < 0 - note.duration * pixelsPerSecond) return;

      const endX = startX + note.duration * pixelsPerSecond;

      const y =
        height -
        (note.midi - (config.startMidi - 1)) * (noteHeight + noteSpacing);

      ctx.fillStyle = config.noteBg;
      ctx.strokeStyle = config.noteStroke;
      ctx.lineWidth = borderWidth;
      ctx.beginPath();
      ctx.roundRect(startX, y, endX - startX, noteHeight, borderRadius);
      ctx.fill();
      // ctx.stroke();

      ctx.fillStyle = "white";
      ctx.font = "11px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      if (endX - startX > 30) {
        ctx.fillText(note.name, endX + (startX - endX) / 2, y + noteHeight / 2);
      }
    }

    function draw(ctx: CanvasRenderingContext2D, currentTime: number) {
      ctx.clearRect(0, 0, width, height);
      visibleNotes.forEach((note) => {
        drawNote(ctx, note, currentTime);
      });
    }

    function updateActiveNotes(currentTime: number) {
      const newActiveNotes = new Set();
      visibleNotes.forEach((note) => {
        const startX =
          width -
          config.noteStartOffset -
          (currentTime - note.time) * pixelsPerSecond;
        const endX = startX + note.duration * pixelsPerSecond;

        if (startX < 0 && endX > 0) {
          newActiveNotes.add(note.midi);
        }
      });

      setActiveNotes(newActiveNotes);
    }

    function startAnimation() {
      const startTime = performance.now();
      function animate() {
        if (!ctx || canvasState === "STOP") return;
        const currentTime = (performance.now() - startTime) / 1000;
        updateActiveNotes(currentTime);
        draw(ctx, currentTime);
        animationRef.current = requestAnimationFrame(animate);
      }
      animate();
    }

    if (canvasState === "PLAY") {
      startAnimation();
    } else if (canvasState === "STOP") {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      ctx.clearRect(0, 0, width, height);
      setActiveNotes(new Set());
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasState, JSON.stringify(notes)]);

  if (!originalMidi)
    return (
      <div className="flex w-full h-full items-center justify-center bg-gray-200">
        Import MIDI file to display the visualizer
      </div>
    );

  return (
    <div className="flex">
      <div className="flex flex-col">{renderPianoKeys(activeNotes)}</div>
      <div className="canvas-container">
        <canvas
          ref={canvasRef}
          width="800"
          height="915"
          className="canvas-element"
        />
      </div>
    </div>
  );
};

export default MidiVisualizer;

// helper

const renderPianoKeys = (activeNotes: Set<unknown>) => {
  const keys = [];
  const startMidi = config.startMidi;
  const endMidi = config.endMidi;
  const keyHeight = config.laneHeight;

  for (let midi = startMidi; midi <= endMidi; midi++) {
    const note = midiToNoteName(midi);
    const isActive = activeNotes.has(midi);

    const border: Record<string, string> = { borderBottom: "1px solid black" };

    if (midi === endMidi) {
      border.borderTop = "1px solid black";
    }

    keys.push(
      <div
        key={midi}
        style={{
          width: 50,
          height: keyHeight,
          borderInline: "1px solid black",
          ...border,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "12px",
          boxSizing: "border-box",
          backgroundColor: isActive ? "#d0d0d0" : "white",
        }}
      >
        {note}
      </div>
    );
  }

  keys.reverse();

  return keys;
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
