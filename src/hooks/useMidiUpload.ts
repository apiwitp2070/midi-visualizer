import { ChangeEvent } from "react";
import { Midi } from "@tonejs/midi";
import { useMidiVisualization } from "@/context/useMidiVisualization";

export const useMidiUpload = () => {
  const { setOriginalMidi, setDefaultMidiBPM, setFileName } =
    useMidiVisualization();

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      const midi = new Midi(new Uint8Array(await file.arrayBuffer()));

      setOriginalMidi(midi);
      setDefaultMidiBPM(midi.header.tempos[0].bpm);
      setFileName(file.name);
    }
  };

  return { handleFileUpload };
};
