import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { MIDIProvider } from "@react-midi/hooks";
import Header from "./components/layout/Header.tsx";
import { SoundFontProvider } from "./context/SoundFontProvider.tsx";
import { MidiVisualizerProvider } from "./context/MidiVisualizeContext.tsx";
import { MidiMessageProvider } from "./context/MidiMessageContext.tsx";
import { ThemeProvider } from "./context/ThemeProvider.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <MIDIProvider>
        <Header />

        <main className="h-[calc(100vh-48px)] bg-surface text-text">
          <SoundFontProvider>
            <MidiVisualizerProvider>
              <MidiMessageProvider>
                <App />
              </MidiMessageProvider>
            </MidiVisualizerProvider>
          </SoundFontProvider>
        </main>
      </MIDIProvider>
    </ThemeProvider>
  </React.StrictMode>
);
