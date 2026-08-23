import { useMemo, useState } from "react";
import Accordion from "@/components/common/Accordion";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import {
  DEFAULT_PLAYBACK_SETTINGS,
  PLAYBACK_SETTING_LIMITS,
  normalizePlaybackSettings,
} from "@/config/playback";
import { useMidiVisualization } from "@/context/useMidiVisualization";

interface SettingsDraft {
  visualOffsetMs: string;
  noteScrollSpeed: string;
  showNoteLabels: boolean;
}

const toDraft = (
  settings: typeof DEFAULT_PLAYBACK_SETTINGS,
): SettingsDraft => ({
  visualOffsetMs: String(settings.visualOffsetMs),
  noteScrollSpeed: String(settings.noteScrollSpeed),
  showNoteLabels: settings.showNoteLabels,
});

export default function PlaybackSettings() {
  const { playbackSettings, savePlaybackSettings, playbackState } =
    useMidiVisualization();
  const [draft, setDraft] = useState(() => toDraft(playbackSettings));
  const [saved, setSaved] = useState(false);

  const normalizedDraft = useMemo(
    () => normalizePlaybackSettings(draft),
    [draft],
  );
  const savedDraft = toDraft(playbackSettings);
  const hasChanges =
    draft.visualOffsetMs !== savedDraft.visualOffsetMs ||
    draft.noteScrollSpeed !== savedDraft.noteScrollSpeed ||
    draft.showNoteLabels !== savedDraft.showNoteLabels;

  const updateDraft = (next: Partial<SettingsDraft>) => {
    setDraft((current) => ({ ...current, ...next }));
    setSaved(false);
  };

  const save = () => {
    savePlaybackSettings(normalizedDraft);
    setDraft(toDraft(normalizedDraft));
    setSaved(true);
  };

  return (
    <Accordion id="playback-settings" title="Settings">
      <div className="flex flex-col gap-4">
        <div>
          <div className="flex items-center justify-between gap-3">
            <label
              htmlFor="visual-offset"
              className="text-sm font-medium text-text"
            >
              Visual offset
            </label>
            <div className="flex w-28 items-center gap-1.5">
              <Input
                id="visual-offset"
                type="number"
                inputMode="numeric"
                min={PLAYBACK_SETTING_LIMITS.visualOffsetMs.min}
                max={PLAYBACK_SETTING_LIMITS.visualOffsetMs.max}
                step={PLAYBACK_SETTING_LIMITS.visualOffsetMs.step}
                value={draft.visualOffsetMs}
                onChange={(event) =>
                  updateDraft({ visualOffsetMs: event.target.value })
                }
                aria-describedby="visual-offset-help"
                className="px-2 py-1.5 text-right font-mono"
              />
              <span className="w-7 shrink-0 text-right font-mono text-xs text-text-muted">
                ms
              </span>
            </div>
          </div>
          <p id="visual-offset-help" className="mt-1.5 text-xs text-text-muted">
            Decrease value to make notes appear earlier, increase to make them
            appear later.
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <label
              htmlFor="note-speed"
              className="text-sm font-medium text-text"
            >
              Note speed
            </label>
            <div className="flex w-28 items-center gap-1.5">
              <Input
                id="note-speed"
                type="number"
                inputMode="numeric"
                min={PLAYBACK_SETTING_LIMITS.noteScrollSpeed.min}
                max={PLAYBACK_SETTING_LIMITS.noteScrollSpeed.max}
                step={PLAYBACK_SETTING_LIMITS.noteScrollSpeed.step}
                value={draft.noteScrollSpeed}
                onChange={(event) =>
                  updateDraft({ noteScrollSpeed: event.target.value })
                }
                aria-describedby="note-speed-help"
                className="px-2 py-1.5 text-right font-mono"
              />
              <span className="w-7 shrink-0 text-right font-mono text-xs text-text-muted">
                px/s
              </span>
            </div>
          </div>
        </div>

        <label className="flex cursor-pointer items-center justify-between gap-3 text-sm font-medium text-text">
          Show note labels
          <input
            type="checkbox"
            checked={draft.showNoteLabels}
            onChange={(event) =>
              updateDraft({ showNoteLabels: event.target.checked })
            }
            className="size-4 cursor-pointer accent-accent"
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => updateDraft(toDraft(DEFAULT_PLAYBACK_SETTINGS))}
          >
            Reset
          </Button>
          <Button type="button" disabled={!hasChanges} onClick={save}>
            {playbackState.status === "PLAY" ? "Save & stop" : "Save"}
          </Button>
        </div>

        <p aria-live="polite" className="min-h-4 text-xs text-text-muted">
          {saved
            ? "Settings saved."
            : playbackState.status === "PLAY" && hasChanges
              ? "Saving will stop playback."
              : "Changes apply after saving."}
        </p>
      </div>
    </Accordion>
  );
}
