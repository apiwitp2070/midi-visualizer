import { ChangeEvent } from "react";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import { useMidiVisualization } from "@/context/useMidiVisualization";
import { useMidiPlayback } from "@/hooks/useMidiPlayback";
import currency from "currency.js";

export default function MidiSetting() {
  const { originalMidi, defaultMidiBPM } = useMidiVisualization();
  const { togglePlayback, isPlaying, canPlay } = useMidiPlayback();

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
        onClick={togglePlayback}
        disabled={!isPlaying && !canPlay}
        variant={isPlaying ? "danger" : "primary"}
      >
        {isPlaying ? "Stop" : "Play"}
      </Button>
    </div>
  );
}
