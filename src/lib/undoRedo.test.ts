import { describe, expect, it } from "vitest";
import { historyReducer, initialHistory, type History } from "./undoRedo";

const edit = (state: History<string>, value: string, time = 0, group?: string) =>
  historyReducer(state, { type: "set", value, time, group });

describe("rubric edit history", () => {
  it("undoes and redoes multiple edits in order", () => {
    const start = edit(edit(initialHistory("original"), "renamed"), "deleted");
    const undone = historyReducer(start, { type: "undo" });
    expect(undone.present).toBe("renamed");
    const original = historyReducer(undone, { type: "undo" });
    expect(original.present).toBe("original");
    expect(historyReducer(historyReducer(original, { type: "redo" }), { type: "redo" }).present).toBe("deleted");
  });
  it("groups rapid typing in one field, separating pauses and other fields", () => {
    let state = edit(initialHistory(""), "a", 10, "name");
    state = edit(state, "ab", 100, "name");
    expect(state.past).toEqual([""]);
    state = edit(state, "abc", 1000, "name");
    state = edit(state, "description", 1100, "description");
    expect(state.past).toEqual(["", "ab", "abc"]);
  });
  it("ends grouping when focus leaves a field", () => {
    let state = edit(initialHistory(""), "a", 10, "name");
    state = historyReducer(state, { type: "break" });
    state = edit(state, "ab", 20, "name");
    expect(state.past).toEqual(["", "a"]);
  });
  it("clears redo on a new edit, but preserves it for unchanged values", () => {
    const undone = historyReducer(edit(initialHistory("a"), "b"), { type: "undo" });
    expect(edit(undone, "a").future).toEqual(["b"]);
    expect(edit(undone, "c").future).toEqual([]);
  });
  it("resets history when a rubric is loaded and bounds undo memory", () => {
    let state = initialHistory("0");
    for (let i = 1; i <= 120; i++) state = edit(state, String(i));
    expect(state.past).toHaveLength(100);
    expect(historyReducer(state, { type: "reset", value: "loaded" })).toEqual(initialHistory("loaded"));
    expect(historyReducer(initialHistory("loaded"), { type: "undo" }).present).toBe("loaded");
  });
  it("restores removed criteria and supports immutable functional updates", () => {
    const original = [{ name: "Skills", subcategories: [{ name: "React", weight: 3 }] }];
    const changed = historyReducer(initialHistory(original), {
      type: "set", time: 0,
      value: previous => previous.map(category => ({ ...category, subcategories: [] })),
    });
    expect(historyReducer(changed, { type: "undo" }).present).toEqual(original);
    expect(original[0].subcategories).toHaveLength(1);
  });
});
