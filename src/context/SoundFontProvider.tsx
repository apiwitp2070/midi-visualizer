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

  return (
    <SoundfontContext value={value}>
      {children}
    </SoundfontContext>
  );
};
