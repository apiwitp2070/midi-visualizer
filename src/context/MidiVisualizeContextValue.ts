import { Midi } from "@tonejs/midi";
import { Note } from "@tonejs/midi/dist/Note";
import { createContext } from "react";
import { NoteScoring, ScoreResult, NoteScore } from "../interfaces/note";
import type { PlaybackSettings } from "@/config/playback";

export interface MidiVisualizerContextType {
  isRecording: boolean;
  setIsRecording: React.Dispatch<React.SetStateAction<boolean>>;
  isLearning: boolean;
  setIsLearning: React.Dispatch<React.SetStateAction<boolean>>;
  isExporting: boolean;
  setIsExporting: React.Dispatch<React.SetStateAction<boolean>>;
  originalMidi: Midi | null;
  setOriginalMidi: React.Dispatch<React.SetStateAction<Midi | null>>;
  fileName: string | null;
  setFileName: React.Dispatch<React.SetStateAction<string | null>>;
  startTime: number | null;
  setStartTime: React.Dispatch<React.SetStateAction<number | null>>;
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
  playbackState: PlaybackState;
  startPlayback: (originAudioTime: number) => void;
  stopPlayback: () => void;
  playbackSettings: PlaybackSettings;
  savePlaybackSettings: (settings: PlaybackSettings) => void;
  midiNotes: Note[];
  leadInSeconds: number;
  /** Reported by the visualizer once it knows how far a note falls. */
  setTravelDistance: React.Dispatch<React.SetStateAction<number | null>>;
  /**
   * Whether the stage has reported its real height. Until it has, the lead-in
   * is not meaningful and playback must not start — scheduling audio against
   * an unmeasured stage desyncs it from the canvas with no later correction.
   */
  hasMeasuredStage: boolean;
  firstTrackNotes: Note[];
}

export type PlaybackState =
  | { status: "STOP"; originAudioTime: null }
  | { status: "PLAY"; originAudioTime: number };

export const MidiVisualizerContext = createContext<
  MidiVisualizerContextType | undefined
>(undefined);
