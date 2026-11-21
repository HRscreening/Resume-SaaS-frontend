import type { RubricCategory, Subcategory } from "@/types";
import { RubricCategoryTable } from "@/components/screening/RubricCategoryTable";

interface RubricCategoryCardProps {
  category: RubricCategory;
  // Index into the category palette (0,1,2) for the accent colour.
  colorIndex: number;
  onWeightChange: (weight: number) => void;
  onSubcategoryChange: (subIdx: number, updates: Partial<Subcategory>) => void;
  onRemoveSubcategory: (subIdx: number) => void;
  onAddSubcategory: () => void;
}

export function RubricCategoryCard({
  category,
  colorIndex,
  onSubcategoryChange,
  onRemoveSubcategory,
  onAddSubcategory,
}: RubricCategoryCardProps) {
  return (
    <RubricCategoryTable
      category={category}
      colorIndex={colorIndex}
      onSubcategoryChange={onSubcategoryChange}
      onRemoveSubcategory={onRemoveSubcategory}
      onAddSubcategory={onAddSubcategory}
    />
  );
}
