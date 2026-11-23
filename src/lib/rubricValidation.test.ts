import { describe, expect, it } from "vitest";
import { getRubricValidationError, rubricValidationSchema } from "./rubricValidation";
import { MAX_DESCRIPTION_WORDS, MAX_SUBCATEGORIES } from "./rubric";

const criterion = { name: "Node.js", description: "Experience building backend APIs.", weight: 3 };
const rubric = (updates: Record<string, unknown> = {}) => ({
  categories: [{ name: "Technical skills", weight: 50, subcategories: [{ ...criterion, ...updates }] }],
  source: "AI",
  threshold_score: 70,
});

describe("rubric validation shared by review and edit", () => {
  it("accepts valid fields with existing rubric metadata and criterion flags", () => {
    expect(getRubricValidationError(rubric({ is_non_negotiable: true, is_external_context: true }))).toBeNull();
  });

  for (const field of ["name", "description"]) {
    it.each([null, undefined, "", "  \t\n  "])("rejects " + field + " containing %j", (value) => {
      const result = rubricValidationSchema.safeParse(rubric({ [field]: value }));
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(["categories", 0, "subcategories", 0, field]);
      }
    });
  }

  it("identifies the category and parameter needing correction", () => {
    const input = rubric();
    input.categories.push({ ...input.categories[0], subcategories: [criterion, { ...criterion, description: "" }] });
    expect(getRubricValidationError(input)).toBe("Category 2, parameter 2: What to evaluate is required.");
  });

  it("clears the error when the description is corrected", () => {
    const input = rubric({ description: "" });
    expect(getRubricValidationError(input)).not.toBeNull();
    input.categories[0].subcategories[0].description = "  Evaluate API design experience.  ";
    expect(getRubricValidationError(input)).toBeNull();
  });

  it.each([null, undefined, 0, 6, 2.5, "3"])("rejects invalid importance %j", (weight) => {
    expect(getRubricValidationError(rubric({ weight }))).toContain("Choose an importance from 1 to 5.");
  });

  it("enforces the existing description word limit", () => {
    expect(getRubricValidationError(rubric({ description: Array(MAX_DESCRIPTION_WORDS).fill("word").join(" ") }))).toBeNull();
    expect(getRubricValidationError(rubric({ description: Array(MAX_DESCRIPTION_WORDS + 1).fill("word").join(" ") }))).toContain("60 words or fewer");
  });

  it("enforces the existing parameter limit", () => {
    const input = rubric();
    input.categories[0].subcategories = Array.from({ length: MAX_SUBCATEGORIES + 1 }, () => ({ ...criterion }));
    expect(getRubricValidationError(input)).toContain("at most 10 parameters");
  });
});
