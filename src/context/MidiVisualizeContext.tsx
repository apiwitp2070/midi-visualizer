import { Midi } from "@tonejs/midi";
import { useCallback, useMemo, useState } from "react";
import { NoteScoring, ScoreResult, NoteScore } from "../interfaces/note";
import {
  loadPlaybackSettings,
  normalizePlaybackSettings,
  persistPlaybackSettings,
  type PlaybackSettings,
} from "@/config/playback";
import {
  MidiVisualizerContext,
  type PlaybackState,
} from "./MidiVisualizeContextValue";

export const MidiVisualizerProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isLearning, setIsLearning] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [originalMidi, setOriginalMidiState] = useState<Midi | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);

  // step by step learning
  const [currentNotes, setCurrentNotes] = useState<NoteScoring[][]>([]);

  // test
  const [noteOnStack, setNoteOnStack] = useState<NoteScoring[]>([]);
  const [noteOffStack, setNoteOffStack] = useState<NoteScoring[]>([]);
  const [score, setScore] = useState<ScoreResult | null>(null);
  const [latestPLayedNotes, setLatestPlayedNotes] = useState<NoteScore[]>();
  const [playbackSettings, setPlaybackSettings] = useState(
    loadPlaybackSettings,
  );

  // MIDI player
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    status: "STOP",
    originAudioTime: null,
  });
  const stopPlayback = useCallback(
    () => setPlaybackState({ status: "STOP", originAudioTime: null }),
    [],
  );
  const startPlayback = useCallback(
    (originAudioTime: number) =>
      setPlaybackState({ status: "PLAY", originAudioTime }),
    [],
  );
  const savePlaybackSettings = useCallback(
    (settings: PlaybackSettings) => {
      const normalized = normalizePlaybackSettings(settings);
      stopPlayback();
      setPlaybackSettings(normalized);
      persistPlaybackSettings(normalized);
    },
    [stopPlayback],
  );

  const setOriginalMidi = useCallback<
    React.Dispatch<React.SetStateAction<Midi | null>>
  >((action) => {
    stopPlayback();
    setOriginalMidiState(action);
  }, [stopPlayback]);

  const midiNotes = useMemo(() => {
    return (
      originalMidi?.tracks
        .filter((t) => t.notes.length)
        ?.flatMap((t) => t.notes)
        .sort((a, b) => a.ticks - b.ticks) || []
    );
  }, [originalMidi?.tracks]);

  // How far a note falls from spawning at the top of the stage to reaching
  // the playhead. Published by MidiVisualizer once the canvas has measured
  // itself. Null until then: there is no safe stand-in, because a guessed
  // distance would schedule the audio against a different stage height than
  // the canvas draws with, and nothing ever corrects that offset. Playback is
  // gated on this being set instead.
  const [travelDistance, setTravelDistance] = useState<number | null>(null);

  const hasMeasuredStage = travelDistance !== null;

  const leadInSeconds =
    (travelDistance ?? 0) / playbackSettings.noteScrollSpeed;

  const firstTrackNotes = useMemo(() => {
    return originalMidi?.tracks.find((t) => t.notes.length)?.notes || [];
  }, [originalMidi?.tracks]);

  const value = useMemo(
    () => ({
      isRecording,
      setIsRecording,
      isLearning,
      setIsLearning,
      isExporting,
      setIsExporting,
      originalMidi,
      setOriginalMidi,
      fileName,
      setFileName,
      startTime,
      setStartTime,
      currentNotes,
      setCurrentNotes,
      noteOnStack,
      setNoteOnStack,
      noteOffStack,
      setNoteOffStack,
      score,
      setScore,
      latestPLayedNotes,
      setLatestPlayedNotes,
      playbackState,
      startPlayback,
      stopPlayback,
      playbackSettings,
      savePlaybackSettings,
      midiNotes,
      leadInSeconds,
      setTravelDistance,
      hasMeasuredStage,
      firstTrackNotes,
    }),
    [
      playbackState,
      playbackSettings,
      currentNotes,
      isExporting,
      isLearning,
      isRecording,
      latestPLayedNotes,
      noteOffStack,
      noteOnStack,
      originalMidi,
      setOriginalMidi,
      fileName,
      score,
      startTime,
      midiNotes,
      leadInSeconds,
      hasMeasuredStage,
      firstTrackNotes,
      startPlayback,
      stopPlayback,
      savePlaybackSettings,
    ],
  );

  return (
    <MidiVisualizerContext value={value}>{children}</MidiVisualizerContext>
  );
};
