import { useMidiVisualization } from "@/context/useMidiVisualization";
import Accordion from "@/components/common/Accordion";

export default function MidiJsonView() {
  const { originalMidi } = useMidiVisualization();
  if (!originalMidi) return null;

  return (
    <Accordion id="ac-json" title="Raw MIDI data">
      <pre className="overflow-auto font-mono text-[10px] leading-relaxed whitespace-pre-wrap text-text-muted">
        {JSON.stringify(originalMidi, null, 2)}
      </pre>
    </Accordion>
  );
}
