import type { ArrowRenderProps } from "react-joyride";

export function GuideArrow({ base, placement, size }: ArrowRenderProps) {
  const side = placement.split("-")[0];
  const isVertical = side === "top" || side === "bottom";
  const width = isVertical ? base : size;
  const height = isVertical ? size : base;
  const center = base / 2;

  const path =
    side === "bottom"
      ? `M ${center} 0 C ${center + 5} 6, ${center - 5} ${size - 6}, ${center} ${size}`
      : side === "top"
        ? `M ${center} ${size} C ${center + 5} ${size - 6}, ${center - 5} 6, ${center} 0`
        : side === "right"
          ? `M 0 ${center} C 6 ${center + 5}, ${size - 6} ${center - 5}, ${size} ${center}`
          : `M ${size} ${center} C ${size - 6} ${center + 5}, 6 ${center - 5}, 0 ${center}`;

  return (
    <svg
      aria-hidden="true"
      className="hire-guide-connector"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
    >
      <path d={path} />
    </svg>
  );
}
