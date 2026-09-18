import { useContext } from "react";
import { AudioEngineContext } from "./AudioEngineContextValue";

export const useAudioEngine = () => {
  const context = useContext(AudioEngineContext);
  if (!context) {
    throw new Error(
      "useAudioEngine must be used within an AudioEngineProvider",
    );
  }
  return context;
};
