import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { MIDIProvider } from "@react-midi/hooks";
import Soundfont from "soundfont-player";
import Header from "./components/layout/Header.tsx";

const ac = new AudioContext();
const piano = await Soundfont.instrument(ac, "acoustic_grand_piano");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MIDIProvider>
      <Header />

      <main className="h-[calc(100vh-48px)]">
        <App ac={ac} piano={piano} />
      </main>
    </MIDIProvider>
  </React.StrictMode>
);
