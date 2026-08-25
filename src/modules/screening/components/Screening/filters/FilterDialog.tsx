import { useEffect, useRef, useState } from "react";
import type { RubricCategory } from "@/types";
import type {
  ScreeningSearchParams,
  RangeFilter,
} from "@/modules/screening/types/searchSchema";

import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { ChevronDown } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

interface FilterDialogProps {
  state: ScreeningSearchParams;
  categories: RubricCategory[];
  onOverallChange: (range: RangeFilter | undefined) => void;
  onCategoryChange: (
    name: string,
    range: RangeFilter | undefined
  ) => void;
}

interface DebouncedRangeSliderProps {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
}

const DEBOUNCE_MS = 750;

// function DebouncedRangeSlider({
//   min,
//   max,
//   step = 1,
//   value,
//   onChange,
// }: DebouncedRangeSliderProps) {
//   const [localValue, setLocalValue] =
//     useState<[number, number]>(value);

//   const debouncedValue = useDebouncedValue(
//     localValue,
//     DEBOUNCE_MS
//   );

//   const isFirstRender = useRef(true);

//   /*
//    * Keep local slider state synchronized with
//    * the URL/search state.
//    */
//   useEffect(() => {
//     setLocalValue(value);
//   }, [value[0], value[1]]);

//   /*
//    * Only update URL/search state after the user
//    * has stopped dragging for DEBOUNCE_MS.
//    */
//   useEffect(() => {
//     if (isFirstRender.current) {
//       isFirstRender.current = false;
//       return;
//     }

//     if (
//       debouncedValue[0] === value[0] &&
//       debouncedValue[1] === value[1]
//     ) {
//       return;
//     }

//     onChange(debouncedValue);
//   }, [
//     debouncedValue,
//     value,
//     onChange,
//   ]);

//   return (
//     <Slider
//       min={min}
//       max={max}
//       step={step}
//       value={localValue}
//       onValueChange={(next) => {
//         setLocalValue([
//           next[0],
//           next[1],
//         ]);
//       }}
//     />
//   );
// }


function DebouncedRangeSlider({
  min,
  max,
  step = 1,
  value,
  onChange,
}: DebouncedRangeSliderProps) {
  const [localValue, setLocalValue] =
    useState<[number, number]>(value);

  const debouncedValue = useDebouncedValue(
    localValue,
    DEBOUNCE_MS
  );

  const isFirstRender = useRef(true);
  const isDragging = useRef(false);

  /*
   * Sync local state when the parent value changes
   * externally, but don't fight the slider while
   * the user is interacting with it.
   */
  useEffect(() => {
    if (isDragging.current) {
      return;
    }

    setLocalValue(value);
  }, [value[0], value[1]]);

  /*
   * Debounced update to the parent/search state.
   */
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (
      debouncedValue[0] === value[0] &&
      debouncedValue[1] === value[1]
    ) {
      return;
    }

    onChange(debouncedValue);
  }, [debouncedValue, value, onChange]);

  return (
    <Slider
      min={min}
      max={max}
      step={step}
      value={localValue}
      onPointerDown={() => {
        isDragging.current = true;
      }}
      onPointerUp={() => {
        isDragging.current = false;
      }}
      onValueChange={(next) => {
        setLocalValue([next[0], next[1]]);
      }}
    />
  );
}

export function FilterDialog({
  state,
  categories,
  onOverallChange,
  onCategoryChange,
}: FilterDialogProps) {
  const [open, setOpen] = useState(false);

  const activeCount =
    (
      state.screenOverallScore?.min !== undefined ||
      state.screenOverallScore?.max !== undefined
        ? 1
        : 0
    ) +
    Object.keys(
      state.screenCategoryScores ?? {}
    ).length;

  const isActive = activeCount > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className={`
            h-9 px-3
            rounded-lg
            cursor-pointer
            text-sm font-medium
            flex items-center gap-2
            whitespace-nowrap
            outline-none
            ${
              isActive
                ? "text-[#8A6D46] bg-[#FBF1E4] border border-[#F0D9B5]"
                : "text-[#404040]"
            }
          `}
        >
          <span
            className={
              isActive
                ? "text-[#C17A3D]"
                : "text-[#737373]"
            }
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 3h10M3.5 7h7M5 11h4" />
            </svg>
          </span>

          <span>Score</span>

          {activeCount > 0 && (
            <span
              className="
                flex items-center justify-center
                h-4 min-w-4 px-1
                rounded-full
                text-[10px] font-semibold
                bg-[#8A6D46] text-white
              "
            >
              {activeCount}
            </span>
          )}

          <ChevronDown
            size={14}
            className={`
              transition-transform duration-200 ease-out
              ${
                isActive
                  ? "text-[#8A6D46]"
                  : "text-[#A3A3A3]"
              }
              ${open ? "rotate-180" : "rotate-0"}
            `}
          />
        </button>
      </DialogTrigger>

      <DialogContent
        className="
          w-120
          max-w-[calc(100vw-2rem)]
          p-0
          gap-0
          overflow-hidden
          rounded-2xl
          border-[#E8E5DF]
        "
      >
        <DialogHeader
          className="
            flex-row
            items-center
            gap-2
            px-4
            py-3
            border-b
            border-[#E8E5DF]
            bg-[#F5F3EE]
            space-y-0
          "
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="#404040"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 3h10M3.5 7h7M5 11h4" />
          </svg>

          <DialogTitle className="text-sm font-semibold text-[#0F0F0F]">
            Score filters
          </DialogTitle>

          {activeCount > 0 && (
            <span
              className="
                text-[10px]
                font-semibold
                rounded-full
                px-1.5
                py-0.5
                bg-[#0F0F0F]
                text-white
              "
            >
              {activeCount}
            </span>
          )}
        </DialogHeader>

        <div className="px-4 py-4 space-y-4">

          {/* Overall */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p
                className="
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-wide
                  text-[#A0A0A0]
                "
              >
                Overall (0–100)
              </p>

              <span className="text-[11px] text-[#737373]">
                {state.screenOverallScore?.min ?? 0}
                {" – "}
                {state.screenOverallScore?.max ?? 100}
              </span>
            </div>

            <DebouncedRangeSlider
              min={0}
              max={100}
              step={1}
              value={[
                state.screenOverallScore?.min ?? 0,
                state.screenOverallScore?.max ?? 100,
              ]}
              onChange={(value) => {
                onOverallChange({
                  min: value[0],
                  max: value[1],
                });
              }}
            />
          </div>

          {/* Categories */}
          {categories.length > 0 && (
            <div className="space-y-3">
              <p
                className="
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-wide
                  text-[#A0A0A0]
                "
              >
                Rubric categories (0–10)
              </p>

              <div className="space-y-3">
                {categories.map((cat) => {
                  const range =
                    state.screenCategoryScores?.[cat.name];

                  return (
                    <div
                      key={cat.name}
                      className="space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className="
                            text-xs
                            font-medium
                            text-[#404040]
                            truncate
                          "
                          title={cat.name}
                        >
                          {cat.name}
                        </span>

                        <span
                          className="
                            text-[11px]
                            text-[#A3A3A3]
                            shrink-0
                          "
                        >
                          {range?.min ?? 0}
                          {" – "}
                          {range?.max ?? 10}
                        </span>
                      </div>

                      <DebouncedRangeSlider
                        min={0}
                        max={10}
                        step={0.1}
                        value={[
                          range?.min ?? 0,
                          range?.max ?? 10,
                        ]}
                        onChange={(value) => {
                          onCategoryChange(cat.name, {
                            min: value[0],
                            max: value[1],
                          });
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}