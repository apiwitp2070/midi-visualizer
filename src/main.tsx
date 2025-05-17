import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { MIDIProvider } from "@react-midi/hooks";
import Header from "./components/layout/Header.tsx";
import { SoundFontProvider } from "./context/SoundFontProvider.tsx";
import { MidiVisualizerProvider } from "./context/MidiVisualizeContext.tsx";
import { MidiMessageProvider } from "./context/MidiMessageContext.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MIDIProvider>
      <Header />

      <main className="h-[calc(100vh-48px)]">
        <SoundFontProvider>
          <MidiVisualizerProvider>
            <MidiMessageProvider>
              <App />
            </MidiMessageProvider>
          </MidiVisualizerProvider>
        </SoundFontProvider>
      </main>
    </MIDIProvider>
  </React.StrictMode>
);
