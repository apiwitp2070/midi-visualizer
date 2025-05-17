import { useMIDIOutputs } from "@react-midi/hooks";
import { useMidiVisualization } from "@/context/MidiVisualizeContext";
import Button from "@/components/common/Button";
import { Midi } from "@tonejs/midi";
import { NoteScore, NoteScoring } from "@/interfaces/note";
import Accordion from "@/components/common/Accordion";

export default function MidiRecord() {
  const {
    originalMidi,
    startTime,
    isRecording,
    score,
    setScore,
    setLatestPlayedNotes,
    setCanvasState,
    setIsRecording,
    setStartTime,
    noteOnStack,
    noteOffStack,
    setNoteOffStack,
    setNoteOnStack,
    isExporting,
    songDelay,
    setIsExporting,
    firstTrackNotes,
    latestPLayedNotes,
  } = useMidiVisualization();

  const { output } = useMIDIOutputs();

  const handleToggleRecordMidi = async (toggleType = "record") => {
    if (isRecording) {
      setCanvasState("STOP");
      setIsRecording(false);
      setStartTime(null);

      const newMidi = new Midi();
      const track = newMidi.addTrack();

      noteOnStack.forEach((note) => {
        const offNote = noteOffStack.find(
          (off) => off.midi === note.midi && !off.checked
        );

        if (offNote) {
          offNote.checked = true;

          track.addNote({
            midi: note.midi,
            time:
              (note.time - (startTime || noteOnStack[0].time) - songDelay) /
              1000,
            duration: (offNote.time - note.time) / 1000,
            velocity: note.velocity / 127, // normalized velocity bwtween 0 and 1
          });
        }
      });

      setNoteOnStack([]);
      setNoteOffStack([]);

      console.log("final midi data", newMidi);

      if (isExporting) {
        setIsExporting(false);

        if (!noteOffStack) return;

        const midiData = newMidi.toArray();
        const blob = new Blob([midiData], { type: "audio/midi" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `output_${new Date().valueOf()}.mid`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }

      if (!originalMidi) {
        throw new Error("no original midi");
      }

      const originalMidiNotes = originalMidi.tracks[0].notes;
      const newMidiNotes = newMidi.tracks[0].notes;

      // calculating score

      const testResult: NoteScore[] = [];

      const scoreResult = {
        perfect: 0,
        early: 0,
        late: 0,
        miss: 0,
      };

      const score = originalMidiNotes.reduce((acc, curr) => {
        let score = 0;
        let timingResult = "";
        let durationResult = "";

        const playedNote = newMidiNotes.find(
          (note: NoteScoring) =>
            !note.checked &&
            note.midi === curr.midi &&
            curr.time - 0.5 < note.time &&
            note.time < curr.time + 0.5
        );

        if (playedNote) {
          // note timing
          const timeDiff = Math.abs(curr.time - playedNote.time);

          if (timeDiff <= 0.25) {
            score += 2;
            timingResult = "perfect";
          } else if (timeDiff <= 0.5 && playedNote.time < curr.time) {
            score += 1;
            timingResult = "early";
          } else if (timeDiff <= 0.5 && playedNote.time > curr.time) {
            score += 1;
            timingResult = "late";
          } else {
            timingResult = "miss";
          }

          // note duration
          const durationDiff = Math.abs(curr.duration - playedNote.duration);

          if (durationDiff <= 0.15) {
            durationResult = "perfect";
            score += 2;
          } else if (durationDiff <= 0.25) {
            durationResult = "good";
            score += 1;
          } else {
            durationResult = "miss";
          }

          (playedNote as NoteScoring).checked = true;
        } else {
          timingResult = "miss";
          durationResult = "miss";
          console.log("score for note", curr.midi, curr.name, ": MISS");
        }

        console.log(
          "score for note",
          curr.midi,
          curr.name,
          "is :",
          score,
          timingResult
        );

        acc += score;
        scoreResult[timingResult as "perfect" | "early" | "late" | "miss"] += 1;

        testResult.push({
          midi: curr.midi,
          name: curr.name,
          time: curr.time,
          score,
          timingResult,
          durationResult,
        });

        return acc;
      }, 0);

      setScore({
        total: score,
        ...scoreResult,
      });

      // visualize frontend
      setLatestPlayedNotes(testResult);
    } else {
      if (toggleType === "export") {
        setIsExporting(true);
      }

      console.log("start record, play the keyboard!");
      setIsRecording(true);
      setCanvasState("PLAY");
      setStartTime(new Date().valueOf());
    }
  };

  return (
    <>
      <Accordion id="ac-test" title="Test">
        <div className="flex flex-col gap-2">
          {startTime && <div>Start test at: {startTime}</div>}
          <Button disabled={!output} onClick={() => handleToggleRecordMidi()}>
            {isRecording ? "Stop" : "Start"} the Test
          </Button>
          {!output && (
            <p className="text-slate-500">
              Connect your MIDI device to use this feature
            </p>
          )}
        </div>
      </Accordion>

      {score && (
        <>
          <h2>Your score:</h2>
          <div>
            TOTAL: {score.total} / {firstTrackNotes.length * 4}
          </div>
          <div>Perfect: {score.perfect}</div>
          <div>Early: {score.early}</div>
          <div>Late: {score.late}</div>
          <div>Miss: {score.miss}</div>

          <div className="pt-4">
            {latestPLayedNotes?.map((note) => (
              <div key={note.time}>
                <div className="font-semibold pt-2">
                  Note: {note.name} | Score: {note.score}
                </div>
                Timing: {note.timingResult} | Duration: {note.durationResult}
              </div>
            ))}
          </div>
        </>
      )}

      <Accordion id="sc-rec" title="Record and export as MIDI file">
        <div className="flex flex-col gap-2">
          <Button
            disabled={!output}
            onClick={() => handleToggleRecordMidi("export")}
          >
            {isExporting ? "Stop" : "Start"} Record MIDI
          </Button>
          {!output && (
            <p className="text-slate-500">
              Connect your MIDI device to use this feature
            </p>
          )}
        </div>
      </Accordion>
    </>
  );
}
