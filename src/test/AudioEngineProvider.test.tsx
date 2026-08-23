import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SplendidGrandPiano } from "smplr";
import { AudioEngineProvider } from "@/context/AudioEngineProvider";
import { useAudioEngine } from "@/context/useAudioEngine";
import { MidiVisualizerProvider } from "@/context/MidiVisualizeContext";
import { useMidiVisualization } from "@/context/useMidiVisualization";
import MidiPlaybackControls from "@/components/midi/MidiPlaybackControls";
import { Midi } from "@tonejs/midi";

vi.mock("smplr", () => ({
  CacheStorage: vi.fn(),
  SplendidGrandPiano: vi.fn(),
}));

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  currentTime = 3;
  state: AudioContextState = "suspended";
  close = vi.fn(async () => {
    this.state = "closed";
  });
  resume = vi.fn(async () => {
    this.state = "running";
  });

  constructor() {
    FakeAudioContext.instances.push(this);
  }
}

const piano = (ready: Promise<void>) => ({
  ready,
  dispose: vi.fn(),
  start: vi.fn(() => vi.fn()),
});

const Probe = () => {
  const engine = useAudioEngine();
  return (
    <>
      <span data-testid="status">{engine.status}</span>
      <span data-testid="error">{engine.error?.message}</span>
      <button onClick={() => void engine.prepare()}>prepare</button>
      <button onClick={() => void engine.retry()}>retry</button>
      <button onClick={() => void engine.resume().catch(() => undefined)}>
        resume
      </button>
    </>
  );
};

describe("AudioEngineProvider", () => {
  beforeEach(() => {
    FakeAudioContext.instances = [];
    vi.stubGlobal("AudioContext", FakeAudioContext);
    vi.mocked(SplendidGrandPiano).mockReset();
  });

  it("moves from idle through loading to ready and disposes on unmount", async () => {
    let resolveReady!: () => void;
    const instrument = piano(
      new Promise<void>((resolve) => {
        resolveReady = resolve;
      }),
    );
    vi.mocked(SplendidGrandPiano).mockReturnValue(instrument as never);

    const view = render(
      <AudioEngineProvider>
        <Probe />
      </AudioEngineProvider>,
    );
    expect(screen.getByTestId("status")).toHaveTextContent("idle");
    fireEvent.click(screen.getByText("prepare"));
    expect(screen.getByTestId("status")).toHaveTextContent("loading");

    resolveReady();
    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("ready"),
    );

    view.unmount();
    expect(instrument.dispose).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(FakeAudioContext.instances[0].close).toHaveBeenCalledOnce(),
    );
  });

  it("reuses the ready engine across subsequent MIDI files", async () => {
    const instrument = piano(Promise.resolve());
    vi.mocked(SplendidGrandPiano).mockReturnValue(instrument as never);

    render(
      <AudioEngineProvider>
        <Probe />
      </AudioEngineProvider>,
    );
    fireEvent.click(screen.getByText("prepare"));
    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("ready"),
    );

    fireEvent.click(screen.getByText("prepare"));
    expect(SplendidGrandPiano).toHaveBeenCalledOnce();
    expect(FakeAudioContext.instances).toHaveLength(1);
  });

  it("recovers from a sample failure by replacing the failed engine", async () => {
    const failed = piano(Promise.reject(new Error("sample host unavailable")));
    const recovered = piano(Promise.resolve());
    vi.mocked(SplendidGrandPiano)
      .mockReturnValueOnce(failed as never)
      .mockReturnValueOnce(recovered as never);

    render(
      <AudioEngineProvider>
        <Probe />
      </AudioEngineProvider>,
    );
    fireEvent.click(screen.getByText("prepare"));
    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("error"),
    );
    expect(screen.getByTestId("error")).toHaveTextContent(
      "sample host unavailable",
    );

    fireEvent.click(screen.getByText("retry"));
    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("ready"),
    );
    expect(failed.dispose).toHaveBeenCalledOnce();
    expect(SplendidGrandPiano).toHaveBeenCalledTimes(2);
  });

  it("surfaces a rejected AudioContext resume", async () => {
    const instrument = piano(Promise.resolve());
    vi.mocked(SplendidGrandPiano).mockReturnValue(instrument as never);
    render(
      <AudioEngineProvider>
        <Probe />
      </AudioEngineProvider>,
    );
    fireEvent.click(screen.getByText("prepare"));
    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("ready"),
    );
    FakeAudioContext.instances[0].resume.mockRejectedValueOnce(
      new Error("autoplay denied"),
    );

    fireEvent.click(screen.getByText("resume"));
    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("error"),
    );
    expect(screen.getByTestId("error")).toHaveTextContent("autoplay denied");
  });
});

const PlaybackSetup = () => {
  const { setOriginalMidi, setTravelDistance } = useMidiVisualization();
  const { prepare } = useAudioEngine();
  return (
    <>
      <button
        onClick={() => {
          setOriginalMidi(new Midi());
          void prepare();
        }}
      >
        load midi
      </button>
      <button onClick={() => setTravelDistance(400)}>measure stage</button>
    </>
  );
};

describe("playback readiness", () => {
  beforeEach(() => {
    FakeAudioContext.instances = [];
    vi.stubGlobal("AudioContext", FakeAudioContext);
    vi.mocked(SplendidGrandPiano).mockReset();
  });

  it("keeps Play disabled until MIDI, stage measurement, and piano are ready", async () => {
    vi.mocked(SplendidGrandPiano).mockReturnValue(
      piano(Promise.resolve()) as never,
    );
    render(
      <AudioEngineProvider>
        <MidiVisualizerProvider>
          <PlaybackSetup />
          <MidiPlaybackControls />
        </MidiVisualizerProvider>
      </AudioEngineProvider>,
    );

    expect(screen.getByRole("button", { name: "Play" })).toBeDisabled();
    fireEvent.click(screen.getByText("load midi"));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Play" })).toBeDisabled(),
    );
    fireEvent.click(screen.getByText("measure stage"));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Play" })).toBeEnabled(),
    );
  });
});
