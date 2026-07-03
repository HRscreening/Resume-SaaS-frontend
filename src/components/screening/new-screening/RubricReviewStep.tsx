import { useState } from "react";
import type { Rubric, Subcategory } from "@/types";
import { RubricCategoryCard } from "./RubricCategoryCard";
import { AskSourceJobModal } from "./AskSourcingModal";


interface RubricReviewStepProps {
  rubric: Rubric;
  onCategoryWeightChange: (catIdx: number, weight: number) => void;
  onSubcategoryChange: (catIdx: number, subIdx: number, updates: Partial<Subcategory>) => void;
  onRemoveSubcategory: (catIdx: number, subIdx: number) => void;
  onAddSubcategory: (catIdx: number) => void;
  onBack: () => void;
  onSave: () => void;
  saving: boolean;
  
  allowSourcing: boolean | null;
  setAllowSourcing: (val:boolean) => void;
}

// Step 2 of the new-job wizard: review and tweak the AI-generated rubric, then
// save the job.
export function RubricReviewStep({
  rubric,
  onCategoryWeightChange,
  onSubcategoryChange,
  onRemoveSubcategory,
  onAddSubcategory,
  onBack,
  onSave,
  saving,
  allowSourcing,
  setAllowSourcing
}: RubricReviewStepProps) {

  const [showSourcingModal, setShowSourcingModal] = useState(false);
 

  const handleSave = () =>{
    if(allowSourcing === null){
      setShowSourcingModal(true);
    }
    else {
      onSave();
    }
  }

  return (
    <div className="space-y-4">
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

      {/* Category cards */}
      {rubric.categories.map((cat, catIdx) => (
        <RubricCategoryCard
          key={cat.name}
          category={cat}
          colorIndex={catIdx}
          onWeightChange={(weight) => onCategoryWeightChange(catIdx, weight)}
          onSubcategoryChange={(subIdx, updates) => onSubcategoryChange(catIdx, subIdx, updates)}
          onRemoveSubcategory={(subIdx) => onRemoveSubcategory(catIdx, subIdx)}
          onAddSubcategory={() => onAddSubcategory(catIdx)}
        />
      ))}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          className="h-10 px-4 border border-[#D4D4D4] text-sm font-medium text-[#404040] rounded-xl hover:bg-[#F5F3EE] transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 h-10 bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#1C1C1C] disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
        >
          {saving && <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
          {saving ? "Saving job..." : "Save job"}
        </button>
      </div>

      {showSourcingModal &&
        <AskSourceJobModal
          setAllowSourcing={setAllowSourcing}
          onSave={onSave}
          onClose={() => setShowSourcingModal(false)}
        />
      }
    </div>
  );
}
