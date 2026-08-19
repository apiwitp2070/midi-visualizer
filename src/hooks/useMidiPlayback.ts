import currency from "currency.js";
import { useMIDIOutputs, useMIDIOutput } from "@react-midi/hooks";
import { useMidiVisualization } from "@/context/useMidiVisualization";
import { useSoundFont } from "@/context/useSoundFont";

export const useMidiPlayback = () => {
  const { piano } = useSoundFont();
  const { output } = useMIDIOutputs();
  const { noteOn, noteOff } = useMIDIOutput();
  const {
    originalMidi,
    canvasState,
    setCanvasState,
    midiNotes,
    songDelay,
    hasMeasuredStage,
  } = useMidiVisualization();

  const isPlaying = canvasState === "PLAY";

  const canPlay = Boolean(originalMidi) && hasMeasuredStage;

  const togglePlayback = async () => {
    if (!canPlay) return;

    if (canvasState === "STOP") {
      setCanvasState("PLAY");

      midiNotes.forEach((note, index, arr) => {
        const noteOnTimeout = currency(note.time).multiply(
          currency(1000),
        ).value;
        const noteOffTimeout = currency(note.duration).multiply(
          currency(1000),
        ).value;

        setTimeout(() => {
          piano.play(note.name, note.time - songDelay, {
            duration: note.duration,
            gain: note.velocity,
            release: 1,
          });

          // for MIDI device
          if (output && noteOff && noteOn) {
            noteOn(note.midi, { velocity: note.velocity * 127 });

            setTimeout(() => {
              noteOff(note.midi, { velocity: note.velocity * 127 });
            }, noteOffTimeout);
          }

          // finish playing
          if (index === arr.length - 1) {
            setTimeout(() => {
              setTimeout(() => {
                setCanvasState("STOP");
                piano.stop();
              }, 1000);
            }, noteOffTimeout);
          }
        }, songDelay + noteOnTimeout);
      });
    } else {
      setCanvasState("STOP");

      const highestTimeoutId = setTimeout(() => {}, 0) as unknown as number;
      for (let i = 0; i < highestTimeoutId; i++) {
        clearTimeout(i);
      }
    }
  };

  return { togglePlayback, isPlaying, canPlay };
};
