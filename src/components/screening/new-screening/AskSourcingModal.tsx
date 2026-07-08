import { Button } from "@/components/ui/Button";
import { useState } from "react";

interface SourcingModalProps {
  setAllowSourcing: (val:boolean) => void;
  onSave: () => void;
  onClose: () => void;
}
export function AskSourceJobModal({
  setAllowSourcing,
  onSave,
  onClose,
}: SourcingModalProps) {

  const [isChecked, setIsChecked] = useState<boolean>(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg rounded-2xl border border-[#E8E5DF] bg-white p-6 shadow-2xl animate-in zoom-in-95 fade-in duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-[#1E1E1E]">
            Source this job on multiple platforms?
          </h2>

          <p className="text-sm text-gray-600">
            Publishing this job to multiple platforms can significantly increase
            visibility and help you receive more qualified applications.
          </p>
        </div>

        {/* Terms */}
        <div className="mt-6 rounded-xl border border-[#ECE8E1] bg-[#FAFAF8] p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              onChange={(e) => setIsChecked(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 accent-black"
            />

            <span className="text-sm leading-6 text-gray-700">
              I understand that sourcing may post this job to supported hiring
              platforms. I confirm that the job details are accurate and I have
              permission to advertise this position.
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="mt-8 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={()=>{
              setAllowSourcing(false);
              onClose();
            }}
          >
            Cancel
          </Button>

          <Button onClick={()=>{
            setAllowSourcing(true);
            onSave();
            onClose();

          }}
          disabled={!isChecked}
          >
            Yes, Source Job
          </Button>
        </div>
      </div>
    </div>
  );
}