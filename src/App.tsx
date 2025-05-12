import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Midi } from "@tonejs/midi";
import {
  useMIDIMessage,
  useMIDIOutput,
  useMIDIOutputs,
} from "@react-midi/hooks";
import MidiVisualizer from "./components/MidiVisualizer";
import { config } from "./enums/config";
import { MIDIMessage } from "@react-midi/hooks/dist/types";
import { Note } from "@tonejs/midi/dist/Note";
import currency from "currency.js";
import axios from "axios";
import Soundfont from "soundfont-player";

interface NoteScoring {
  midi: number;
  velocity: number;
  time: number;
  checked?: boolean;
}

interface NoteScore {
  midi: number;
  name: string;
  time: number;
  score: number;
  timingResult: string; // "perfect" | "early" | "late" | "miss";
  durationResult: string; // "perfect" | "good" | "bad";
}

interface ScoreResult {
  total?: number;
  perfect: number;
  early: number;
  late: number;
  miss: number;
}

interface User {
  id: number;
  email: string;
}

interface AppProps {
  ac: AudioContext;
  piano: Soundfont.Player;
}

const PianoApp = ({ piano }: AppProps) => {
  const midiMessage = useMIDIMessage();
  const { output } = useMIDIOutputs();
  const { noteOn, noteOff } = useMIDIOutput();

  const [isRecording, setIsRecording] = useState(false);
  const [isLearning, setIsLearning] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [originalMidi, setOriginalMidi] = useState<Midi | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [defaultMidiBPM, setDefaultMidiBPM] = useState<number | null>(null);

  // step by step learning
  const [currentNotes, setCurrentNotes] = useState<NoteScoring[][]>([]);

  // test
  const [noteOnStack, setNoteOnStack] = useState<NoteScoring[]>([]);
  const [noteOffStack, setNoteOffStack] = useState<NoteScoring[]>([]);
  const [score, setScore] = useState<ScoreResult | null>(null);
  const [latestPLayedNotes, setLatestPlayedNotes] = useState<NoteScore[]>();

  // MIDI player
  const [canvasState, setCanvasState] = useState<"STOP" | "PLAY">("STOP");

  // authen
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isLogin, setIsLogin] = useState<boolean>(() => {
    return localStorage.getItem("token") !== null;
  });
  const [user, setUser] = useState<User>(() => {
    return JSON.parse(localStorage.getItem("user") || "{}") as User;
  });

  const delayOffset = 100;
  const canvasWidth = 800;

  // in miliseconds
  const songDelay =
    delayOffset +
    ((canvasWidth - config.noteStartOffset) / config.pixelsPerSecond) * 1000;

  const midiNotes = useMemo(() => {
    return (
      originalMidi?.tracks
        .filter((t) => t.notes.length)
        ?.flatMap((t) => t.notes)
        .sort((a, b) => a.ticks - b.ticks) || []
    );
  }, [originalMidi?.tracks]);

  const firstTrackNotes = useMemo(() => {
    return originalMidi?.tracks.find((t) => t.notes.length)?.notes || [];
  }, [originalMidi?.tracks]);

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

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      const fileUrl = URL.createObjectURL(file);
      const midi = await Midi.fromUrl(fileUrl);

      console.log("midi", midi);

      setOriginalFile(file);
      setOriginalMidi(midi);
      setDefaultMidiBPM(midi.header.tempos[0].bpm);
    }
  };

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

      // upload score
      axios.defaults.baseURL = "http://localhost:3003/api/";
      axios.defaults.headers.common.Authorization = `Bearer ${localStorage.getItem(
        "token"
      )}`;
      axios.defaults.headers.post["Access-Control-Allow-Origin"] = "*";

      const total = Object.values(scoreResult).reduce(
        (acc, value) => acc + value,
        0
      );

      await axios
        .post("score", {
          total,
          totalScore: score,
          ...scoreResult,
          song: originalFile?.name?.split(".mid")?.[0] || "Test",
        })
        .catch((err) => console.log("submit score error:", err));

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

  const playMidiSong = async () => {
    if (!originalMidi) return;

    if (canvasState === "STOP") {
      setCanvasState("PLAY");

      midiNotes.forEach((note, index, arr) => {
        const noteOnTimeout = currency(note.time).multiply(
          currency(1000)
        ).value;
        const noteOffTimeout = currency(note.duration).multiply(
          currency(1000)
        ).value;

        setTimeout(() => {
          piano.play(note.name, note.time - songDelay, {
            duration: note.duration,
          });

          if (output && noteOff && noteOn) {
            noteOn(note.midi, { velocity: note.velocity * 127 });

            setTimeout(() => {
              noteOff(note.midi, { velocity: note.velocity * 127 });

              if (index === arr.length - 1) {
                // finish playing
                setTimeout(() => {
                  console.log("song finished");
                  setCanvasState("STOP");
                  piano.stop();
                }, 1000);
              }
            }, noteOffTimeout);
          }
        }, songDelay + noteOnTimeout);
      });
    } else {
      setCanvasState("STOP");

      const highestTimeoutId = setTimeout(() => {}, 0);
      for (let i = 0; i < highestTimeoutId; i++) {
        clearTimeout(i);
      }
    }
  };

  const onChangeTempo = (e: ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);

    if (typeof value === "number" && value > 0) {
      if (defaultMidiBPM && originalMidi) {
        originalMidi.header.tempos[0].bpm =
          currency(defaultMidiBPM).multiply(value).value;
      }
    }
  };

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

  // authen

  const handleLogin = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    try {
      axios.defaults.baseURL = "http://localhost:3003/api/";
      const response = await axios.post("auth/login", {
        email,
        password,
      });
      console.log("res", response);

      const token = response.data.token;
      const user = response.data.user;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      setUser(user);
    } catch (err) {
      console.log("login error:", err);
    }
  };

  const handleLogout = (): void => {
    localStorage.removeItem("token");
    setIsLogin(false);
  };

  return (
    <div>
      {isLogin ? (
        <div>
          <p>Hello {user.email}!</p>
          <button onClick={handleLogout}>Logout</button>
        </div>
      ) : (
        <form onSubmit={handleLogin}>
          <h3>Login</h3>
          <span>
            <label>Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </span>
          <span>
            <label>Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </span>
          <button type="submit">Login</button>
        </form>
      )}
      <div style={{ display: "flex" }}>
        <div className="px-4">
          <h1>MIDI File</h1>
          <input type="file" onChange={handleFileUpload} />

          <div>
            <h2>Play MIDI</h2>
            <div style={{ paddingBottom: 10 }}>
              Tempo:
              <input
                defaultValue={1}
                onChange={onChangeTempo}
                placeholder="Enter number (e.g. 100)"
                style={{ marginInline: 8, width: 100 }}
              />
              x<div>(enter number (e.g. 1x, 2x, 0.5x))</div>
            </div>
            <button onClick={playMidiSong}>
              {canvasState === "PLAY" ? "Stop" : "Play"} MIDI
            </button>
          </div>

          <div>
            <h2>Learning</h2>
            <button disabled={!output} onClick={toggleLearning}>
              {isLearning ? "Stop" : "Start"} Learning
            </button>
            {!output && <p>Connect your MIDI device to use this feature</p>}
            <h2>Test:</h2>
            {startTime && <div>Start test at: {startTime}</div>}
            <button disabled={!output} onClick={() => handleToggleRecordMidi()}>
              {isRecording ? "Stop" : "Start"} the Test
            </button>
            {!output && <p>Connect your MIDI device to use this feature</p>}
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
                      Timing: {note.timingResult} | Duration:{" "}
                      {note.durationResult}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div>
            <h2>Record and Export</h2>
            <button
              disabled={!output}
              onClick={() => handleToggleRecordMidi("export")}
            >
              {isExporting ? "Stop" : "Start"} Record MIDI
            </button>
            {!output && <p>Connect your MIDI device to use this feature</p>}
          </div>
        </div>

        <div>
          {originalMidi && (
            <div style={{ display: "flex" }}>
              <MidiVisualizer canvasState={canvasState} notes={midiNotes} />
              <div className="w-[400px]">
                <pre>{JSON.stringify(originalMidi, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PianoApp;

// helper function

function getNextNotes(currentTime?: number, notes?: Note[]) {
  if (!currentTime || !notes) return [];

  const next = notes.find((note) => note.time > currentTime);
  if (!next) {
    return [];
  }
  return notes.filter((note) => note.time === next.time);
}
