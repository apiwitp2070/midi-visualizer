import { useMemo } from "react";
import Soundfont from "soundfont-player";
import { SoundfontContext } from "./SoundFontContextValue";

const ac = new AudioContext();
const piano = await Soundfont.instrument(ac, "acoustic_grand_piano");

export const SoundFontProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const value = useMemo(
    () => ({
      ac,
      piano,
    }),
    []
  );

  // No unmount cleanup on purpose. `piano` is module-level and outlives this
  // provider, and sample-player already disconnects each node in its
  // source.onended handler, so finished notes release themselves. A
  // piano.stop() here would instead cancel notes scheduled but not yet
  // started — under StrictMode's double-mount that is every opening note.

  return (
    <SoundfontContext value={value}>
      {children}
    </SoundfontContext>
  );
};
