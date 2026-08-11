import { Midi } from "@tonejs/midi";
import { Note } from "@tonejs/midi/dist/Note";
import { createContext } from "react";
import { NoteScoring, ScoreResult, NoteScore } from "../interfaces/note";

export interface MidiVisualizerContextType {
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

export const MidiVisualizerContext = createContext<
  MidiVisualizerContextType | undefined
>(undefined);
