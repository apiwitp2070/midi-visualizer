import { useState } from "react";
import { useMIDIOutputs } from "@react-midi/hooks";
import MidiVisualizer from "./components/midi/MidiVisualizer";
import MidiRecord from "./components/midi/MidiRecord";
import MidiLearning from "./components/midi/MidiLearning";
import MidiSetting from "./components/midi/MidiSetting";
import MidiUpload from "./components/midi/MidiUpload";
import MidiJsonView from "./components/midi/MidiJsonView";
import Sider, { SiderSection } from "./components/layout/Sider";
import { cn } from "./utils/cn";

const PianoApp = () => {
  // Derived in the initializer rather than a mount effect: the drawer covers
  // the keyboard on small screens, so it starts closed there and open on the
  // desktop layout where it costs nothing.
  const [showSidebar, setShowSidebar] = useState(
    () =>
      typeof window === "undefined" ||
      !window.matchMedia("(max-width: 1023px)").matches,
  );
  const { output } = useMIDIOutputs();

  return (
    <div className="relative flex h-full">
      <Sider open={showSidebar} onClose={() => setShowSidebar(false)}>
        <SiderSection title="MIDI File">
          <MidiUpload />
          <MidiSetting />
        </SiderSection>

        <SiderSection
          title="With a MIDI device"
          dimmed={!output}
          note={
            output
              ? undefined
              : "Connect a MIDI keyboard to use these features."
          }
        >
          <MidiLearning />
          <MidiRecord />
        </SiderSection>

        <SiderSection title="Inspect">
          <MidiJsonView />
        </SiderSection>
      </Sider>

      <button
        onClick={() => setShowSidebar((prev) => !prev)}
        aria-expanded={showSidebar}
        aria-label={showSidebar ? "Hide controls" : "Show controls"}
        className={cn(
          "absolute top-3 z-40 flex h-8 items-center gap-1.5 rounded-r-md border border-l-0 border-border",
          "bg-surface-raised px-2 text-xs text-text-muted shadow-sm cursor-pointer",
          "transition-[left,color] duration-300 ease-in-out hover:text-text",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          showSidebar ? "left-0 lg:left-[340px]" : "left-0",
        )}
      >
        <span aria-hidden>{showSidebar ? "‹" : "›"}</span>
        {!showSidebar && <span className="font-medium">Controls</span>}
      </button>

      <main className="min-w-0 flex-1 overflow-hidden p-3 sm:p-4 lg:p-6">
        <MidiVisualizer />
      </main>
    </div>
  );
};

export default PianoApp;
