import { useEffect } from "react";
import type { Rubric } from "@/types";
import type { RubricEditor } from "@/hooks/useRubricEditor";
import { RubricCategoryTable } from "@/components/screening/RubricCategoryTable";
import { useGuide } from "@/guides"


interface RubricReviewStepProps {
  rubric: Rubric;
  getCategoryProps: RubricEditor["getCategoryProps"];
}

// Step 2 of the new-job wizard: review and tweak the AI-generated rubric, then
// save the job.
export function RubricReviewStep({
  rubric,
  getCategoryProps,
}: RubricReviewStepProps) {

  const guide = useGuide()

  useEffect(() => {
    guide.startGuide("rubric");
  }, [guide.startGuide]);

  return (
    <div className="space-y-3">
      {/* Meta header */}
      <div className="bg-white rounded-2xl border border-[#E8E5DF] p-5">
        <h2 className="text-lg font-semibold text-[#0F0F0F] mb-1">Review rubric</h2>
        <p className="text-sm text-[#737373]">AI-generated from your JD. Adjust anything below — we'll handle the math.</p>
        {rubric.domain && (
          <div className="flex items-center gap-3 mt-3 p-2.5 bg-[#F5F3EE] rounded-lg">
            <span className="text-xs text-[#737373]">Domain: <strong className="text-[#0F0F0F]">{rubric.domain}</strong></span>
            {rubric.seniority_level && (
              <>
                <span className="text-[#D4D4D4]">|</span>
                <span className="text-xs text-[#737373]">Level: <strong className="text-[#0F0F0F]">{rubric.seniority_level}</strong></span>
              </>
            )}
          </div>
        )}
      </div>

      {rubric.categories.map((category, index) => (
        <RubricCategoryTable key={`${category.name}-${index}`} {...getCategoryProps(index)} />
      ))}
    </div>
  );
}
