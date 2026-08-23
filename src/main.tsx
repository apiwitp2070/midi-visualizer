import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { MIDIProvider } from "@react-midi/hooks";
import Header from "./components/layout/Header.tsx";
import { AudioEngineProvider } from "./context/AudioEngineProvider.tsx";
import { MidiVisualizerProvider } from "./context/MidiVisualizeContext.tsx";
import { MidiMessageProvider } from "./context/MidiMessageContext.tsx";
import { ThemeProvider } from "./context/ThemeProvider.tsx";
import MidiScheduler from "./components/midi/MidiScheduler.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <MIDIProvider>
        <AudioEngineProvider>
          <MidiVisualizerProvider>
            <MidiMessageProvider>
              {/* Mounted once, on purpose: it schedules audio, so a second
                  instance would play every note twice. */}
              <MidiScheduler />

              {/* Header sits inside MidiVisualizerProvider so its status line
                  can read the loaded file and playback state. */}
              <Header />

              <main className="h-[calc(100dvh-48px)] bg-surface text-text">
                <App />
              </main>
            </MidiMessageProvider>
          </MidiVisualizerProvider>
        </AudioEngineProvider>
      </MIDIProvider>
    </ThemeProvider>
  </React.StrictMode>
);
