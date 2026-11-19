import { describe, expect, it } from "vitest";
import { limitWords, MAX_DESCRIPTION_WORDS } from "./rubric";

describe("limitWords", () => {
  it("preserves text within the word limit", () => {
    expect(limitWords("A short description.", MAX_DESCRIPTION_WORDS)).toBe("A short description.");
  });

  it("truncates pasted text at the word limit without changing earlier spacing", () => {
    const text = `  ${Array.from({ length: 61 }, (_, index) => `word${index + 1}`).join("  ")}`;
    expect(limitWords(text, MAX_DESCRIPTION_WORDS)).toBe(
      `  ${Array.from({ length: 60 }, (_, index) => `word${index + 1}`).join("  ")}`,
    );
  });

  it("returns empty text for a non-positive limit", () => {
    expect(limitWords("some words", 0)).toBe("");
  });
});
