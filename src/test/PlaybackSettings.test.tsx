import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import PlaybackSettings from "@/components/midi/PlaybackSettings";
import {
  DEFAULT_PLAYBACK_SETTINGS,
  PLAYBACK_SETTINGS_STORAGE_KEY,
  normalizePlaybackSettings,
} from "@/config/playback";
import { MidiVisualizerProvider } from "@/context/MidiVisualizeContext";
import { useMidiVisualization } from "@/context/useMidiVisualization";

const SettingsProbe = () => {
  const { playbackSettings, playbackState, startPlayback } =
    useMidiVisualization();
  return (
    <>
      <output data-testid="settings">{JSON.stringify(playbackSettings)}</output>
      <output data-testid="playback-status">{playbackState.status}</output>
      <button onClick={() => startPlayback(10)}>start playback</button>
    </>
  );
};

describe("playback settings", () => {
  beforeEach(() => localStorage.clear());

  it("normalizes unsafe stored or entered values", () => {
    expect(
      normalizePlaybackSettings({
        visualOffsetMs: 900,
        noteScrollSpeed: 0,
        showNoteLabels: false,
      }),
    ).toEqual({
      visualOffsetMs: 500,
      noteScrollSpeed: 80,
      showNoteLabels: false,
    });
    expect(normalizePlaybackSettings(null)).toEqual(
      DEFAULT_PLAYBACK_SETTINGS,
    );
  });

  it("applies only on Save, persists values, and stops active playback", () => {
    render(
      <MidiVisualizerProvider>
        <PlaybackSettings />
        <SettingsProbe />
      </MidiVisualizerProvider>,
    );

    fireEvent.change(screen.getByLabelText("Visual offset"), {
      target: { value: "120" },
    });
    fireEvent.change(screen.getByLabelText("Note speed"), {
      target: { value: "300" },
    });
    fireEvent.click(screen.getByLabelText("Show note labels"));

    expect(screen.getByTestId("settings")).toHaveTextContent(
      JSON.stringify(DEFAULT_PLAYBACK_SETTINGS),
    );
    fireEvent.click(screen.getByText("start playback"));
    expect(screen.getByTestId("playback-status")).toHaveTextContent("PLAY");

    fireEvent.click(screen.getByRole("button", { name: "Save & stop" }));

    const expected = {
      visualOffsetMs: 120,
      noteScrollSpeed: 300,
      showNoteLabels: false,
    };
    expect(screen.getByTestId("settings")).toHaveTextContent(
      JSON.stringify(expected),
    );
    expect(screen.getByTestId("playback-status")).toHaveTextContent("STOP");
    expect(
      JSON.parse(localStorage.getItem(PLAYBACK_SETTINGS_STORAGE_KEY) || ""),
    ).toEqual(expected);
    expect(screen.getByText("Settings saved.")).toBeInTheDocument();
  });
});
