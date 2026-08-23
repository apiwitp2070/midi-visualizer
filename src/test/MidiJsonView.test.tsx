import { fireEvent, render, screen } from "@testing-library/react";
import { Midi } from "@tonejs/midi";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MidiJsonView from "@/components/midi/MidiJsonView";
import { MidiVisualizerProvider } from "@/context/MidiVisualizeContext";
import { useMidiVisualization } from "@/context/useMidiVisualization";

const LoadMidi = () => {
  const { setOriginalMidi, setFileName } = useMidiVisualization();
  return (
    <button
      onClick={() => {
        setOriginalMidi(new Midi());
        setFileName("example.mid");
      }}
    >
      load
    </button>
  );
};

describe("MidiJsonView", () => {
  const createObjectURL = vi.fn((blob: Blob) => {
    void blob;
    return "blob:midi-json";
  });
  const revokeObjectURL = vi.fn();
  let downloadedName = "";

  beforeEach(() => {
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    downloadedName = "";
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL,
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloadedName = this.download;
    });
  });

  it("downloads the rendered raw MIDI JSON", () => {
    render(
      <MidiVisualizerProvider>
        <LoadMidi />
        <MidiJsonView />
      </MidiVisualizerProvider>,
    );

    expect(
      screen.queryByRole("button", { name: "Download JSON" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("load"));
    fireEvent.click(screen.getByRole("button", { name: "Download JSON" }));

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(createObjectURL.mock.calls[0][0]).toBeInstanceOf(Blob);
    expect(downloadedName).toBe("example.json");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:midi-json");
  });
});
