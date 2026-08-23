import { ChangeEvent } from "react";
import { Midi } from "@tonejs/midi";
import { useMidiVisualization } from "@/context/useMidiVisualization";
import { useAudioEngine } from "@/context/useAudioEngine";

export const useMidiUpload = () => {
  const { setOriginalMidi, setFileName } = useMidiVisualization();
  const { prepare } = useAudioEngine();

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      const midi = new Midi(new Uint8Array(await file.arrayBuffer()));

      setOriginalMidi(midi);
      setFileName(file.name);
      void prepare();
    }
  };

  return { handleFileUpload };
};
