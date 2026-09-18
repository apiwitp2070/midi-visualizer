import { useMemo, useState } from "react";
import Accordion from "@/components/common/Accordion";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  MinusIcon,
  PlusIcon,
} from "@/components/common/icons";
import {
  DEFAULT_PLAYBACK_SETTINGS,
  NOTE_SPEED_LEVEL,
  PLAYBACK_SETTING_LIMITS,
  noteSpeedFromLevel,
  noteSpeedToLevel,
  normalizePlaybackSettings,
} from "@/config/playback";
import { useMidiVisualization } from "@/context/useMidiVisualization";
import { cn } from "@/utils/cn";

interface SettingsDraft {
  visualOffsetMs: string;
  noteSpeedLevel: string;
  showNoteLabels: boolean;
}

const toDraft = (
  settings: typeof DEFAULT_PLAYBACK_SETTINGS,
): SettingsDraft => ({
  visualOffsetMs: String(settings.visualOffsetMs),
  noteSpeedLevel: String(noteSpeedToLevel(settings.noteScrollSpeed)),
  showNoteLabels: settings.showNoteLabels,
});

const NUMBER_INPUT_CLASSNAME =
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";
const STEP_BUTTON_CLASSNAME =
  "flex cursor-pointer items-center justify-center text-text-muted transition-colors duration-200 hover:bg-surface-sunken hover:text-text disabled:pointer-events-none disabled:text-disabled-fg";

const StepButton = ({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    type="button"
    {...props}
    className={cn(STEP_BUTTON_CLASSNAME, className)}
  >
    {children}
  </button>
);

export default function PlaybackSettings() {
  const { playbackSettings, savePlaybackSettings, playbackState } =
    useMidiVisualization();
  const [draft, setDraft] = useState(() => toDraft(playbackSettings));
  const [saved, setSaved] = useState(false);

  const normalizedDraft = useMemo(
    () =>
      normalizePlaybackSettings({
        ...draft,
        noteScrollSpeed: noteSpeedFromLevel(draft.noteSpeedLevel),
      }),
    [draft],
  );
  const savedDraft = toDraft(playbackSettings);
  const hasChanges =
    draft.visualOffsetMs !== savedDraft.visualOffsetMs ||
    draft.noteSpeedLevel !== savedDraft.noteSpeedLevel ||
    draft.showNoteLabels !== savedDraft.showNoteLabels;
  const speedLevel = noteSpeedToLevel(normalizedDraft.noteScrollSpeed);

  const updateDraft = (next: Partial<SettingsDraft>) => {
    setDraft((current) => ({ ...current, ...next }));
    setSaved(false);
  };

  const stepOffset = (delta: number) => {
    const { min, max } = PLAYBACK_SETTING_LIMITS.visualOffsetMs;
    updateDraft({
      visualOffsetMs: String(
        Math.min(max, Math.max(min, normalizedDraft.visualOffsetMs + delta)),
      ),
    });
  };

  const stepSpeed = (delta: number) =>
    updateDraft({ noteSpeedLevel: String(speedLevel + delta) });

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
              Visual offset (ms)
            </label>
            <div className="group relative w-28">
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
                className={cn(
                  "py-1.5 text-center font-mono",
                  NUMBER_INPUT_CLASSNAME,
                )}
              />
              <div className="absolute inset-y-px right-px flex w-6 flex-col overflow-hidden rounded-r-md border-l border-border bg-surface-raised opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
                <StepButton
                  aria-label="Increase visual offset"
                  disabled={
                    normalizedDraft.visualOffsetMs >=
                    PLAYBACK_SETTING_LIMITS.visualOffsetMs.max
                  }
                  onClick={() =>
                    stepOffset(PLAYBACK_SETTING_LIMITS.visualOffsetMs.step)
                  }
                  className="flex-1 border-b border-border"
                >
                  <ChevronUpIcon className="size-3" />
                </StepButton>
                <StepButton
                  aria-label="Decrease visual offset"
                  disabled={
                    normalizedDraft.visualOffsetMs <=
                    PLAYBACK_SETTING_LIMITS.visualOffsetMs.min
                  }
                  onClick={() =>
                    stepOffset(-PLAYBACK_SETTING_LIMITS.visualOffsetMs.step)
                  }
                  className="flex-1"
                >
                  <ChevronDownIcon className="size-3" />
                </StepButton>
              </div>
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
            <div className="flex w-28 items-center rounded-md border border-border shadow-xs transition-[border-color] duration-300 hover:border-border-strong focus-within:border-border-strong">
              <StepButton
                aria-label="Decrease note speed"
                disabled={speedLevel <= NOTE_SPEED_LEVEL.min}
                onClick={() => stepSpeed(-NOTE_SPEED_LEVEL.step)}
                className="size-8 shrink-0 rounded-l-md"
              >
                <MinusIcon className="size-4" />
              </StepButton>
              <Input
                id="note-speed"
                type="number"
                inputMode="numeric"
                min={NOTE_SPEED_LEVEL.min}
                max={NOTE_SPEED_LEVEL.max}
                step={NOTE_SPEED_LEVEL.step}
                value={draft.noteSpeedLevel}
                onChange={(event) =>
                  updateDraft({ noteSpeedLevel: event.target.value })
                }
                className={cn(
                  "rounded-none border-none px-0 py-1.5 text-center font-mono shadow-none focus:shadow-none",
                  NUMBER_INPUT_CLASSNAME,
                )}
              />
              <StepButton
                aria-label="Increase note speed"
                disabled={speedLevel >= NOTE_SPEED_LEVEL.max}
                onClick={() => stepSpeed(NOTE_SPEED_LEVEL.step)}
                className="size-8 shrink-0 rounded-r-md"
              >
                <PlusIcon className="size-4" />
              </StepButton>
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
