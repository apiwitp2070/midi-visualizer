import { useMIDIOutput, useMIDIOutputs } from "@react-midi/hooks";
import Button from "@/components/common/Button";
import { useMidiVisualization } from "@/context/MidiVisualizeContext";
import Accordion from "@/components/common/Accordion";

export default function MidiLearning() {
  const {
    originalMidi,
    isLearning,
    setIsLearning,
    currentNotes,
    setCurrentNotes,
    firstTrackNotes,
  } = useMidiVisualization();
  const { noteOn } = useMIDIOutput();

  const { output } = useMIDIOutputs();

  const toggleLearning = () => {
    if (isLearning) {
      setIsLearning(false);
      setCurrentNotes([]);
    } else {
      // start learning
      if (!originalMidi) return;

      if (firstTrackNotes.length && noteOn) {
        noteOn(firstTrackNotes[0].midi, { velocity: 1 });
        currentNotes.push([firstTrackNotes[0]]);
        setIsLearning(true);
      }
    }
  };

  return (
    <Accordion id="ac-learning" title="Learning">
      <div className="flex flex-col gap-2">
        <Button disabled={!output} onClick={toggleLearning}>
          {isLearning ? "Stop" : "Start"} Learning
        </Button>
        {!output && (
          <p className="text-slate-500">
            Connect your MIDI device to use this feature
          </p>
        )}
      </div>
    </Accordion>
  );
}
