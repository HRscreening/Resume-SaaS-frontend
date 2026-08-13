import { useEffect, useRef, useState } from "react";
import { Slider as SliderPrimitive } from "radix-ui";
import type { RangeFilter } from "@/types";

interface RangeRowProps {
  label: string;
  value: RangeFilter | undefined;
  min: number;
  max: number;
  step?: number;
  onChange: (next: RangeFilter | undefined) => void;
  onRemove?: () => void;
}

const DEBOUNCE_MS = 300;

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function roundToStep(n: number, step: number) {
  const decimals = step.toString().split(".")[1]?.length ?? 0;
  return Number(n?.toFixed(decimals));
}

export function RangeRow({ label, value, min, max, step = 1, onChange, onRemove }: RangeRowProps) {
  const lo = value?.min ?? min;
  const hi = value?.max ?? max;

  // Local state drives the slider for snappy interaction; the parent only
  // hears about the change after the user stops dragging for DEBOUNCE_MS.
  const [local, setLocal] = useState<[number, number]>([lo, hi]);
  const draggingRef = useRef(false);

  // Sync from parent when not actively dragging (e.g. external clear).
  useEffect(() => {
    if (!draggingRef.current) setLocal([lo, hi]);
  }, [lo, hi]);

  useEffect(() => {
    if (local[0] === lo && local[1] === hi) return;
    const t = setTimeout(() => {
      const [a, b] = local;
      const atMin = a <= min;
      const atMax = b >= max;
      if (atMin && atMax) {
        onChange(undefined);
        return;
      }
      onChange({
        min: atMin ? undefined : a,
        max: atMax ? undefined : b,
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  const display = (n: number) => roundToStep(clamp(n, min, max), step);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-[#404040] truncate" title={label}>
          {label}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs tabular-nums text-[#0F0F0F] font-medium">
            {display(local[0])} – {display(local[1])}
          </span>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Remove ${label} filter`}
              className="h-6 w-6 rounded-md text-[#A0A0A0] hover:text-red-600 hover:bg-red-50 flex items-center justify-center"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 2l6 6M8 2l-6 6"/></svg>
            </button>
          )}
        </div>
      </div>
      <SliderPrimitive.Root
        className="relative flex items-center w-full h-5 select-none touch-none"
        value={local}
        min={min}
        max={max}
        step={step}
        minStepsBetweenThumbs={1}
        onValueChange={(v) => {
          draggingRef.current = true;
          setLocal([v[0], v[1]] as [number, number]);
        }}
        onValueCommit={() => {
          draggingRef.current = false;
        }}
        aria-label={label}
      >
        <SliderPrimitive.Track className="relative h-1.5 grow rounded-full bg-[#E8E5DF]">
          <SliderPrimitive.Range className="absolute h-full rounded-full bg-[#0F0F0F]" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full bg-white border-2 border-[#0F0F0F] shadow-sm hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[#0F0F0F]/30 transition-transform" />
        <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full bg-white border-2 border-[#0F0F0F] shadow-sm hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[#0F0F0F]/30 transition-transform" />
      </SliderPrimitive.Root>
      <div className="flex justify-between text-[10px] text-[#A0A0A0] tabular-nums">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
