import { Midi } from "@tonejs/midi";
import { useMemo, useState } from "react";
import { config } from "../enums/config";
import { NoteScoring, ScoreResult, NoteScore } from "../interfaces/note";
import { MidiVisualizerContext } from "./MidiVisualizeContextValue";

/**
 * Head start given to the audio scheduler, in ms. A cushion against setTimeout
 * imprecision and soundfont attack latency.
 *
 * Exported because the canvas clock must subtract the same amount: it is one
 * of the two terms in `songDelay`, and the visual lead-in has to match
 * `songDelay` exactly or sound and picture drift apart by the difference.
 */
export const DELAY_OFFSET = 100;

/**
 * Deliberate audio lead over the visuals, in ms. Positive = sound fires before
 * the note lands and the key lights.
 *
 * Unlike DELAY_OFFSET this is intentionally *not* mirrored in the canvas
 * `leadIn`: that asymmetry is the whole point. A value added to both sides
 * shifts the song's start and changes no relationship, which is why tuning
 * DELAY_OFFSET moves sound, notes, and key light together.
 *
 * Keep it small. Beyond ~50ms the gap between hearing a note and seeing it
 * land reads as a fault rather than as anticipation.
 */
export const AUDIO_LEAD_MS = -100;

export const MidiVisualizerProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isLearning, setIsLearning] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [originalMidi, setOriginalMidi] = useState<Midi | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [defaultMidiBPM, setDefaultMidiBPM] = useState<number | null>(null);

  // step by step learning
  const [currentNotes, setCurrentNotes] = useState<NoteScoring[][]>([]);

  // test
  const [noteOnStack, setNoteOnStack] = useState<NoteScoring[]>([]);
  const [noteOffStack, setNoteOffStack] = useState<NoteScoring[]>([]);
  const [score, setScore] = useState<ScoreResult | null>(null);
  const [latestPLayedNotes, setLatestPlayedNotes] = useState<NoteScore[]>();

  // MIDI player
  const [canvasState, setCanvasState] = useState<"STOP" | "PLAY">("STOP");

  const midiNotes = useMemo(() => {
    return (
      originalMidi?.tracks
        .filter((t) => t.notes.length)
        ?.flatMap((t) => t.notes)
        .sort((a, b) => a.ticks - b.ticks) || []
    );
  }, [originalMidi?.tracks]);

  // How far a note falls from spawning at the top of the stage to reaching
  // the playhead. Published by MidiVisualizer once the canvas has measured
  // itself. Null until then: there is no safe stand-in, because a guessed
  // distance would schedule the audio against a different stage height than
  // the canvas draws with, and nothing ever corrects that offset. Playback is
  // gated on this being set instead.
  const [travelDistance, setTravelDistance] = useState<number | null>(null);

  const hasMeasuredStage = travelDistance !== null;

  // The lead time between scheduling a note's audio and it arriving at the
  // playhead, so sound and visuals line up. Derived from the measured stage
  // rather than a fixed canvas size — the stage is responsive, so a hardcoded
  // distance drifts out of sync as the window changes.
  //
  // The first two terms must stay equal to the `leadIn` computed in
  // MidiVisualizer's draw loop. AUDIO_LEAD_MS is subtracted here and nowhere
  // else: a shorter wait before playing a note is what makes the sound arrive
  // ahead of the key light.
  const songDelay =
    DELAY_OFFSET +
    ((travelDistance ?? 0) / config.pixelsPerSecond) * 1000 -
    AUDIO_LEAD_MS;

  const firstTrackNotes = useMemo(() => {
    return originalMidi?.tracks.find((t) => t.notes.length)?.notes || [];
  }, [originalMidi?.tracks]);

  const value = useMemo(
    () => ({
      isRecording,
      setIsRecording,
      isLearning,
      setIsLearning,
      isExporting,
      setIsExporting,
      originalMidi,
      setOriginalMidi,
      fileName,
      setFileName,
      startTime,
      setStartTime,
      defaultMidiBPM,
      setDefaultMidiBPM,
      currentNotes,
      setCurrentNotes,
      noteOnStack,
      setNoteOnStack,
      noteOffStack,
      setNoteOffStack,
      score,
      setScore,
      latestPLayedNotes,
      setLatestPlayedNotes,
      canvasState,
      setCanvasState,
      midiNotes,
      songDelay,
      setTravelDistance,
      hasMeasuredStage,
      firstTrackNotes,
    }),
    [
      canvasState,
      currentNotes,
      defaultMidiBPM,
      isExporting,
      isLearning,
      isRecording,
      latestPLayedNotes,
      noteOffStack,
      noteOnStack,
      originalMidi,
      fileName,
      score,
      startTime,
      midiNotes,
      songDelay,
      hasMeasuredStage,
      firstTrackNotes,
    ],
  );

  return (
    <MidiVisualizerContext value={value}>{children}</MidiVisualizerContext>
  );
};
