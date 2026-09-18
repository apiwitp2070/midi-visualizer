export interface AudioClock {
  currentTime: number;
  getOutputTimestamp?: () => {
    contextTime?: number;
    performanceTime?: number;
  };
}

const validTimestamp = (
  timestamp: ReturnType<NonNullable<AudioClock["getOutputTimestamp"]>>,
) =>
  Number.isFinite(timestamp.contextTime) &&
  Number.isFinite(timestamp.performanceTime);

export const getAudioOutputTime = (clock: AudioClock) => {
  try {
    const timestamp = clock.getOutputTimestamp?.();
    if (timestamp && validTimestamp(timestamp)) return timestamp.contextTime!;
  } catch {
    // Older browser implementations can expose the method but still throw.
  }
  return clock.currentTime;
};

export const getVisualSongTime = (
  clock: AudioClock,
  originAudioTime: number,
  visualOffsetMs: number,
) => getAudioOutputTime(clock) - originAudioTime - visualOffsetMs / 1000;

export const audioTimeToPerformanceTime = (
  clock: AudioClock,
  audioTime: number,
  performanceNow: () => number = () => performance.now(),
) => {
  try {
    const timestamp = clock.getOutputTimestamp?.();
    if (timestamp && validTimestamp(timestamp)) {
      return (
        timestamp.performanceTime! + (audioTime - timestamp.contextTime!) * 1000
      );
    }
  } catch {
    // Fall through to a current-time conversion.
  }
  return performanceNow() + (audioTime - clock.currentTime) * 1000;
};
