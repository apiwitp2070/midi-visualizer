import { Midi } from "@tonejs/midi";
import { Note } from "@tonejs/midi/dist/Note";
import { createContext, useContext, useMemo, useState } from "react";
import { config } from "../enums/config";
import { NoteScoring, ScoreResult, NoteScore } from "../interfaces/note";

interface MidiVisualizerContextType {
  isRecording: boolean;
  setIsRecording: React.Dispatch<React.SetStateAction<boolean>>;
  isLearning: boolean;
  setIsLearning: React.Dispatch<React.SetStateAction<boolean>>;
  isExporting: boolean;
  setIsExporting: React.Dispatch<React.SetStateAction<boolean>>;
  originalMidi: Midi | null;
  setOriginalMidi: React.Dispatch<React.SetStateAction<Midi | null>>;
  startTime: number | null;
  setStartTime: React.Dispatch<React.SetStateAction<number | null>>;
  defaultMidiBPM: number | null;
  setDefaultMidiBPM: React.Dispatch<React.SetStateAction<number | null>>;
  currentNotes: NoteScoring[][];
  setCurrentNotes: React.Dispatch<React.SetStateAction<NoteScoring[][]>>;
  noteOnStack: NoteScoring[];
  setNoteOnStack: React.Dispatch<React.SetStateAction<NoteScoring[]>>;
  noteOffStack: NoteScoring[];
  setNoteOffStack: React.Dispatch<React.SetStateAction<NoteScoring[]>>;
  score: ScoreResult | null;
  setScore: React.Dispatch<React.SetStateAction<ScoreResult | null>>;
  latestPLayedNotes: NoteScore[] | undefined;
  setLatestPlayedNotes: React.Dispatch<
    React.SetStateAction<NoteScore[] | undefined>
  >;
  canvasState: "STOP" | "PLAY";
  setCanvasState: React.Dispatch<React.SetStateAction<"STOP" | "PLAY">>;
  midiNotes: Note[];
  songDelay: number;
  firstTrackNotes: Note[];
}

const MidiVisualizerContext = createContext<
  MidiVisualizerContextType | undefined
>(undefined);

export const MidiVisualizerProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isLearning, setIsLearning] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [originalMidi, setOriginalMidi] = useState<Midi | null>(null);
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

  const delayOffset = 100;
  const canvasWidth = 800;

  const songDelay =
    delayOffset +
    ((canvasWidth - config.noteStartOffset) / config.pixelsPerSecond) * 1000;

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
      score,
      startTime,
      midiNotes,
      songDelay,
      firstTrackNotes,
    ]
  );

  return (
    <MidiVisualizerContext.Provider value={value}>
      {children}
    </MidiVisualizerContext.Provider>
  );
};

export const useMidiVisualization = () => {
  const context = useContext(MidiVisualizerContext);
  if (!context) {
    throw new Error("useFeature must be used within a FeatureProvider");
  }
  return context;
};
