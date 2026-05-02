"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { UserRow } from "./users-table";

function UserAvatar({
  name,
  profilePicture,
}: {
  name: string;
  profilePicture?: string | null;
}) {
  if (profilePicture) {
    return (
      <img
        src={profilePicture}
        alt={name}
        className="h-8 w-8 shrink-0 rounded-full object-cover"
      />
    );
  }
  const initials = name
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-[11px] font-medium text-zinc-300">
      {initials}
    </div>
  );
}

function buildMonthlyChartData(users: UserRow[]): { month: string; users: number }[] {
  const now = new Date();
  const months: { month: string; users: number }[] = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString("en-US", { month: "short" });
    const cutoff = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const count = users.filter((u) => {
      if (!u.joined || u.joined === "-") return false;
      const parsed = new Date(u.joined);
      return !isNaN(parsed.getTime()) && parsed < cutoff;
    }).length;
    months.push({ month: label, users: count });
  }

  return months;
}

export function UsersSidebar({
  totalUsers,
  users,
}: {
  totalUsers: number;
  users: UserRow[];
}) {
  const chartData = useMemo(() => buildMonthlyChartData(users), [users]);

  const maxY = useMemo(() => {
    const max = Math.max(...chartData.map((d) => d.users), 1);
    return Math.ceil(max / 50) * 50 || 50;
  }, [chartData]);

  const topUsers = useMemo(() => {
    return [...users]
      .filter((u) => u.status === "Active" && (u.progress ?? 0) > 0)
      .sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0))
      .slice(0, 5);
  }, [users]);

  return (
    <div className="hidden space-y-4 xl:block" style={{ width: 280 }}>
      {/* Users Growth Chart */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Users</h3>
          <span className="text-lg font-bold text-foreground">
            {totalUsers}
          </span>
        </div>
        <div className="h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#84cc16" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#84cc16" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#71717a", fontSize: 10 }}
                interval={2}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#71717a", fontSize: 10 }}
                width={28}
                domain={[0, maxY]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#18181b",
                  border: "1px solid #27272a",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: "#a1a1aa" }}
                itemStyle={{ color: "#84cc16" }}
              />
              <Area
                type="monotone"
                dataKey="users"
                stroke="#84cc16"
                strokeWidth={2}
                fill="url(#userGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Athletes */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          Top Athletes
        </h3>
        {topUsers.length === 0 ? (
          <p className="text-xs text-muted-foreground">No active athletes yet.</p>
        ) : (
          <div className="space-y-3">
            {topUsers.map((user, i) => (
              <div key={user.id} className="flex items-center gap-3">
                <span className="w-4 text-xs text-muted-foreground">
                  {i + 1}.
                </span>
                <UserAvatar
                  name={user.name}
                  profilePicture={user.profilePicture}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {user.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {user.program ?? user.athleteType}
                  </p>
                </div>
                <span className="text-xs font-medium text-emerald-400">
                  {user.progress ?? 0}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
