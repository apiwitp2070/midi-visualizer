import { useMidiVisualization } from "@/context/MidiVisualizeContext";
import Accordion from "@/components/common/Accordion";

export default function MidiJsonView() {
  const { originalMidi } = useMidiVisualization();
  if (!originalMidi) return null;

  return (
    <Accordion id="ac-json" title="JSON">
      <div className="overflow-auto text-xs whitespace-pre-wrap">
        {JSON.stringify(originalMidi, null, 2)}
      </div>
    </Accordion>
  );
}
