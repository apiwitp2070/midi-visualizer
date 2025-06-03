export default function Header() {
  return (
    <header className="w-full px-4 bg-white h-12 flex justify-between items-center shadow-sm font-bold">
      <p>Midi Visualizer</p>
      <a
        href="https://github.com/apiwitp2070/midi-visualizer"
        target="_blank"
        rel="noopener noreferrer"
      >
        <img src="github-mark.svg" width={24} height={24} />
      </a>
    </header>
  );
}
