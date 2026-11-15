import type { TooltipRenderProps } from "react-joyride";

export function GuideTooltip({
  backProps,
  closeProps,
  index,
  isLastStep,
  primaryProps,
  size,
  step,
  tooltipProps,
}: TooltipRenderProps) {
  return (
    <section
      {...tooltipProps}
      aria-describedby="hire-guide-description"
      aria-labelledby="hire-guide-title"
      className="hire-guide-tooltip"
    >
      <header className="hire-guide-header">
        <span className="hire-guide-count">
          {String(index + 1).padStart(2, "0")} / {String(size).padStart(2, "0")}
        </span>
        <button
          {...closeProps}
          aria-label="Cancel guide"
          className="hire-guide-close"
          type="button"
        >
          <svg aria-hidden="true" viewBox="0 0 20 20">
            <path d="m5 5 10 10M15 5 5 15" />
          </svg>
        </button>
      </header>

      <h2 className="hire-guide-title" id="hire-guide-title">
        {step.title || "Guide"}
      </h2>
      <div className="hire-guide-description" id="hire-guide-description">
        {step.content}
      </div>

      <footer className="hire-guide-footer">
        <div className="hire-guide-actions">
          {index > 0 && (
            <button
              {...backProps}
              className="hire-guide-back"
              type="button"
            >
              Back
            </button>
          )}
          <button
            {...primaryProps}
            className="hire-guide-next"
            type="button"
          >
            {isLastStep ? "Finish" : "Next"}
            <svg aria-hidden="true" viewBox="0 0 20 20">
              <path d="M4 10h11m-4-4 4 4-4 4" />
            </svg>
          </button>
        </div>
      </footer>
    </section>
  );
}
