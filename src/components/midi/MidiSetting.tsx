import { ChangeEvent } from "react";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import { useMidiVisualization } from "@/context/useMidiVisualization";
import currency from "currency.js";
import { useMIDIOutputs, useMIDIOutput } from "@react-midi/hooks";
import { useSoundFont } from "@/context/useSoundFont";

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
    hasMeasuredStage,
    defaultMidiBPM,
  } = useMidiVisualization();

  const playMidiSong = async () => {
    // songDelay is only meaningful once the stage has measured itself; playing
    // before then schedules the audio against a stage height the canvas is not
    // using, and nothing corrects the resulting offset.
    if (!originalMidi || !hasMeasuredStage) return;

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

  const onChangeTempo = (e: ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);

    if (typeof value === "number" && value > 0) {
      if (defaultMidiBPM && originalMidi) {
        originalMidi.header.tempos[0].bpm =
          currency(defaultMidiBPM).multiply(value).value;
      }
    }
  };

  const isPlaying = canvasState === "PLAY";

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-raised p-3">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="tempo" className="text-sm font-medium text-text">
          Tempo
        </label>
        <div className="flex w-28 items-center gap-1.5">
          <Input
            id="tempo"
            defaultValue={1}
            placeholder="1"
            onBlur={onChangeTempo}
            className="text-right font-mono"
          />
          <span className="text-sm text-text-muted">×</span>
        </div>
      </div>

      <p className="text-xs text-text-muted">
        1 plays at the file's own tempo. 0.5 halves it, 2 doubles it.
      </p>

      <Button
        onClick={playMidiSong}
        disabled={!originalMidi || (!isPlaying && !hasMeasuredStage)}
        variant={isPlaying ? "danger" : "primary"}
      >
        {isPlaying ? "Stop" : "Play"}
      </Button>
    </div>
  );
}
