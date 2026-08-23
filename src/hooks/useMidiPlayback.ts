import { useMidiVisualization } from "@/context/useMidiVisualization";
import { useAudioEngine } from "@/context/useAudioEngine";

/**
 * The play/stop control surface. Deliberately does no scheduling: the audio is
 * driven by MidiScheduler, mounted once near the root. Multiple components use
 * this hook, so anything that schedules from here would run once per consumer
 * and play every note twice.
 */
export const useMidiPlayback = () => {
  const { audioContext, status, resume } = useAudioEngine();
  const {
    originalMidi,
    playbackState,
    startPlayback: setPlaybackOrigin,
    stopPlayback,
    hasMeasuredStage,
    leadInSeconds,
  } = useMidiVisualization();

  const isPlaying = playbackState.status === "PLAY";
  const canPlay =
    Boolean(originalMidi) &&
    hasMeasuredStage &&
    status === "ready" &&
    audioContext !== null;

  const startPlayback = async () => {
    if (!canPlay || !audioContext) return false;

    try {
      // Called directly from the click handler so browser autoplay policies
      // see the resume request as part of the user gesture.
      await resume();
    } catch {
      stopPlayback();
      return false;
    }

    setPlaybackOrigin(audioContext.currentTime + leadInSeconds);
    return true;
  };

  const togglePlayback = async () => {
    if (isPlaying) {
      stopPlayback();
      return;
    }
    await startPlayback();
  };

  return {
    togglePlayback,
    startPlayback,
    stopPlayback,
    isPlaying,
    canPlay,
  };
};
