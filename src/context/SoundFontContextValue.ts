import { createContext } from "react";
import Soundfont from "soundfont-player";

export interface SoundfontContextProps {
  ac: AudioContext;
  piano: Soundfont.Player;
}

export const SoundfontContext = createContext<
  SoundfontContextProps | undefined
>(undefined);
