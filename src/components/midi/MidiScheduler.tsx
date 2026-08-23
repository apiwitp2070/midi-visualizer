import { useEffect, useRef } from "react";
import { useMIDIOutputs } from "@react-midi/hooks";
import { useAudioEngine } from "@/context/useAudioEngine";
import { useMidiVisualization } from "@/context/useMidiVisualization";
import {
  MidiPlaybackScheduler,
  type TimestampedMidiOutput,
} from "@/audio/MidiPlaybackScheduler";

const MidiScheduler = () => {
  const { audioContext, piano, status } = useAudioEngine();
  const { output } = useMIDIOutputs();
  const { playbackState, stopPlayback, midiNotes } = useMidiVisualization();
  const latestOutput = useRef<TimestampedMidiOutput | undefined>(output);

  useEffect(() => {
    latestOutput.current = output as TimestampedMidiOutput | undefined;
  }, [output]);

  useEffect(() => {
    if (
      playbackState.status !== "PLAY" ||
      status !== "ready" ||
      !audioContext ||
      !piano
    ) {
      return;
    }

    const scheduler = new MidiPlaybackScheduler({
      clock: audioContext,
      piano,
      getOutput: () => latestOutput.current,
      onComplete: stopPlayback,
    });
    scheduler.start(midiNotes, playbackState.originAudioTime);
    return () => scheduler.stop();
  }, [audioContext, midiNotes, piano, playbackState, status, stopPlayback]);

  return null;
};

export default MidiScheduler;
