import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RubricToolbar } from "./RubricToolbar";

describe("rubric save action", () => {
  it.each([null, "What to evaluate is required."])("allows a save attempt with feedback %j", (validationError) => {
    const html = renderToStaticMarkup(
      <RubricToolbar canUndo={false} canRedo={false} undo={() => {}} redo={() => {}}
        onBack={() => {}} onSave={() => {}} canSave saving={false}
        validationError={validationError} status="Unsaved changes." />,
    );
    const saveButton = html.match(/<button[^>]*aria-label="Save rubric"[^>]*>/)?.[0];
    expect(saveButton).toBeDefined();
    expect(saveButton).not.toMatch(/\sdisabled(?:=|\s|>)/);
  });
});
