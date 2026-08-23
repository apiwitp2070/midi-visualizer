import { useMemo } from "react";
import { useMidiVisualization } from "@/context/useMidiVisualization";
import Accordion from "@/components/common/Accordion";
import { DownloadIcon } from "@/components/common/icons";

export default function MidiJsonView() {
  const { originalMidi, fileName } = useMidiVisualization();
  const json = useMemo(
    () => (originalMidi ? JSON.stringify(originalMidi, null, 2) : ""),
    [originalMidi],
  );
  if (!originalMidi) return null;

  const download = () => {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const baseName = fileName?.replace(/\.(mid|midi)$/i, "") || "midi-data";
    link.href = url;
    link.download = `${baseName}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Accordion id="ac-json" title="Raw MIDI data">
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={download}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs font-medium text-text-muted transition-colors hover:border-border-strong hover:bg-surface-sunken hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-60"
        >
          <DownloadIcon />
          Download JSON
        </button>
      </div>
      <pre className="overflow-auto font-mono text-[10px] leading-relaxed whitespace-pre-wrap text-text-muted">
        {json}
      </pre>
    </Accordion>
  );
}
