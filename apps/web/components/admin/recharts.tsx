"use client";

import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const GREEN = "hsl(142 71% 45%)";

export function RechartSparkline({ values }: { values: number[] }) {
  const data = values.map((value, index) => ({ index, value }));
  return (
    <div className="h-20 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="index" hide />
          <YAxis hide domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{
              background: "hsl(0 0% 100%)",
              borderRadius: 12,
              border: "1px solid hsl(142 10% 90%)",
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={GREEN}
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
