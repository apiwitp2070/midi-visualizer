import { useMIDIMessage, useMIDIOutput } from "@react-midi/hooks";
import { MIDIMessage } from "@react-midi/hooks/dist/types";
import { Note } from "@tonejs/midi/dist/Note";
import { createContext, useCallback, useContext, useEffect } from "react";
import { useMidiVisualization } from "./MidiVisualizeContext";

const MidiMessageContext = createContext<undefined>(undefined);

export const MidiMessageProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const midiMessage = useMIDIMessage();
  const { noteOn, noteOff } = useMIDIOutput();
  const {
    isRecording,
    noteOnStack,
    noteOffStack,
    isLearning,
    currentNotes,
    firstTrackNotes,
  } = useMidiVisualization();

  const getMIDIMessage = useCallback(
    (midiMessage: MIDIMessage) => {
      const [command, note, velocity] = midiMessage.data;

      console.log("note :>> ", note);

      if (command === 144 && isRecording) {
        if (velocity > 0) {
          noteOnStack.push({
            midi: note,
            velocity,
            time: new Date().valueOf(),
          });
        } else {
          noteOffStack.push({
            midi: note,
            velocity,
            time: new Date().valueOf(),
          });
        }
      }

      if (command === 144 && isLearning && currentNotes.length > 0) {
        if (velocity === 0) {
          const currentNotesMidi = currentNotes
            .at(-1)
            ?.map((note) => note.midi);

          // if press correct note
          if ((currentNotesMidi || []).includes(note)) {
            const nextNotes = getNextNotes(
              currentNotes.at(-1)?.[0].time,
              firstTrackNotes
            );

            if (noteOff && noteOn) {
              currentNotes.at(-1)?.forEach((note) => {
                if (nextNotes.map((n) => n.midi).includes(note.midi)) {
                  // do nothing
                } else {
                  noteOff(note.midi, { velocity: 0 });
                }
              });
              nextNotes.forEach((note) => {
                if (note) {
                  noteOn(note.midi, { velocity: 1 });
                }
              });
              currentNotes.push(nextNotes);
            }
          }
        }
      }
    },
    [
      isRecording,
      isLearning,
      noteOnStack,
      noteOffStack,
      currentNotes,
      firstTrackNotes,
      noteOff,
      noteOn,
    ]
  );

  useEffect(() => {
    if (midiMessage) {
      getMIDIMessage(midiMessage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [midiMessage]);

  // helper function

  return (
    <MidiMessageContext.Provider value={undefined}>
      {children}
    </MidiMessageContext.Provider>
  );
};

export const useMidiMessage = () => {
  const context = useContext(MidiMessageContext);
  if (!context) {
    throw new Error("useSoundFont must be used within a FeatureProvider");
  }
  return context;
};

// helper

function getNextNotes(currentTime?: number, notes?: Note[]) {
  if (!currentTime || !notes) return [];

  const next = notes.find((note) => note.time > currentTime);
  if (!next) {
    return [];
  }
  return notes.filter((note) => note.time === next.time);
}
