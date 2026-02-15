"use client";

import { useId, useMemo, useState } from "react";

import { cn } from "../../lib/utils";

type ChartPoint = {
  x: number;
  y: number;
  value: number;
  index: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function buildChartPoints(values: number[]): ChartPoint[] {
  const safeValues = values.length ? values : [0];
  const max = Math.max(...safeValues);
  const min = Math.min(...safeValues);
  const range = Math.max(max - min, 1);
  const denominator = Math.max(safeValues.length - 1, 1);

  return safeValues.map((value, index) => ({
    index,
    value,
    x: (index / denominator) * 100,
    y: 100 - ((value - min) / range) * 100,
  }));
}

function toPolyline(points: ChartPoint[]) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

type SparklineProps = {
  values: number[];
  className?: string;
};

export function Sparkline({ values, className }: SparklineProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const gradientId = useId();
  const points = useMemo(() => buildChartPoints(values), [values]);
  const polylinePoints = useMemo(() => toPolyline(points), [points]);
  const activePoint = activeIndex !== null ? points[activeIndex] : null;
  const areaPath = `M 0 100 L ${polylinePoints} L 100 100 Z`;

  return (
    <div className={cn("relative h-20 w-full", className)}>
      <svg
        viewBox="0 0 100 100"
        className="h-full w-full"
        preserveAspectRatio="none"
        onMouseLeave={() => setActiveIndex(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.26" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradientId})`} />
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={polylinePoints}
        />
        {points.map((point) => (
          <circle
            key={`spark-${point.index}`}
            cx={point.x}
            cy={point.y}
            r={activeIndex === point.index ? 3 : 2}
            className={cn(
              "cursor-pointer fill-current transition-all duration-200",
              activeIndex === point.index ? "opacity-100" : "opacity-45 hover:opacity-80",
            )}
            onMouseEnter={() => setActiveIndex(point.index)}
            onFocus={() => setActiveIndex(point.index)}
            tabIndex={0}
            role="button"
            aria-label={`Point ${point.index + 1}: ${point.value}`}
          />
        ))}
      </svg>
      {activePoint ? (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-md border border-border bg-background/95 px-2 py-1 text-xs font-medium text-foreground shadow-sm"
          style={{
            left: `${clamp(activePoint.x, 6, 94)}%`,
            top: `${clamp(activePoint.y, 8, 94)}%`,
          }}
        >
          {activePoint.value}
        </div>
      ) : null}
    </div>
  );
}

type MiniBarProps = {
  values: number[];
  className?: string;
};

export function MiniBars({ values, className }: MiniBarProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const max = Math.max(...values, 1);
  return (
    <div className={cn("flex h-20 w-full items-end gap-1 sm:gap-2", className)}>
      {values.map((value, index) => (
        <button
          key={`${value}-${index}`}
          type="button"
          className={cn(
            "group relative min-h-2 flex-1 rounded-t-md transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
            activeIndex === index
              ? "bg-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.25)]"
              : "bg-secondary/75 hover:bg-primary/80",
          )}
          style={{ height: `${Math.max((value / max) * 100, 12)}%` }}
          onMouseEnter={() => setActiveIndex(index)}
          onFocus={() => setActiveIndex(index)}
          onMouseLeave={() => setActiveIndex(null)}
          onBlur={() => setActiveIndex(null)}
          aria-label={`Bar ${index + 1}: ${value}`}
        >
          <span className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 rounded-md border border-border bg-background/95 px-2 py-1 text-xs font-medium text-foreground opacity-0 shadow-sm transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
            {value}
          </span>
        </button>
      ))}
    </div>
  );
}

type DonutChartProps = {
  segments: { label: string; value: number; color: string }[];
  className?: string;
  centerLabel?: string;
};

export function DonutChart({ segments, className, centerLabel }: DonutChartProps) {
  const [activeSegmentLabel, setActiveSegmentLabel] = useState<string | null>(null);
  const total = segments.reduce((sum, seg) => sum + seg.value, 0) || 1;
  const radius = 42;
  const strokeWidth = 12.5;

  const polarToCartesian = (angle: number, customRadius = radius) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return {
      x: 50 + customRadius * Math.cos(rad),
      y: 50 + customRadius * Math.sin(rad),
    };
  };

  const describeArc = (start: number, end: number) => {
    const startPos = polarToCartesian(end);
    const endPos = polarToCartesian(start);
    const largeArcFlag = end - start <= 180 ? "0" : "1";
    return [
      `M ${startPos.x} ${startPos.y}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${endPos.x} ${endPos.y}`,
    ].join(" ");
  };

  const segmentArcs = useMemo(() => {
    let startAngle = 0;
    return segments.map((segment) => {
      const angle = (segment.value / total) * 360;
      const endAngle = startAngle + angle;
      const arc = {
        ...segment,
        path: describeArc(startAngle, endAngle),
        percentage: Math.round((segment.value / total) * 100),
        midPoint: polarToCartesian((startAngle + endAngle) / 2, radius + 6),
      };
      startAngle = endAngle;
      return arc;
    });
  }, [segments, total]);

  const activeSegment = activeSegmentLabel
    ? segmentArcs.find((segment) => segment.label === activeSegmentLabel) ?? null
    : null;

  return (
    <div className={cn("relative flex aspect-square w-full max-w-[14rem] items-center justify-center", className)}>
      <svg
        viewBox="0 0 100 100"
        className="h-full w-full"
        onMouseLeave={() => setActiveSegmentLabel(null)}
      >
        <circle cx="50" cy="50" r={radius} fill="none" stroke="hsl(var(--secondary))" strokeWidth={strokeWidth - 4} />
        {segmentArcs.map((segment) => (
          <path
            key={segment.label}
            d={segment.path}
            fill="none"
            stroke={segment.color}
            strokeWidth={activeSegmentLabel === segment.label ? strokeWidth + 2 : strokeWidth}
            strokeLinecap="round"
            className="cursor-pointer transition-all duration-300 ease-out"
            opacity={activeSegmentLabel === null || activeSegmentLabel === segment.label ? 1 : 0.48}
            onMouseEnter={() => setActiveSegmentLabel(segment.label)}
            onFocus={() => setActiveSegmentLabel(segment.label)}
            tabIndex={0}
            role="button"
            aria-label={`${segment.label}: ${segment.value} (${segment.percentage}%)`}
          />
        ))}
      </svg>
      {centerLabel ? (
        <div className="pointer-events-none absolute text-center">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Total
          </p>
          <p className="text-xl font-semibold text-foreground">{centerLabel}</p>
        </div>
      ) : null}
      {activeSegment ? (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-md border border-border bg-background/95 px-2 py-1 text-xs font-medium text-foreground shadow-sm"
          style={{ left: `${activeSegment.midPoint.x}%`, top: `${activeSegment.midPoint.y}%` }}
        >
          {activeSegment.label}: {activeSegment.percentage}%
        </div>
      ) : null}
    </div>
  );
}

type StackedBarProps = {
  stacks: { label: string; segments: { value: number; color: string }[] }[];
  className?: string;
};

export function StackedBars({ stacks, className }: StackedBarProps) {
  const [activeSegment, setActiveSegment] = useState<string | null>(null);

  return (
    <div className={cn("space-y-4", className)}>
      {stacks.map((stack) => {
        const total = stack.segments.reduce((sum, seg) => sum + seg.value, 0) || 1;
        const hovered = stack.segments.find((_, index) => activeSegment === `${stack.label}-${index}`);
        return (
          <div key={stack.label} className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{stack.label}</span>
              <span>{hovered ? hovered.value : total}</span>
            </div>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-secondary/40">
              {stack.segments.map((segment, index) => (
                <button
                  key={`${stack.label}-${index}`}
                  type="button"
                  className={cn(
                    "h-full min-w-1 transition-[filter,transform] duration-200 ease-out focus-visible:z-10 focus-visible:outline-none",
                    activeSegment === null || activeSegment === `${stack.label}-${index}`
                      ? "brightness-100"
                      : "brightness-75",
                    activeSegment === `${stack.label}-${index}` ? "scale-y-110" : "hover:brightness-110",
                  )}
                  style={{ width: `${(segment.value / total) * 100}%`, backgroundColor: segment.color }}
                  onMouseEnter={() => setActiveSegment(`${stack.label}-${index}`)}
                  onFocus={() => setActiveSegment(`${stack.label}-${index}`)}
                  onMouseLeave={() => setActiveSegment(null)}
                  onBlur={() => setActiveSegment(null)}
                  aria-label={`${stack.label} segment ${index + 1}: ${segment.value}`}
                />
              ))}
            </div>
            {hovered ? (
              <p className="text-[11px] text-muted-foreground">
                Segment value: {hovered.value} ({Math.round((hovered.value / total) * 100)}%)
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

type LineChartProps = {
  values: number[];
  className?: string;
  labels?: string[];
};

export function LineChart({ values, className, labels }: LineChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const gradientId = useId();
  const points = useMemo(() => buildChartPoints(values), [values]);
  const polylinePoints = useMemo(() => toPolyline(points), [points]);
  const activePoint = activeIndex !== null ? points[activeIndex] : null;
  const areaPath = `M 0 100 L ${polylinePoints} L 100 100 Z`;

  return (
    <div className={cn("relative space-y-3", className)}>
      <svg
        viewBox="0 0 100 100"
        className="h-52 w-full"
        preserveAspectRatio="none"
        onMouseLeave={() => setActiveIndex(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.22" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradientId})`} />
        {[0, 25, 50, 75, 100].map((y) => (
          <line
            key={y}
            x1="0"
            y1={y}
            x2="100"
            y2={y}
            stroke="hsl(var(--border))"
            strokeWidth="0.55"
          />
        ))}
        <polyline
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="3.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={polylinePoints}
        />
        {points.map((point) => (
          <circle
            key={`line-${point.index}`}
            cx={point.x}
            cy={point.y}
            r={activeIndex === point.index ? 2.8 : 1.8}
            className={cn(
              "cursor-pointer fill-primary transition-all duration-200",
              activeIndex === point.index ? "opacity-100" : "opacity-60 hover:opacity-90",
            )}
            onMouseEnter={() => setActiveIndex(point.index)}
            onFocus={() => setActiveIndex(point.index)}
            tabIndex={0}
            role="button"
            aria-label={`Trend point ${point.index + 1}: ${point.value}`}
          />
        ))}
      </svg>
      {activePoint ? (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-md border border-border bg-background/95 px-2 py-1 text-xs font-medium text-foreground shadow-sm"
          style={{
            left: `${clamp(activePoint.x, 6, 94)}%`,
            top: `${clamp(activePoint.y, 8, 94)}%`,
          }}
        >
          {activePoint.value}
        </div>
      ) : null}
      {labels ? (
        <div className="grid grid-cols-6 gap-2 text-[11px] text-muted-foreground sm:flex sm:justify-between">
          {labels.map((label, index) => (
            <span key={`${label}-${index}`} className="truncate">
              {label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
