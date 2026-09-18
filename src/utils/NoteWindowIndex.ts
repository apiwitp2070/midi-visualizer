export interface TimedNote {
  time: number;
  duration: number;
}

export class NoteWindowIndex<T extends TimedNote> {
  private readonly byStart: T[];
  private readonly byEnd: T[];
  private readonly current = new Set<T>();
  private startCursor = 0;
  private endCursor = 0;
  private lastSongTime = Number.NEGATIVE_INFINITY;
  private lastHorizon = Number.NEGATIVE_INFINITY;

  constructor(notes: T[]) {
    this.byStart = [...notes].sort((a, b) => a.time - b.time);
    this.byEnd = [...notes].sort(
      (a, b) => a.time + a.duration - (b.time + b.duration),
    );
  }

  reset() {
    this.current.clear();
    this.startCursor = 0;
    this.endCursor = 0;
    this.lastSongTime = Number.NEGATIVE_INFINITY;
    this.lastHorizon = Number.NEGATIVE_INFINITY;
  }

  update(songTime: number, horizon: number): T[] {
    if (songTime < this.lastSongTime || horizon < this.lastHorizon) {
      this.reset();
    }

    while (
      this.startCursor < this.byStart.length &&
      this.byStart[this.startCursor].time <= horizon
    ) {
      this.current.add(this.byStart[this.startCursor]);
      this.startCursor += 1;
    }

    // Add starts before removing ends. When the clock jumps forward, this
    // prevents already-ended notes from being added after their end cursor
    // has passed them.
    while (
      this.endCursor < this.byEnd.length &&
      this.byEnd[this.endCursor].time + this.byEnd[this.endCursor].duration <
        songTime
    ) {
      this.current.delete(this.byEnd[this.endCursor]);
      this.endCursor += 1;
    }

    this.lastSongTime = songTime;
    this.lastHorizon = horizon;
    return [...this.current];
  }
}
