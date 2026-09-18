export interface PlaybackSettings {
  /** Positive values delay visuals relative to sound; negative values advance them. */
  visualOffsetMs: number;
  noteScrollSpeed: number;
  showNoteLabels: boolean;
}

export interface PlaybackSettingsInput {
  visualOffsetMs?: unknown;
  noteScrollSpeed?: unknown;
  showNoteLabels?: unknown;
}

export const DEFAULT_PLAYBACK_SETTINGS: PlaybackSettings = {
  visualOffsetMs: 0,
  noteScrollSpeed: 200,
  showNoteLabels: true,
};

export const NOTE_SPEED_LEVEL = { min: 1, max: 10, step: 1 } as const;
const PX_PER_SPEED_LEVEL = 40;

export const PLAYBACK_SETTING_LIMITS = {
  visualOffsetMs: { min: -500, max: 500, step: 10 },
  noteScrollSpeed: {
    min: NOTE_SPEED_LEVEL.min * PX_PER_SPEED_LEVEL,
    max: NOTE_SPEED_LEVEL.max * PX_PER_SPEED_LEVEL,
    step: PX_PER_SPEED_LEVEL,
  },
} as const;

export const PLAYBACK_SETTINGS_STORAGE_KEY = "midi-playback-settings";

const boundedNumber = (
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
) => {
  if (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "")
  ) {
    return fallback;
  }
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(maximum, Math.max(minimum, number));
};

export const noteSpeedToLevel = (pxPerSecond: number) =>
  Math.round(pxPerSecond / PX_PER_SPEED_LEVEL);

export const noteSpeedFromLevel = (level: unknown) =>
  Math.round(
    boundedNumber(
      level,
      noteSpeedToLevel(DEFAULT_PLAYBACK_SETTINGS.noteScrollSpeed),
      NOTE_SPEED_LEVEL.min,
      NOTE_SPEED_LEVEL.max,
    ),
  ) * PX_PER_SPEED_LEVEL;

export const normalizePlaybackSettings = (
  value: PlaybackSettingsInput | null | undefined,
): PlaybackSettings => ({
  visualOffsetMs: boundedNumber(
    value?.visualOffsetMs,
    DEFAULT_PLAYBACK_SETTINGS.visualOffsetMs,
    PLAYBACK_SETTING_LIMITS.visualOffsetMs.min,
    PLAYBACK_SETTING_LIMITS.visualOffsetMs.max,
  ),
  noteScrollSpeed: boundedNumber(
    value?.noteScrollSpeed,
    DEFAULT_PLAYBACK_SETTINGS.noteScrollSpeed,
    PLAYBACK_SETTING_LIMITS.noteScrollSpeed.min,
    PLAYBACK_SETTING_LIMITS.noteScrollSpeed.max,
  ),
  showNoteLabels:
    typeof value?.showNoteLabels === "boolean"
      ? value.showNoteLabels
      : DEFAULT_PLAYBACK_SETTINGS.showNoteLabels,
});

export const loadPlaybackSettings = (): PlaybackSettings => {
  if (typeof window === "undefined") return DEFAULT_PLAYBACK_SETTINGS;
  try {
    const stored = localStorage.getItem(PLAYBACK_SETTINGS_STORAGE_KEY);
    return stored
      ? normalizePlaybackSettings(JSON.parse(stored) as PlaybackSettingsInput)
      : DEFAULT_PLAYBACK_SETTINGS;
  } catch {
    return DEFAULT_PLAYBACK_SETTINGS;
  }
};

export const persistPlaybackSettings = (settings: PlaybackSettings) => {
  try {
    localStorage.setItem(
      PLAYBACK_SETTINGS_STORAGE_KEY,
      JSON.stringify(settings),
    );
  } catch {
    // Private browsing or storage policies may prevent persistence.
  }
};
