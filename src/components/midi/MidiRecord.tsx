import { useMIDIOutputs } from "@react-midi/hooks";
import { useMidiVisualization } from "@/context/useMidiVisualization";
import Button from "@/components/common/Button";
import { Midi } from "@tonejs/midi";
import { NoteScore, NoteScoring, ScoreResult } from "@/interfaces/note";
import Accordion from "@/components/common/Accordion";
import { cn } from "@/utils/cn";

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
        const blob = new Blob([new Uint8Array(midiData)], {
          type: "audio/midi",
        });
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
        let timingResult: string;
        let durationResult: string;

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

  const maxScore = firstTrackNotes.length * 4;

  return (
    <>
      <Accordion id="ac-test" title="Test your playing">
        <div className="flex flex-col gap-2">
          <p className="text-xs text-text-muted">
            Play along with the file. Each note is judged on timing and length.
          </p>
          <Button
            disabled={!output || !originalMidi}
            onClick={() => handleToggleRecordMidi()}
            variant={isRecording ? "danger" : "primary"}
          >
            {isRecording ? "Stop" : "Start"} test
          </Button>
        </div>
      </Accordion>

      {score && <ScoreCard score={score} max={maxScore} notes={latestPLayedNotes} />}

      <Accordion id="sc-rec" title="Record and export">
        <div className="flex flex-col gap-2">
          <p className="text-xs text-text-muted">
            Captures what you play and saves it as a new .mid file.
          </p>
          <Button
            disabled={!output}
            onClick={() => handleToggleRecordMidi("export")}
            variant={isExporting ? "danger" : "primary"}
          >
            {isExporting ? "Stop and save" : "Start recording"}
          </Button>
        </div>
      </Accordion>
    </>
  );
}

// helpers

/** Judgement colours, worst to best. `good` only appears for note duration. */
const JUDGEMENT: Record<string, string> = {
  perfect: "text-accent",
  good: "text-accent",
  early: "text-text",
  late: "text-text",
  miss: "text-danger",
};

const StatCell = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) => (
  <div className="rounded-md bg-surface-sunken px-2 py-1.5 text-center">
    <div className={cn("font-mono text-base font-semibold", tone)}>{value}</div>
    <div className="text-[10px] tracking-wide text-text-muted uppercase">
      {label}
    </div>
  </div>
);

/**
 * The payoff screen. Leads with the total as a single large number, then the
 * four judgement counts, then the per-note detail — so the result is readable
 * at a glance and only rewards a closer look if you want one.
 */
const ScoreCard = ({
  score,
  max,
  notes,
}: {
  score: ScoreResult;
  max: number;
  notes?: NoteScore[];
}) => {
  const pct = max ? Math.round(((score.total ?? 0) / max) * 100) : 0;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface-raised shadow-xs">
      <div className="border-b border-border px-3 py-3 text-center">
        <div className="text-[11px] font-bold tracking-[0.14em] text-text-muted uppercase">
          Your score
        </div>
        <div className="mt-1 flex items-baseline justify-center gap-1.5 font-display">
          <span className="text-4xl font-bold tracking-tight text-text tabular-nums">
            {score.total ?? 0}
          </span>
          <span className="font-mono text-sm text-text-muted">/ {max}</span>
        </div>

        {/* A single bar carries the ratio faster than the fraction does. */}
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-sunken">
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-1 font-mono text-xs text-text-muted">{pct}%</div>
      </div>

      <div className="grid grid-cols-4 gap-1.5 p-3">
        <StatCell label="Perfect" value={score.perfect} tone="text-accent" />
        <StatCell label="Early" value={score.early} tone="text-text" />
        <StatCell label="Late" value={score.late} tone="text-text" />
        <StatCell label="Miss" value={score.miss} tone="text-danger" />
      </div>

      {!!notes?.length && (
        <div className="max-h-56 overflow-y-auto border-t border-border">
          {notes.map((note, index) => (
            <div
              key={`${note.time}-${note.midi}-${index}`}
              className="flex items-center justify-between gap-2 px-3 py-1.5 font-mono text-xs odd:bg-surface-sunken/50"
            >
              <span className="w-10 font-semibold text-text">{note.name}</span>
              <span className={cn("flex-1", JUDGEMENT[note.timingResult])}>
                {note.timingResult}
              </span>
              <span className={cn("w-14", JUDGEMENT[note.durationResult])}>
                {note.durationResult}
              </span>
              <span className="w-4 text-right text-text-muted">
                {note.score}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
