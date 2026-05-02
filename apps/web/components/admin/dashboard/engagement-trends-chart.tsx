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
import { Badge } from "../../ui/badge";

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

type MetricData = {
  title: string;
  value: string;
  change: string;
  series: number[];
};

type EngagementTrendsChartProps = {
  metrics: MetricData[];
};

export function EngagementTrendsChart({ metrics }: EngagementTrendsChartProps) {
  const [chartType, setChartType] = useState<ChartType>("LINE");
  const [selectedMetric, setSelectedMetric] = useState<string>("ALL");

  const trainingLoadSeries = metrics[0]?.series ?? [];
  const messagingSeries = metrics[1]?.series ?? [];
  const bookingsSeries = metrics[2]?.series ?? [];

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
      background: "hsl(var(--card))",
      border: "1px solid hsl(var(--border))",
      borderRadius: 12,
      fontSize: 12,
      color: "hsl(var(--foreground))",
      boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
    },
    itemStyle: { color: "hsl(var(--muted-foreground))" },
    labelStyle: {
      fontWeight: 600,
      fontSize: 11,
      color: "hsl(var(--primary))",
    },
  };

  const axisStyle = {
    tick: { fontSize: 11, fill: "hsl(var(--muted-foreground))" },
    axisLine: { stroke: "hsl(var(--border))" },
    tickLine: false as const,
  };

  const gridStyle = {
    strokeDasharray: "3 6",
    stroke: "hsl(var(--border))",
    opacity: 0.5,
  };

  const activeSeries =
    selectedMetric === "ALL"
      ? SERIES_CONFIG
      : SERIES_CONFIG.filter((s) => s.key === selectedMetric);

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
            {activeSeries.map((s) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.name}
                fill={s.color}
                radius={[4, 4, 0, 0]}
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
            {activeSeries.map((s) => (
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
            {activeSeries.map((s) => (
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
    <div className="rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 flex flex-col md:flex-row overflow-hidden">
      {/* Left Sidebar / Tabs */}
      <div className="flex w-full flex-col border-b border-border md:w-[280px] md:shrink-0 md:border-b-0 md:border-r bg-gradient-to-b from-secondary/10 to-transparent">
        <button
          onClick={() => setSelectedMetric("ALL")}
          className={`flex flex-col items-start gap-1 p-5 text-left transition ${
            selectedMetric === "ALL"
              ? "bg-primary/10 border-l-2 border-primary"
              : "border-l-2 border-transparent hover:bg-secondary/40"
          }`}
        >
          <div className="flex w-full items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground leading-none">
              Combined
            </span>
            {selectedMetric === "ALL" && (
              <Badge variant="outline" className="border-primary/30 text-primary text-[9px] font-medium">
                All
              </Badge>
            )}
          </div>
          <span className="mt-2 text-xl font-black font-mono tracking-tighter text-foreground">
            Overview
          </span>
          <span className="mt-1 text-[9px] font-mono text-muted-foreground uppercase">
            7-Day Overlay
          </span>
        </button>

        {metrics.map((metric, i) => {
          const key = SERIES_CONFIG[i % SERIES_CONFIG.length]?.key ?? "unknown";
          const isSelected = selectedMetric === key;
          return (
            <button
              key={key}
              onClick={() => setSelectedMetric(key)}
              className={`flex flex-col items-start gap-1 p-5 text-left transition border-t border-border ${
                isSelected
                  ? "bg-primary/10 border-l-2 border-l-primary"
                  : "border-l-2 border-l-transparent hover:bg-secondary/40"
              }`}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground leading-none line-clamp-1">
                  {metric.title}
                </span>
                {isSelected && (
                  <Badge variant="outline" className="border-primary/30 text-primary text-[9px] font-medium shrink-0">
                    Live
                  </Badge>
                )}
              </div>
              <span className="mt-2 text-3xl font-black font-mono tracking-tighter text-foreground">
                {metric.value}
              </span>
              <span className="mt-1 text-[9px] font-mono text-muted-foreground uppercase">
                {metric.change}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Chart Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground leading-none">
              {selectedMetric === "ALL" ? "Combined Engagement" : SERIES_CONFIG.find(s => s.key === selectedMetric)?.name ?? "Metric"}
            </p>
            <p className="mt-1 text-[9px] font-mono text-muted-foreground uppercase">
              {selectedMetric === "ALL" ? "ALL METRICS · " : ""}7-DAY TREND
            </p>
          </div>
          <div className="flex gap-1 shrink-0 rounded-lg bg-secondary/40 p-1">
            {CHART_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setChartType(type)}
                aria-label={`${type} chart`}
                className={`rounded-md px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition-all ${
                  chartType === type
                    ? "bg-primary/15 text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
        <div className="p-5 flex-1 min-h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
