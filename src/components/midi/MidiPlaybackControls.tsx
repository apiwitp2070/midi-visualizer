import Button from "@/components/common/Button";
import { useAudioEngine } from "@/context/useAudioEngine";
import { useMidiPlayback } from "@/hooks/useMidiPlayback";

export default function MidiPlaybackControls() {
  const { status, error, loadProgress, retry } = useAudioEngine();
  const { togglePlayback, isPlaying, canPlay } = useMidiPlayback();

  const loadingLabel = loadProgress
    ? `Loading piano… ${loadProgress.loaded}/${loadProgress.total}`
    : "Loading piano…";

  return (
    <div className="flex flex-col gap-3 rounded-lg py-3">
      <Button
        onClick={() => void togglePlayback()}
        disabled={!isPlaying && !canPlay}
        variant={isPlaying ? "danger" : "primary"}
      >
        {isPlaying ? "Stop" : status === "loading" ? loadingLabel : "Play"}
      </Button>

      {status === "error" && (
        <div className="flex items-center justify-between gap-3">
          <p role="alert" className="text-xs text-danger">
            {error?.message || "The piano samples could not be loaded."}
          </p>
          <Button variant="ghost" onClick={() => void retry()}>
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}
