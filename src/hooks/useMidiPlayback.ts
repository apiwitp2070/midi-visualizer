import { useMidiVisualization } from "@/context/useMidiVisualization";
import { useSoundFont } from "@/context/useSoundFont";

/**
 * The play/stop control surface. Deliberately does no scheduling: the audio is
 * driven by MidiScheduler, mounted once near the root. Multiple components use
 * this hook, so anything that schedules from here would run once per consumer
 * and play every note twice.
 */
export const useMidiPlayback = () => {
  const { ac } = useSoundFont();
  const { originalMidi, canvasState, setCanvasState, hasMeasuredStage } =
    useMidiVisualization();

  const isPlaying = canvasState === "PLAY";
  const canPlay = Boolean(originalMidi) && hasMeasuredStage;

  const togglePlayback = () => {
    if (!canPlay) return;

    // The AudioContext is constructed at module load, long before any user
    // gesture, so the browser starts it suspended — and a suspended context's
    // currentTime never advances, which the scheduler's whole clock rests on.
    //
    // This click is the gesture that permits resuming, so it has to happen
    // here rather than in the scheduler's effect. Not awaited: awaiting would
    // continue on a later task, outside the gesture, and the resume would be
    // refused.
    if (ac.state === "suspended") void ac.resume();

    setCanvasState((prev) => (prev === "STOP" ? "PLAY" : "STOP"));
  };

  return { togglePlayback, isPlaying, canPlay };
};
