import { describe, expect, it } from "vitest";
import {
  audioTimeToPerformanceTime,
  getAudioOutputTime,
  getVisualSongTime,
} from "@/utils/audioClock";

describe("audio clock conversion", () => {
  it("uses the browser output timestamp when available", () => {
    const clock = {
      currentTime: 9,
      getOutputTimestamp: () => ({ contextTime: 8, performanceTime: 2_000 }),
    };

    expect(getAudioOutputTime(clock)).toBe(8);
    expect(audioTimeToPerformanceTime(clock, 8.25, () => 99)).toBe(2_250);
  });

  it("falls back to current audio and performance time", () => {
    const clock = { currentTime: 4 };

    expect(getAudioOutputTime(clock)).toBe(4);
    expect(audioTimeToPerformanceTime(clock, 4.5, () => 1_000)).toBe(1_500);
  });

  it("applies visual calibration without creating a second clock", () => {
    const clock = {
      currentTime: 8,
      getOutputTimestamp: () => ({ contextTime: 7.5, performanceTime: 1_000 }),
    };

    expect(getVisualSongTime(clock, 5, 100)).toBeCloseTo(2.4);
    expect(getVisualSongTime(clock, 5, -100)).toBeCloseTo(2.6);
  });
});
