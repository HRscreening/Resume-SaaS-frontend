import { useCallback, useState } from "react";
import type { Rubric, RubricCategory, Subcategory } from "@/types";
import { useUndoRedo } from "./useUndoRedo";
import { MAX_SUBCATEGORIES } from "@/lib/rubric";
import { getRubricValidationError } from "@/lib/rubricValidation";

type RubricEditType = "subcategory" | "add" | "remove";

interface RubricEditorOptions {
  onEdit?: (editType: RubricEditType) => void;
}

const EMPTY_CATEGORIES: RubricCategory[] = [];

export function useRubricEditor(
  initialRubric: Rubric | null = null,
  { onEdit }: RubricEditorOptions = {},
) {
  
  const [baseline, setBaseline] = useState(() =>
    initialRubric ? structuredClone(initialRubric) : null,
  );
  const [saveAttempted, setSaveAttempted] = useState(false);
  const history = useUndoRedo<Rubric | null>(baseline);
  const { value: rubric, set, reset: resetHistory } = history;
  const categories = rubric?.categories ?? EMPTY_CATEGORIES;
  const currentValidationError = getRubricValidationError(rubric);
  const validationError = saveAttempted ? currentValidationError : null;
  const dirty = JSON.stringify(rubric) !== JSON.stringify(baseline);

  // Loading a rubric establishes a fresh baseline and clears its edit history.
  // Pages decide when to reset, so background refetches cannot overwrite edits.
  const reset = useCallback((nextRubric: Rubric) => {
    const snapshot = structuredClone(nextRubric);
    setSaveAttempted(false);
    setBaseline(snapshot);
    resetHistory(snapshot);
  }, [resetHistory]);

  function updateCategory(
    categoryIndex: number,
    update: (category: RubricCategory) => RubricCategory,
    group?: string,
  ) {
    set((previous) => previous ? {
      ...previous,
      categories: previous.categories.map((category, index) =>
        index === categoryIndex ? update(category) : category,
      ),
    } : previous, group);
  }

  function updateSubcategory(categoryIndex: number, subIndex: number, updates: Partial<Subcategory>) {
    if (!categories[categoryIndex]?.subcategories[subIndex]) return;
    updateCategory(categoryIndex, (category) => ({
      ...category,
      subcategories: category.subcategories.map((subcategory, index) =>
        index === subIndex ? { ...subcategory, ...updates } : subcategory,
      ),
    }), `subcategory:${categoryIndex}:${subIndex}:${Object.keys(updates).sort().join(",")}`);
    onEdit?.("subcategory");
  }

  function removeSubcategory(categoryIndex: number, subIndex: number) {
    if (!categories[categoryIndex]?.subcategories[subIndex]) return;
    updateCategory(categoryIndex, (category) => ({
      ...category,
      subcategories: category.subcategories.filter((_, index) => index !== subIndex),
    }));
    onEdit?.("remove");
  }

  function addSubcategory(categoryIndex: number) {
    const category = categories[categoryIndex];
    if (!category || category.subcategories.length >= MAX_SUBCATEGORIES) return;
    updateCategory(categoryIndex, (current) =>
      current.subcategories.length >= MAX_SUBCATEGORIES ? current : {
        ...current,
        subcategories: [...current.subcategories, { name: "", weight: 3, description: "" }],
      },
    );
    onEdit?.("add");
  }

  function getCategoryProps(categoryIndex: number) {
    return {
      category: categories[categoryIndex],
      colorIndex: categoryIndex,
      showValidationErrors: saveAttempted,
      onSubcategoryChange: (subIndex: number, updates: Partial<Subcategory>) =>
        updateSubcategory(categoryIndex, subIndex, updates),
      onRemoveSubcategory: (subIndex: number) => removeSubcategory(categoryIndex, subIndex),
      onAddSubcategory: () => addSubcategory(categoryIndex),
    };
  }

  // Reveal errors only after Save; invalid drafts never reach the API.
  function validateForSave(): Rubric | null {
    setSaveAttempted(true);
    return rubric && !getRubricValidationError(rubric) ? rubric : null;
  }

  return {
    rubric,
    categories,
    dirty,
    validationError,
    isValid: rubric !== null && currentValidationError === null,
    reset,
    validateForSave,
    getCategoryProps,
    editorProps: history.editorProps,
    historyProps: {
      undo: history.undo,
      redo: history.redo,
      canUndo: history.canUndo,
      canRedo: history.canRedo,
    },
  };
}

export type RubricEditor = ReturnType<typeof useRubricEditor>;
