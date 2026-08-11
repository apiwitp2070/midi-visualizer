import { useContext } from "react";
import { MidiVisualizerContext } from "./MidiVisualizeContextValue";

export const useMidiVisualization = () => {
  const context = useContext(MidiVisualizerContext);
  if (!context) {
    throw new Error("useFeature must be used within a FeatureProvider");
  }
  return context;
};
