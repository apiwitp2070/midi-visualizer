export interface NoteScoring {
  midi: number;
  velocity: number;
  time: number;
  checked?: boolean;
}

export interface NoteScore {
  midi: number;
  name: string;
  time: number;
  score: number;
  timingResult: string; // "perfect" | "early" | "late" | "miss";
  durationResult: string; // "perfect" | "good" | "bad";
}

export interface ScoreResult {
  total?: number;
  perfect: number;
  early: number;
  late: number;
  miss: number;
}
