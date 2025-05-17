import { ChangeEvent } from "react";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import { useMidiVisualization } from "@/context/MidiVisualizeContext";
import currency from "currency.js";
import { useMIDIOutputs, useMIDIOutput } from "@react-midi/hooks";
import { useSoundFont } from "@/context/SoundFontProvider";

export default function MidiSetting() {
  const { piano } = useSoundFont();
  const { output } = useMIDIOutputs();
  const { noteOn, noteOff } = useMIDIOutput();
  const {
    originalMidi,
    canvasState,
    setCanvasState,
    midiNotes,
    songDelay,
    defaultMidiBPM,
  } = useMidiVisualization();

  const playMidiSong = async () => {
    if (!originalMidi) return;

    if (canvasState === "STOP") {
      setCanvasState("PLAY");

      midiNotes.forEach((note, index, arr) => {
        const noteOnTimeout = currency(note.time).multiply(
          currency(1000)
        ).value;
        const noteOffTimeout = currency(note.duration).multiply(
          currency(1000)
        ).value;

        setTimeout(() => {
          piano.play(note.name, note.time - songDelay, {
            duration: note.duration,
          });

          if (output && noteOff && noteOn) {
            noteOn(note.midi, { velocity: note.velocity * 127 });

            setTimeout(() => {
              noteOff(note.midi, { velocity: note.velocity * 127 });

              if (index === arr.length - 1) {
                // finish playing
                setTimeout(() => {
                  console.log("song finished");
                  setCanvasState("STOP");
                  piano.stop();
                }, 1000);
              }
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

  const onChangeTempo = (e: ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);

    if (typeof value === "number" && value > 0) {
      if (defaultMidiBPM && originalMidi) {
        originalMidi.header.tempos[0].bpm =
          currency(defaultMidiBPM).multiply(value).value;
      }
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4">
        <b>MIDI Settings</b>
        <div className="flex gap-2 items-center">
          <p>Tempo:</p>
          <div className="w-1/2">
            <Input defaultValue={1} placeholder="1" onBlur={onChangeTempo} />
          </div>
          <p>x</p>
        </div>
        <div className="text-slate-500">
          Enter number (for example: 1x, 2x, 0.5x)
        </div>
      </div>

      <Button
        onClick={playMidiSong}
        disabled={!originalMidi}
        className={canvasState === "PLAY" ? "bg-red-400" : ""}
      >
        {canvasState === "PLAY" ? "Stop" : "Play"} MIDI
      </Button>
    </div>
  );
}
