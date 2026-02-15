import { cn } from "../../lib/utils";

type SparklineProps = {
  values: number[];
  className?: string;
};

export function Sparkline({ values, className }: SparklineProps) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(max - min, 1);
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("h-12 w-full", className)}
      preserveAspectRatio="none"
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

type MiniBarProps = {
  values: number[];
  className?: string;
};

export function MiniBars({ values, className }: MiniBarProps) {
  const max = Math.max(...values, 1);
  return (
    <div className={cn("flex h-14 items-end gap-2", className)}>
      {values.map((value, index) => (
        <div
          key={`${value}-${index}`}
          className="w-3 rounded-full bg-secondary/60"
          style={{ height: `${(value / max) * 100}%` }}
        />
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
  const total = segments.reduce((sum, seg) => sum + seg.value, 0) || 1;
  let startAngle = 0;
  const radius = 42;
  const strokeWidth = 12;

  const polarToCartesian = (angle: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return {
      x: 50 + radius * Math.cos(rad),
      y: 50 + radius * Math.sin(rad),
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

  return (
    <div className={cn("relative flex h-40 w-40 items-center justify-center", className)}>
      <svg viewBox="0 0 100 100" className="h-full w-full">
        {segments.map((segment) => {
          const angle = (segment.value / total) * 360;
          const path = describeArc(startAngle, startAngle + angle);
          startAngle += angle;
          return (
            <path
              key={segment.label}
              d={path}
              fill="none"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      {centerLabel ? (
        <div className="absolute text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Total
          </p>
          <p className="text-xl font-semibold text-foreground">{centerLabel}</p>
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
  return (
    <div className={cn("space-y-4", className)}>
      {stacks.map((stack) => {
        const total = stack.segments.reduce((sum, seg) => sum + seg.value, 0) || 1;
        return (
          <div key={stack.label} className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{stack.label}</span>
              <span>{total}</span>
            </div>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-secondary/40">
              {stack.segments.map((segment, index) => (
                <div
                  key={`${stack.label}-${index}`}
                  className="h-full"
                  style={{ width: `${(segment.value / total) * 100}%`, backgroundColor: segment.color }}
                />
              ))}
            </div>
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
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const range = Math.max(max - min, 1);
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className={cn("space-y-2", className)}>
      <svg viewBox="0 0 100 100" className="h-40 w-full" preserveAspectRatio="none">
        <polyline
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        {[0, 25, 50, 75, 100].map((y) => (
          <line
            key={y}
            x1="0"
            y1={y}
            x2="100"
            y2={y}
            stroke="hsl(var(--border))"
            strokeWidth="0.5"
          />
        ))}
      </svg>
      {labels ? (
        <div className="flex justify-between text-xs text-muted-foreground">
          {labels.map((label, index) => (
            <span key={`${label}-${index}`}>{label}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
