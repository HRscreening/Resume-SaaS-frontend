import { z } from "zod";
import { MAX_DESCRIPTION_WORDS, MAX_SUBCATEGORIES } from "./rubric";

const requiredText = (message: string) =>
  z.string({ error: message }).trim().min(1, message);

export const rubricCriterionSchema = z.object({
  name: requiredText("Screening parameter is required."),
  description: requiredText("What to evaluate is required.").refine(
    (value) => (value.match(/\S+/g) ?? []).length <= MAX_DESCRIPTION_WORDS,
    `What to evaluate must be ${MAX_DESCRIPTION_WORDS} words or fewer.`,
  ),
  weight: z.number({ error: "Choose an importance from 1 to 5." })
    .int("Choose an importance from 1 to 5.")
    .min(1, "Choose an importance from 1 to 5.")
    .max(5, "Choose an importance from 1 to 5."),
});

// Validate editable fields only. Save the original rubric so metadata and
// criterion flags are preserved instead of being stripped by Zod.
export const rubricValidationSchema = z.object({
  categories: z.array(z.object({
    subcategories: z.array(rubricCriterionSchema).max(
      MAX_SUBCATEGORIES,
      `Each category can have at most ${MAX_SUBCATEGORIES} parameters.`,
    ),
  })),
});

export function getRubricValidationError(rubric: unknown): string | null {
  const result = rubricValidationSchema.safeParse(rubric);
  if (result.success) return null;
  const issue = result.error.issues[0];
  const categoryIndex = issue.path[1];
  const criterionIndex = issue.path[3];
  if (typeof categoryIndex === "number" && typeof criterionIndex === "number") {
    return `Category ${categoryIndex + 1}, parameter ${criterionIndex + 1}: ${issue.message}`;
  }
  return typeof categoryIndex === "number"
    ? `Category ${categoryIndex + 1}: ${issue.message}`
    : "Check the rubric before saving.";
}
