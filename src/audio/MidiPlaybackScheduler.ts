import type { NoteEvent, StopFn } from "smplr";
import {
  audioTimeToPerformanceTime,
  type AudioClock,
} from "@/utils/audioClock";

export interface PlaybackNote {
  midi: number;
  velocity: number;
  time: number;
  duration: number;
}

export interface PianoSchedulerTarget {
  start: (event: NoteEvent) => StopFn;
}

export interface TimestampedMidiOutput {
  send: (message: number[], timestamp?: number) => void;
  clear?: () => void;
}

export interface MidiPlaybackSchedulerOptions {
  clock: AudioClock;
  piano: PianoSchedulerTarget;
  getOutput?: () => TimestampedMidiOutput | null | undefined;
  onComplete: () => void;
  tickMs?: number;
  lookaheadSeconds?: number;
  decayTailSeconds?: number;
  performanceNow?: () => number;
}

const NOTE_ON_CHANNEL_1 = 0x90;
const NOTE_OFF_CHANNEL_1 = 0x80;
const CONTROL_CHANGE_CHANNEL_1 = 0xb0;
const ALL_NOTES_OFF = 123;

export class MidiPlaybackScheduler {
  private readonly clock: AudioClock;
  private readonly piano: PianoSchedulerTarget;
  private readonly getOutput: () => TimestampedMidiOutput | null | undefined;
  private readonly onComplete: () => void;
  private readonly tickMs: number;
  private readonly lookaheadSeconds: number;
  private readonly decayTailSeconds: number;
  private readonly performanceNow: () => number;
  private notes: PlaybackNote[] = [];
  private originAudioTime = 0;
  private cursor = 0;
  private completionAudioTime = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private stopped = true;
  private readonly voiceStops = new Map<symbol, StopFn>();
  private readonly usedOutputs = new Set<TimestampedMidiOutput>();

  constructor(options: MidiPlaybackSchedulerOptions) {
    this.clock = options.clock;
    this.piano = options.piano;
    this.getOutput = options.getOutput ?? (() => undefined);
    this.onComplete = options.onComplete;
    this.tickMs = options.tickMs ?? 25;
    this.lookaheadSeconds = options.lookaheadSeconds ?? 0.2;
    // SplendidGrandPiano's default decayTime is currently 0.5 seconds.
    this.decayTailSeconds = options.decayTailSeconds ?? 0.5;
    this.performanceNow = options.performanceNow ?? (() => performance.now());
  }

  start(notes: PlaybackNote[], originAudioTime: number) {
    this.stop();
    this.notes = [...notes].sort((a, b) => a.time - b.time);
    this.originAudioTime = originAudioTime;
    this.cursor = 0;
    this.stopped = false;

    const maximumNoteEnd = this.notes.reduce(
      (maximum, note) => Math.max(maximum, note.time + note.duration),
      0,
    );
    this.completionAudioTime =
      originAudioTime + maximumNoteEnd + this.decayTailSeconds;

    if (this.notes.length === 0) {
      this.finish();
      return;
    }

    this.tick();
    if (!this.stopped) {
      this.intervalId = setInterval(() => this.tick(), this.tickMs);
    }
  }

  stop() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    const stopAt = this.clock.currentTime;
    for (const stopVoice of this.voiceStops.values()) {
      try {
        stopVoice(stopAt);
      } catch {
        // One stale voice must not prevent the rest from being cancelled.
      }
    }
    this.voiceStops.clear();

    for (const output of this.usedOutputs) {
      try {
        output.clear?.();
      } catch {
        // Continue to the explicit All Notes Off fallback.
      }
      try {
        output.send([CONTROL_CHANGE_CHANNEL_1, ALL_NOTES_OFF, 0]);
      } catch {
        // A device can disappear between scheduling and cleanup.
      }
    }
    this.usedOutputs.clear();
    this.cursor = 0;
    this.stopped = true;
  }

  private tick() {
    if (this.stopped) return;
    const horizon = this.clock.currentTime + this.lookaheadSeconds;

    while (this.cursor < this.notes.length) {
      const note = this.notes[this.cursor];
      const noteStart = this.originAudioTime + note.time;
      if (noteStart > horizon) break;

      const velocity = Math.max(
        0,
        Math.min(127, Math.round(note.velocity * 127)),
      );
      const voiceId = Symbol("scheduled-midi-note");
      const stopVoice = this.piano.start({
        note: note.midi,
        velocity,
        time: noteStart,
        duration: note.duration,
        onEnded: () => this.voiceStops.delete(voiceId),
      });
      this.voiceStops.set(voiceId, stopVoice);

      const output = this.getOutput();
      if (output) {
        this.usedOutputs.add(output);
        try {
          output.send(
            [NOTE_ON_CHANNEL_1, note.midi, velocity],
            audioTimeToPerformanceTime(
              this.clock,
              noteStart,
              this.performanceNow,
            ),
          );
          output.send(
            [NOTE_OFF_CHANNEL_1, note.midi, 0],
            audioTimeToPerformanceTime(
              this.clock,
              noteStart + note.duration,
              this.performanceNow,
            ),
          );
        } catch {
          // Internal audio keeps playing if a MIDI device disconnects.
        }
      }

      this.cursor += 1;
    }

    if (
      this.cursor >= this.notes.length &&
      this.clock.currentTime >= this.completionAudioTime
    ) {
      this.finish();
    }
  }

  private finish() {
    if (this.stopped) return;
    this.stop();
    this.onComplete();
  }
}
