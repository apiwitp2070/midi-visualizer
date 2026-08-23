import { StrictMode } from "react";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MidiScheduler from "@/components/midi/MidiScheduler";

const mocks = vi.hoisted(() => {
  const stops: ReturnType<typeof vi.fn>[] = [];
  return {
    stops,
    pianoStart: vi.fn(() => {
      const stop = vi.fn();
      stops.push(stop);
      return stop;
    }),
    stopPlayback: vi.fn(),
  };
});

vi.mock("@react-midi/hooks", () => ({
  useMIDIOutputs: () => ({ output: undefined }),
}));

vi.mock("@/context/useAudioEngine", () => ({
  useAudioEngine: () => ({
    audioContext: { currentTime: 1 },
    piano: { start: mocks.pianoStart },
    status: "ready",
  }),
}));

vi.mock("@/context/useMidiVisualization", () => ({
  useMidiVisualization: () => ({
    playbackState: { status: "PLAY", originAudioTime: 1 },
    stopPlayback: mocks.stopPlayback,
    midiNotes: [{ midi: 60, velocity: 1, time: 0, duration: 2 }],
  }),
}));

describe("MidiScheduler StrictMode lifecycle", () => {
  it("cancels the first setup before rescheduling opening notes", () => {
    const view = render(
      <StrictMode>
        <MidiScheduler />
      </StrictMode>,
    );

    expect(mocks.pianoStart).toHaveBeenCalledTimes(2);
    expect(mocks.stops[0]).toHaveBeenCalledOnce();
    expect(mocks.stops[1]).not.toHaveBeenCalled();

    view.unmount();
    expect(mocks.stops[1]).toHaveBeenCalledOnce();
  });
});
