import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { RubricCategory } from "@/types";
import { RubricCategoryTable } from "./RubricCategoryTable";

describe("rubric validation feedback", () => {
  it.each([false, true])("renders null fields safely with save attempted = %s", (showValidationErrors) => {
    const category = {
      name: "Technical skills",
      subcategories: [{ name: null, description: null, weight: 3 }],
    } as unknown as RubricCategory;
    const html = renderToStaticMarkup(
      <RubricCategoryTable category={category} colorIndex={0}
        showValidationErrors={showValidationErrors}
        onSubcategoryChange={() => {}} onRemoveSubcategory={() => {}} onAddSubcategory={() => {}} />,
    );
    expect(html.includes("Screening parameter is required.")).toBe(showValidationErrors);
    expect(html.includes("What to evaluate is required.")).toBe(showValidationErrors);
    expect(html.match(/aria-invalid="true"/g) ?? []).toHaveLength(showValidationErrors ? 2 : 0);
    expect(html).toContain("0/60 words");
  });
});
