interface StepIndicatorProps {
  // 1-based index of the active step.
  current: number;
  // Ordered step labels. The component derives count + numbering from this.
  steps: readonly string[];
}

// Numbered wizard progress header. Completed steps show a check, the active
// step is dark, future steps are muted.
export function StepIndicator({ current, steps }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((label, i) => {
        const stepNum = i + 1;
        const done = current > stepNum;
        const active = current === stepNum;
        return (
          <div key={label} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  done
                    ? "bg-green-600 text-white"
                    : active
                    ? "bg-[#0F0F0F] text-white"
                    : "bg-[#E8E5DF] text-[#737373]"
                }`}
              >
                {done ? "✓" : stepNum}
              </div>
              <span className={`text-sm font-medium ${active ? "text-[#0F0F0F]" : "text-[#737373]"}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && <div className="w-12 h-px bg-[#D4D4D4] mx-3" />}
          </div>
        );
      })}
    </div>
  );
}
