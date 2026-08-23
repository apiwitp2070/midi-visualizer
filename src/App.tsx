import { useState } from "react";
import { useMIDIOutputs } from "@react-midi/hooks";
import MidiVisualizer from "./components/midi/MidiVisualizer";
import MidiRecord from "./components/midi/MidiRecord";
import MidiLearning from "./components/midi/MidiLearning";
import MidiPlaybackControls from "./components/midi/MidiPlaybackControls";
import PlaybackSettings from "./components/midi/PlaybackSettings";
import MidiUpload from "./components/midi/MidiUpload";
import MidiJsonView from "./components/midi/MidiJsonView";
import Sider, { SiderSection } from "./components/layout/Sider";
import { PanelToggleIcon } from "./components/common/icons";
import { cn } from "./utils/cn";

const CollapseButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    aria-expanded
    aria-label="Hide controls"
    title="Hide controls"
    className={cn(
      "-mr-1 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md",
      "text-text-muted transition-colors hover:bg-surface-raised hover:text-text",
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
    )}
  >
    <PanelToggleIcon />
  </button>
);

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
      <Sider
        open={showSidebar}
        onClose={() => setShowSidebar(false)}
        onOpen={() => setShowSidebar(true)}
      >
        <SiderSection
          title="MIDI File"
          action={<CollapseButton onClick={() => setShowSidebar(false)} />}
        >
          <MidiUpload />
          <MidiPlaybackControls />
          <PlaybackSettings />
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

      {!showSidebar && (
        <button
          onClick={() => setShowSidebar(true)}
          aria-expanded={false}
          aria-label="Show controls"
          title="Show controls"
          className={cn(
            "absolute top-3 left-3 z-40 flex size-9 items-center justify-center rounded-md lg:hidden",
            "border border-border bg-surface-raised text-text-muted shadow-sm cursor-pointer",
            "transition-colors hover:text-text",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          )}
        >
          <PanelToggleIcon />
        </button>
      )}

      <main
        className={cn(
          "min-w-0 flex-1 overflow-hidden p-3 sm:p-4 lg:p-6",
          !showSidebar && "max-lg:pt-15",
        )}
      >
        <MidiVisualizer />
      </main>
    </div>
  );
};

export default PianoApp;
