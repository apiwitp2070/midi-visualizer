import { useEffect, useRef } from "react";
import { useMIDIOutputs, useMIDIOutput } from "@react-midi/hooks";
import { useMidiVisualization } from "@/context/useMidiVisualization";
import { useSoundFont } from "@/context/useSoundFont";

/**
 * How often the scheduler wakes, in ms. Only has to be comfortably shorter
 * than LOOKAHEAD so no note's window is missed between two ticks.
 */
const TICK_MS = 25;

/**
 * How far ahead of the audio clock notes are handed to the soundfont, in
 * seconds. Everything inside this window is scheduled on the AudioContext's
 * own clock, which is sample-accurate — the tick only decides *when to hand
 * over*, never when a note sounds. Widening it costs nothing but memory;
 * narrowing it below TICK_MS would drop notes.
 */
const LOOKAHEAD = 0.2;

/** How long the release tail is allowed to ring before the song is called done. */
const TAIL_SECONDS = 1;

/**
 * Release time handed to each note, in seconds. Also how long past its end a
 * note may still be sounding, which is what decides when its handle can be
 * dropped — so the two must stay the same number.
 */
const NOTE_RELEASE = 1;

/** A note-off owed to the MIDI device, held until the clock reaches `at`. */
interface PendingNoteOff {
  midi: number;
  velocity: number;
  /** AudioContext time at which the note-off is due. */
  at: number;
}

/** A sounding note, kept so Stop can silence it without touching the rest. */
interface ScheduledNode {
  /** AudioContext time the note starts. */
  at: number;
  /** AudioContext time its release has finished and it is silent on its own. */
  endsAt: number;
  node: { stop: (when?: number) => void };
}

/**
 * Drives audio playback of the loaded file.
 *
 * Renders nothing, and must be mounted exactly once — it schedules sound, so a
 * second instance would play every note twice. It lives here rather than in
 * useMidiPlayback because that hook has several consumers.
 *
 * Notes are scheduled in a rolling window on the AudioContext clock rather than
 * with one setTimeout per note. That keeps the number of live timers constant
 * regardless of song length, makes Stop exact, and gives sample-accurate timing
 * that setTimeout cannot.
 */
