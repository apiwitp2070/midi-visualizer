import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { MIDIProvider } from "@react-midi/hooks";
import Soundfont from "soundfont-player";

const ac = new AudioContext();
const piano = await Soundfont.instrument(ac, "acoustic_grand_piano");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MIDIProvider>
      <App ac={ac} piano={piano} />
    </MIDIProvider>
  </React.StrictMode>
);
