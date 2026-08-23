import { createContext } from "react";
import type { SplendidGrandPiano as SplendidGrandPianoInstrument } from "smplr";

export type AudioEngineStatus = "idle" | "loading" | "ready" | "error";

export interface AudioEngineContextType {
  audioContext: AudioContext | null;
  piano: SplendidGrandPianoInstrument | null;
  status: AudioEngineStatus;
  error: Error | null;
  loadProgress: { loaded: number; total: number } | null;
  prepare: () => Promise<void>;
  retry: () => Promise<void>;
  resume: () => Promise<void>;
}

export const AudioEngineContext = createContext<
  AudioEngineContextType | undefined
>(undefined);
