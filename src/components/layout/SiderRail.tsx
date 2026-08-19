import { cn } from "@/utils/cn";
import { useMidiPlayback } from "@/hooks/useMidiPlayback";
import MidiUpload from "@/components/midi/MidiUpload";
import { PanelToggleIcon, PlayIcon, StopIcon } from "@/components/common/icons";

/** Shared shape for the rail's icon buttons, so they align as one column. */
const railButton = cn(
  "flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md",
  "text-text-muted transition-colors hover:bg-surface-raised hover:text-text",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
);

interface SiderRailProps {
  onExpand: () => void;
}

/**
 * The collapsed sidebar: a 56px transport strip.
 *
 * Carries the controls needed to load and play a file, so the common
 * load -> play loop never requires re-opening the 340px panel and pushing the
 * visualizer aside. Playback and upload both come from shared hooks rather
 * than local state, so this and the expanded panel always agree.
 */
const SiderRail = ({ onExpand }: SiderRailProps) => {
  const { togglePlayback, isPlaying, canPlay } = useMidiPlayback();

  return (
    <div className="flex h-full w-14 flex-col items-center gap-1 py-3">
      <button
        onClick={onExpand}
        aria-expanded={false}
        aria-label="Show controls"
        title="Show controls"
        className={railButton}
      >
        <PanelToggleIcon />
      </button>

      <div className="mt-2">
        <MidiUpload compact />
      </div>

      <button
        onClick={togglePlayback}
        disabled={!isPlaying && !canPlay}
        aria-label={isPlaying ? "Stop" : "Play"}
        title={isPlaying ? "Stop" : "Play"}
        className={cn(
          "flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md mt-2",
          "transition-[filter,background-color] duration-200",
          "active:brightness-[92%] hover:brightness-[92%]",
          "disabled:pointer-events-none disabled:bg-disabled disabled:text-disabled-fg",
          isPlaying ? "bg-danger text-danger-fg" : "bg-accent text-accent-fg",
        )}
      >
        {isPlaying ? <StopIcon /> : <PlayIcon />}
      </button>
    </div>
  );
};

export default SiderRail;
