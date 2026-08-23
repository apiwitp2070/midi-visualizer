import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NoteEvent } from "smplr";
import { MidiPlaybackScheduler } from "@/audio/MidiPlaybackScheduler";

describe("MidiPlaybackScheduler", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("schedules absolute audio times and normalized MIDI velocity", () => {
    const clock = { currentTime: 10 };
    const start = vi.fn((event: NoteEvent) => {
      void event;
      return vi.fn();
    });
    const scheduler = new MidiPlaybackScheduler({
      clock,
      piano: { start },
      onComplete: vi.fn(),
    });

    scheduler.start(
      [{ midi: 60, velocity: 0.5, time: 0.1, duration: 0.75 }],
      10,
    );

    expect(start).toHaveBeenCalledOnce();
    expect(start.mock.calls[0][0]).toMatchObject({
      note: 60,
      velocity: 64,
      time: 10.1,
      duration: 0.75,
    });
    scheduler.stop();
  });

  it("cancels active and future voices, including during replay", () => {
    const clock = { currentTime: 4.9 };
    const stops: ReturnType<typeof vi.fn>[] = [];
    const start = vi.fn(() => {
      const stop = vi.fn();
      stops.push(stop);
      return stop;
    });
    const scheduler = new MidiPlaybackScheduler({
      clock,
      piano: { start },
      onComplete: vi.fn(),
    });
    const notes = [{ midi: 60, velocity: 1, time: 0, duration: 1 }];

    scheduler.start(notes, 5);
    scheduler.start(notes, 5);

    expect(stops[0]).toHaveBeenCalledWith(4.9);
    expect(start).toHaveBeenCalledTimes(2);
    scheduler.stop();
    expect(stops[1]).toHaveBeenCalledWith(4.9);
  });

  it("completes after the true maximum note end and handles empty files", () => {
    const clock = { currentTime: 0 };
    const onComplete = vi.fn();
    const scheduler = new MidiPlaybackScheduler({
      clock,
      piano: { start: () => vi.fn() },
      onComplete,
    });

    scheduler.start(
      [
        { midi: 60, velocity: 1, time: 0, duration: 10 },
        { midi: 62, velocity: 1, time: 5, duration: 1 },
      ],
      0,
    );
    clock.currentTime = 6;
    vi.advanceTimersByTime(25);
    expect(onComplete).not.toHaveBeenCalled();
    clock.currentTime = 10.49;
    vi.advanceTimersByTime(25);
    expect(onComplete).not.toHaveBeenCalled();
    clock.currentTime = 10.5;
    vi.advanceTimersByTime(25);
    expect(onComplete).toHaveBeenCalledOnce();

    const emptyComplete = vi.fn();
    new MidiPlaybackScheduler({
      clock,
      piano: { start: () => vi.fn() },
      onComplete: emptyComplete,
    }).start([], 20);
    expect(emptyComplete).toHaveBeenCalledOnce();
  });

  it("timestamps hardware messages and clears queued notes on stop", () => {
    const clock = {
      currentTime: 5,
      getOutputTimestamp: () => ({ contextTime: 5, performanceTime: 1_000 }),
    };
    const output = { send: vi.fn(), clear: vi.fn() };
    const scheduler = new MidiPlaybackScheduler({
      clock,
      piano: { start: () => vi.fn() },
      getOutput: () => output,
      performanceNow: () => 999,
      onComplete: vi.fn(),
    });

    scheduler.start(
      [{ midi: 65, velocity: 0.75, time: 0.1, duration: 0.5 }],
      5,
    );
    expect(output.send.mock.calls[0][0]).toEqual([0x90, 65, 95]);
    expect(output.send.mock.calls[0][1]).toBeCloseTo(1_100);
    expect(output.send.mock.calls[1][0]).toEqual([0x80, 65, 0]);
    expect(output.send.mock.calls[1][1]).toBeCloseTo(1_600);

    scheduler.stop();
    expect(output.clear).toHaveBeenCalledOnce();
    expect(output.send).toHaveBeenLastCalledWith([0xb0, 123, 0]);
  });
});
