import { useContext } from "react";
import { SoundfontContext } from "./SoundFontContextValue";

export const useSoundFont = () => {
  const context = useContext(SoundfontContext);
  if (!context) {
    throw new Error("useSoundFont must be used within a FeatureProvider");
  }
  return context;
};
