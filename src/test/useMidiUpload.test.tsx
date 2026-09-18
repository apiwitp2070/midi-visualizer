import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MidiVisualizerProvider } from "@/context/MidiVisualizeContext";
import { useMidiVisualization } from "@/context/useMidiVisualization";
import { useMidiUpload } from "@/hooks/useMidiUpload";

const prepare = vi.fn(async () => undefined);
vi.mock("@/context/useAudioEngine", () => ({
  useAudioEngine: () => ({ prepare }),
}));

const UploadProbe = () => {
  const { handleFileUpload } = useMidiUpload();
  const { originalMidi, fileName } = useMidiVisualization();
  return (
    <>
      <input aria-label="midi file" type="file" onChange={handleFileUpload} />
      <span>{originalMidi ? `loaded ${fileName}` : "empty"}</span>
    </>
  );
};

describe("useMidiUpload", () => {
  it("loads a valid MIDI file with no tempo event", async () => {
    const bytes = new Uint8Array([
      0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 0, 96, 0x4d, 0x54, 0x72,
      0x6b, 0, 0, 0, 4, 0, 0xff, 0x2f, 0,
    ]);
    const file = {
      name: "no-tempo.mid",
      arrayBuffer: async () => bytes.buffer,
    };

    render(
      <MidiVisualizerProvider>
        <UploadProbe />
      </MidiVisualizerProvider>,
    );
    fireEvent.change(screen.getByLabelText("midi file"), {
      target: { files: [file] },
    });

    await waitFor(() =>
      expect(screen.getByText("loaded no-tempo.mid")).toBeInTheDocument(),
    );
    expect(prepare).toHaveBeenCalledOnce();
  });
});
