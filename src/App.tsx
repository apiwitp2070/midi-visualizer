import MidiVisualizer from "./components/midi/MidiVisualizer";
import MidiRecord from "./components/midi/MidiRecord";
import MidiLearning from "./components/midi/MidiLearning";
import MidiSetting from "./components/midi/MidiSetting";
import MidiUpload from "./components/midi/MidiUpload";
import MidiJsonView from "./components/midi/MidiJsonView";
import Sider from "./components/layout/Sider";

const PianoApp = () => {
  return (
    <div className="flex h-full relative">
      <Sider>
        <MidiUpload />
        <MidiSetting />

        <MidiLearning />
        <MidiRecord />
        <MidiJsonView />
      </Sider>

      <div className="flex-1 overflow-x-auto transition-all duration-500 ease-in-out m-6">
        <div className="h-full">
          <div className="flex justify-center min-w-[900px] w-full h-full">
            <MidiVisualizer />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PianoApp;
