"use client";

import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  BarChart,
  AreaChart,
  Line,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const CHART_TYPES = ["LINE", "BAR", "AREA"] as const;
type ChartType = (typeof CHART_TYPES)[number];

const GREEN = "hsl(142 71% 45%)";
const GREEN_SOFT = "hsl(142 45% 45%)";
const GREEN_MUTED = "hsl(142 20% 40%)";

const SERIES_CONFIG = [
  { key: "trainingLoad", name: "Training Load", color: GREEN },
  { key: "messaging", name: "Messaging", color: GREEN_SOFT },
  { key: "bookings", name: "Bookings", color: GREEN_MUTED },
] as const;

type EngagementTrendsChartProps = {
  trainingLoadSeries: number[];
  messagingSeries: number[];
  bookingsSeries: number[];
};

export function EngagementTrendsChart({
  trainingLoadSeries,
  messagingSeries,
  bookingsSeries,
}: EngagementTrendsChartProps) {
  const [chartType, setChartType] = useState<ChartType>("LINE");

  const data = useMemo(() => {
    const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const maxLen = Math.max(
      trainingLoadSeries.length,
      messagingSeries.length,
      bookingsSeries.length,
      7
    );
    return Array.from({ length: maxLen }, (_, i) => ({
      day: dayLabels[i % 7],
      trainingLoad: trainingLoadSeries[i] ?? 0,
      messaging: messagingSeries[i] ?? 0,
      bookings: bookingsSeries[i] ?? 0,
    }));
  }, [trainingLoadSeries, messagingSeries, bookingsSeries]);

  const tooltipStyle = {
    contentStyle: {
      background: "hsl(0 0% 6%)",
      border: "1px solid hsl(142 20% 20%)",
      borderRadius: 0,
      fontSize: 11,
      fontFamily: "monospace",
      textTransform: "uppercase" as const,
      color: "hsl(0 0% 95%)",
    },
    itemStyle: { color: "hsl(0 0% 80%)" },
    labelStyle: {
      fontWeight: 900,
      fontSize: 10,
      letterSpacing: "0.15em",
      color: "hsl(142 71% 45%)",
    },
  };

  const axisStyle = {
    tick: { fontSize: 10, fontFamily: "monospace", fill: "hsl(0 0% 50%)" },
    axisLine: { stroke: "hsl(0 0% 20%)" },
  };

  const gridStyle = {
    strokeDasharray: "2 4",
    stroke: "hsl(0 0% 15%)",
  };

  const renderChart = () => {
    switch (chartType) {
      case "BAR":
        return (
          <BarChart data={data} barCategoryGap="20%">
            <CartesianGrid {...gridStyle} />
            <XAxis dataKey="day" {...axisStyle} />
            <YAxis {...axisStyle} />
            <Tooltip {...tooltipStyle} />
            <Legend
              iconType="square"
              wrapperStyle={{ fontSize: 10, fontFamily: "monospace", textTransform: "uppercase" }}
            />
            {SERIES_CONFIG.map((s) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.name}
                fill={s.color}
                radius={[0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        );
      case "AREA":
        return (
          <AreaChart data={data}>
            <CartesianGrid {...gridStyle} />
            <XAxis dataKey="day" {...axisStyle} />
            <YAxis {...axisStyle} />
            <Tooltip {...tooltipStyle} />
            <Legend
              iconType="square"
              wrapperStyle={{ fontSize: 10, fontFamily: "monospace", textTransform: "uppercase" }}
            />
            {SERIES_CONFIG.map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                fill={s.color}
                fillOpacity={0.15}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        );
      default:
        return (
          <LineChart data={data}>
            <CartesianGrid {...gridStyle} />
            <XAxis dataKey="day" {...axisStyle} />
            <YAxis {...axisStyle} />
            <Tooltip {...tooltipStyle} />
            <Legend
              iconType="square"
              wrapperStyle={{ fontSize: 10, fontFamily: "monospace", textTransform: "uppercase" }}
            />
            {SERIES_CONFIG.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                strokeWidth={2.5}
                dot={{ r: 3, fill: s.color }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        );
    }
  };

  return (
    <div className="rounded-none border border-border bg-card transition duration-200 hover:border-primary">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground leading-none">
            Combined Engagement
          </p>
          <p className="mt-1 text-[9px] font-mono text-muted-foreground uppercase">
            ALL METRICS · 7-DAY OVERLAY
          </p>
        </div>
        <div className="flex gap-0">
          {CHART_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setChartType(type)}
              className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition border ${
                chartType === type
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-transparent text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>
      <div className="p-5">
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
