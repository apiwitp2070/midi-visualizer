import { describe, expect, it } from "vitest";
import { NoteWindowIndex } from "@/utils/NoteWindowIndex";

interface TestNote {
  id: string;
  time: number;
  duration: number;
  midi: number;
}

const ids = (notes: TestNote[]) => notes.map((note) => note.id).sort();

describe("NoteWindowIndex", () => {
  const notes: TestNote[] = [
    { id: "long", time: -2, duration: 10, midi: 60 },
    { id: "flash", time: 1, duration: 0.001, midi: 61 },
    { id: "chord-a", time: 2, duration: 1, midi: 64 },
    { id: "chord-b", time: 2, duration: 1, midi: 67 },
    { id: "overlap", time: 2.5, duration: 2, midi: 64 },
    { id: "retrigger", time: 3, duration: 0.2, midi: 64 },
    { id: "outside-piano", time: 4, duration: 1, midi: 5 },
  ];

  it("keeps long notes and admits short notes, chords, overlaps, and retriggers", () => {
    const index = new NoteWindowIndex(notes);

    expect(ids(index.update(0, 1.5))).toEqual(["flash", "long"]);
    // A frame at 1.01 uses the prior frame's 0.99 lower bound, so the 1ms
    // note is still available to flash its key once.
    expect(ids(index.update(0.99, 3.1))).toEqual([
      "chord-a",
      "chord-b",
      "flash",
      "long",
      "overlap",
      "retrigger",
    ]);
    expect(ids(index.update(4, 4.5))).toEqual([
      "long",
      "outside-piano",
      "overlap",
    ]);
  });

  it("rebuilds after a smaller resize horizon, backward movement, and replay", () => {
    const index = new NoteWindowIndex(notes);
    index.update(0, 4.5);

    expect(ids(index.update(0.1, 1.5))).toEqual(["flash", "long"]);
    expect(ids(index.update(-1, 0))).toEqual(["long"]);

    index.reset();
    expect(ids(index.update(0, 1.5))).toEqual(["flash", "long"]);
  });
});
