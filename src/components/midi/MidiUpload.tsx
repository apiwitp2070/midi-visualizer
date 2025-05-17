import { ChangeEvent } from "react";
import Upload from "@/components/common/Upload";
import { Midi } from "@tonejs/midi";
import { useMidiVisualization } from "@/context/MidiVisualizeContext";

export default function MidiUpload() {
  const { setOriginalMidi, setDefaultMidiBPM } = useMidiVisualization();

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      const fileUrl = URL.createObjectURL(file);
      const midi = await Midi.fromUrl(fileUrl);

      console.log("midi", midi);

      setOriginalMidi(midi);
      setDefaultMidiBPM(midi.header.tempos[0].bpm);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <b>Select MIDI File</b>
      <Upload onChange={handleFileUpload} />
    </div>
  );
}
