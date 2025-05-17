import { createContext, useContext, useMemo } from "react";
import Soundfont from "soundfont-player";

interface SoundfontContextProps {
  ac: AudioContext;
  piano: Soundfont.Player;
}

const ac = new AudioContext();
const piano = await Soundfont.instrument(ac, "acoustic_grand_piano");

const SoundfontContext = createContext<SoundfontContextProps | undefined>(
  undefined
);

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
    <SoundfontContext.Provider value={value}>
      {children}
    </SoundfontContext.Provider>
  );
};

export const useSoundFont = () => {
  const context = useContext(SoundfontContext);
  if (!context) {
    throw new Error("useSoundFont must be used within a FeatureProvider");
  }
  return context;
};