const MidiScheduler = () => {
  const { ac, piano } = useSoundFont();
  const { output } = useMIDIOutputs();
  const { noteOn, noteOff } = useMIDIOutput();
  const { canvasState, setCanvasState, midiNotes, songDelay } =
    useMidiVisualization();

  /** Index of the next note to schedule. Only ever moves forward. */
  const cursorRef = useRef(0);
  /** AudioContext time that song time 0 maps to. */
  const originRef = useRef(0);
  const pendingOffsRef = useRef<PendingNoteOff[]>([]);
  const scheduledRef = useRef<ScheduledNode[]>([]);

  // The tick is created once per Play, but these change independently of it:
  // the note array is replaced on a new file, and the MIDI device can be
  // swapped mid-song. Read through a ref so neither restarts playback.
  const latest = useRef({ midiNotes, output, noteOn, noteOff });
  useEffect(() => {
    latest.current = { midiNotes, output, noteOn, noteOff };
  }, [midiNotes, output, noteOn, noteOff]);

  useEffect(() => {
    if (canvasState !== "PLAY") return;

    cursorRef.current = 0;
    pendingOffsRef.current = [];
    scheduledRef.current = [];

    // Normally already resumed by the click that started playback (see
    // useMidiPlayback). This covers the paths that set canvasState directly,
    // such as MidiRecord — those are still gestures, just not that one.
    if (ac.state === "suspended") void ac.resume();

    // songDelay (ms) is the time a note spends falling down the stage. Fixing
    // the origin once, here, is what keeps this clock and the canvas's
    // performance.now() clock describing the same song.
    //
    // Read from the prop, not the ref: the ref is synced by its own effect and
    // the order between the two is not worth depending on. songDelay is
    // deliberately absent from this effect's deps — a resize mid-song changes
    // it, and restarting playback on a resize is exactly what must not happen.
    originRef.current = ac.currentTime + songDelay / 1000;

    let warnedSuspended = false;

    const tick = () => {
      const now = ac.currentTime;
      const horizon = now + LOOKAHEAD;

      // A suspended context's currentTime is frozen, so the window never
      // reaches any note and playback is silent with nothing thrown. That is
      // exactly the failure this warning exists to name.
      if (import.meta.env.DEV && ac.state !== "running" && !warnedSuspended) {
        warnedSuspended = true;
        console.warn(
          `[MidiScheduler] AudioContext is "${ac.state}", not "running". ` +
            `Its clock is not advancing, so no note will sound. It must be ` +
            `resumed from a user gesture — see useMidiPlayback.`,
        );
      }

      const { midiNotes: notes, output: out, noteOn: on, noteOff: off } =
        latest.current;

      // Only the notes entering the window this tick, so a long song costs no
      // more per tick than a short one.
      while (cursorRef.current < notes.length) {
        const note = notes[cursorRef.current];
        const at = originRef.current + note.time;
        if (at > horizon) break;

        // Returns undefined when the soundfont has no buffer for this name,
        // so the handle list has to tolerate holes.
        const node = piano.play(note.name, at, {
          duration: note.duration,
          gain: note.velocity,
          release: NOTE_RELEASE,
        }) as unknown as ScheduledNode["node"] | undefined;
        if (node) {
          scheduledRef.current.push({
            at,
            endsAt: at + note.duration + NOTE_RELEASE,
            node,
          });
        }

        if (out && on && off) {
          // Web MIDI has no scheduling of its own, so the device gets its
          // note-on now and its note-off from the pending queue below.
          on(note.midi, { velocity: note.velocity * 127 });
          pendingOffsRef.current.push({
            midi: note.midi,
            velocity: note.velocity * 127,
            at: at + note.duration,
          });
        }

        cursorRef.current++;
      }

      if (off) {
        // Filtered rather than shifted: overlapping notes mean this queue is
        // not ordered by `at`.
        pendingOffsRef.current = pendingOffsRef.current.filter((pending) => {
          if (pending.at > now) return true;
          off(pending.midi, { velocity: pending.velocity });
          return false;
        });
      }

      // Handles are only needed until Stop can no longer be the thing that
      // silences them; past that the node ends on its own. Dropping them keeps
      // this list the size of the sounding notes rather than the whole song.
      scheduledRef.current = scheduledRef.current.filter(
        ({ endsAt }) => endsAt > now,
      );

      if (cursorRef.current >= notes.length) {
        const last = notes[notes.length - 1];
        // An empty file has nothing to wait for, so it ends immediately rather
        // than sitting in PLAY forever.
        const endsAt = last
          ? originRef.current + last.time + last.duration + TAIL_SECONDS
          : now;
        if (now >= endsAt) setCanvasState("STOP");
      }
    };

    const id = setInterval(tick, TICK_MS);
    // Once immediately, so a note at song time 0 is not held back by a tick.
    tick();

    return () => {
      clearInterval(id);

      // Silence what is currently sounding — but only that.
      //
      // piano.stop() would instead walk sample-player's internal `tracked`
      // map, which it never prunes, and call source.stop() on every node it
      // has ever created. A node whose start() is still in the future is
      // permanently cancelled by that, and StrictMode's double-mount runs this
      // cleanup right after the first tick has scheduled the opening notes.
      const now = ac.currentTime;
      scheduledRef.current.forEach(({ at, node }) => {
        // Notes still in the future simply never start: the interval is gone,
        // so nothing will advance them. Leaving them alone is what keeps the
        // real mount's notes intact.
        if (at <= now) node.stop();
      });
      scheduledRef.current = [];

      // Send the note-offs the device is owed — without these a held key stays
      // down on the hardware after Stop.
      const { noteOff: off } = latest.current;
      if (off) {
        pendingOffsRef.current.forEach((pending) => {
          off(pending.midi, { velocity: pending.velocity });
        });
      }
      pendingOffsRef.current = [];
      cursorRef.current = 0;
    };
    // songDelay is read once at Play and intentionally omitted: including it
    // would restart the song every time the window is resized.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ac, canvasState, piano, setCanvasState]);

  return null;
};

export default MidiScheduler;
