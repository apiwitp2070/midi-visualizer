import { useMIDIOutput, useMIDIOutputs } from "@react-midi/hooks";
import Button from "@/components/common/Button";
import { useMidiVisualization } from "@/context/useMidiVisualization";
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
    <Accordion id="ac-learning" title="Learn note by note">
      <div className="flex flex-col gap-2">
        <p className="text-xs text-text-muted">
          Plays one note at a time and waits for you to match it before moving
          on.
        </p>
        <Button
          disabled={!output || !originalMidi}
          onClick={toggleLearning}
          variant={isLearning ? "danger" : "primary"}
        >
          {isLearning ? "Stop" : "Start"} learning
        </Button>
      </div>
    </Accordion>
  );
}
