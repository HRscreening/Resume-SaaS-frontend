import { useRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Rubric } from "@/types";
import { MAX_SUBCATEGORIES } from "@/lib/rubric";
import { useRubricEditor, type RubricEditor } from "./useRubricEditor";

const fixture = (): Rubric => ({
  source: "AI",
  domain: "Engineering",
  seniority_level: "Senior",
  threshold_score: 70,
  categories: [{
    name: "Technical skills",
    subcategories: [{
      name: "Node.js", description: "Experience building APIs.", weight: 3,
      is_non_negotiable: true, is_external_context: true,
    }],
  }],
});

// Exercise real React state transitions without adding a browser test dependency.
// Each step runs on the next render after the previous step's editor action.
function runEditor(
  initial: Rubric | null,
  steps: Array<(editor: RubricEditor) => void>,
  onEdit = vi.fn(),
) {
  let completed = 0;
  function Harness() {
    const editor = useRubricEditor(initial, { onEdit });
    const step = useRef(0);
    if (step.current < steps.length) {
      completed = ++step.current;
      steps[completed - 1](editor);
    }
    return null;
  }
  renderToStaticMarkup(<Harness />);
  expect(completed).toBe(steps.length);
  return onEdit;
}

describe("useRubricEditor", () => {
  it("binds edits to the correct category while preserving metadata and flags", () => {
    const input = fixture();
    input.categories.push({ ...input.categories[0], name: "Experience" });
    const onEdit = runEditor(input, [
      (editor) => {
        expect(editor.dirty).toBe(false);
        expect(editor.historyProps.canUndo).toBe(false);
        editor.getCategoryProps(1).onSubcategoryChange(0, { description: "Evaluate backend experience." });
      },
      (editor) => {
        const saved = editor.validateForSave()!;
        expect(editor.dirty).toBe(true);
        expect(saved.domain).toBe("Engineering");
        expect(saved.source).toBe("AI");
        expect(saved.categories[0]).toEqual(input.categories[0]);
        expect(saved.categories[1].subcategories[0]).toMatchObject({
          description: "Evaluate backend experience.",
          is_non_negotiable: true, is_external_context: true,
        });
        expect(input.categories[1].subcategories[0].description).toBe("Experience building APIs.");
      },
    ]);
    expect(onEdit).toHaveBeenCalledExactlyOnceWith("subcategory");
  });

  it("keeps validation, dirty state, and undo/redo in sync after adding a parameter", () => {
    runEditor(fixture(), [
      (editor) => editor.getCategoryProps(0).onAddSubcategory(),
      (editor) => {
        expect(editor.validationError).toBeNull();
        expect(editor.getCategoryProps(0).showValidationErrors).toBe(false);
        expect(editor.dirty).toBe(true);
        expect(editor.validateForSave()).toBeNull();
      },
      (editor) => {
        expect(editor.validationError).toContain("Screening parameter is required");
        expect(editor.getCategoryProps(0).showValidationErrors).toBe(true);
        editor.getCategoryProps(0).onSubcategoryChange(1, { name: "SQL" });
      },
      (editor) => {
        expect(editor.isValid).toBe(false);
        expect(editor.validationError).toContain("What to evaluate is required");
        editor.getCategoryProps(0).onSubcategoryChange(1, { description: "Evaluate query design." });
      },
      (editor) => {
        expect(editor.isValid).toBe(true);
        editor.historyProps.undo();
      },
      (editor) => {
        expect(editor.validateForSave()).toBeNull();
        editor.historyProps.redo();
      },
      (editor) => {
        expect(editor.isValid).toBe(true);
        editor.getCategoryProps(0).onRemoveSubcategory(1);
      },
      (editor) => {
        expect(editor.dirty).toBe(false);
        expect(editor.categories[0].subcategories).toHaveLength(1);
      },
    ]);
  });

  it("blocks a null description until corrected, including after undo", () => {
    runEditor(fixture(), [
      (editor) => editor.getCategoryProps(0).onSubcategoryChange(0, { description: null } as never),
      (editor) => {
        expect(editor.validateForSave()).toBeNull();
        editor.editorProps(true).onBlurCapture();
        editor.getCategoryProps(0).onSubcategoryChange(0, { description: "Valid description." });
      },
      (editor) => {
        expect(editor.validateForSave()).not.toBeNull();
        editor.historyProps.undo();
      },
      (editor) => {
        expect(editor.isValid).toBe(false);
        expect(editor.validateForSave()).toBeNull();
        editor.historyProps.redo();
      },
      (editor) => {
        expect(editor.isValid).toBe(true);
      },
    ]);
  });

  it("loads asynchronous data and resets the baseline and history for another rubric", () => {
    const replacement = { ...fixture(), domain: "Finance" };
    runEditor(null, [
      (editor) => {
        expect(editor.validateForSave()).toBeNull();
        editor.reset(fixture());
      },
      (editor) => {
        expect(editor.dirty).toBe(false);
        editor.getCategoryProps(0).onRemoveSubcategory(0);
      },
      (editor) => {
        expect(editor.historyProps.canUndo).toBe(true);
        editor.reset(replacement);
      },
      (editor) => {
        expect(editor.rubric?.domain).toBe("Finance");
        expect(editor.dirty).toBe(false);
        expect(editor.historyProps.canUndo).toBe(false);
        expect(editor.historyProps.canRedo).toBe(false);
      },
    ]);
  });

  it("enforces the parameter limit without creating history or analytics events", () => {
    const input = fixture();
    input.categories[0].subcategories = Array.from(
      { length: MAX_SUBCATEGORIES }, () => ({ ...input.categories[0].subcategories[0] }),
    );
    const onEdit = runEditor(input, [
      (editor) => {
        editor.getCategoryProps(0).onAddSubcategory();
        expect(editor.dirty).toBe(false);
        expect(editor.historyProps.canUndo).toBe(false);
      },
    ]);
    expect(onEdit).not.toHaveBeenCalled();
  });
  it("clears submitted errors when loading another rubric", () => {
    const invalid = fixture();
    invalid.categories[0].subcategories[0].description = "";
    runEditor(invalid, [
      (editor) => {
        expect(editor.validationError).toBeNull();
        expect(editor.isValid).toBe(false);
        expect(editor.validateForSave()).toBeNull();
      },
      (editor) => {
        expect(editor.validationError).toContain("What to evaluate is required");
        expect(editor.getCategoryProps(0).showValidationErrors).toBe(true);
        editor.reset(invalid);
      },
      (editor) => {
        expect(editor.validationError).toBeNull();
        expect(editor.getCategoryProps(0).showValidationErrors).toBe(false);
        expect(editor.isValid).toBe(false);
      },
    ]);
  });

});
