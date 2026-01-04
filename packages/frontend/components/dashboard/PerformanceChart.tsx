"use client";

import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { Execution } from "@/lib/types";

// ===========================================
// Types
// ===========================================

interface PerformanceChartProps {
  executions: Execution[];
  className?: string;
}

type TimeRange = "7d" | "14d" | "30d";

interface ChartDataPoint {
  date: string;
  timestamp: number;
  dailyPnL: number;
  cumulativePnL: number;
}

// ===========================================
// PerformanceChart Component
// ===========================================

export function PerformanceChart({ executions, className }: PerformanceChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");

  // Process executions into daily cumulative P&L data
  const chartData = useMemo(() => {
    return processExecutionsToChartData(executions, timeRange);
  }, [executions, timeRange]);

  // Determine if overall performance is positive
  const isPositive = chartData.length > 0 &&
    chartData[chartData.length - 1].cumulativePnL >= 0;

  // Calculate total P&L for the period
  const totalPnL = chartData.length > 0
    ? chartData[chartData.length - 1].cumulativePnL
    : 0;

  // Empty state
  if (!executions?.length) {
    return (
      <div className={cn("glass-card", className)}>
        <div className="p-6 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/[0.06]">
              <TrendingUp className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-100">
                Performance History
              </h3>
              <p className="text-sm text-slate-500">
                Cumulative P&L over time
              </p>
            </div>
          </div>
        </div>
        <div className="h-64 flex items-center justify-center text-slate-500">
          <div className="text-center">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 text-slate-600" />
            <p>No execution data to display</p>
            <p className="text-sm text-slate-600 mt-1">
              Grant permissions to agents to see performance
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("glass-card-hover transition-all duration-300", className)}>
      {/* Header */}
      <div className="p-6 border-b border-white/[0.06]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2.5 rounded-xl transition-colors",
              isPositive
                ? "bg-emerald-500/10"
                : "bg-red-500/10"
            )}>
              {isPositive ? (
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-400" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-100">
                Performance History
              </h3>
              <p className="text-sm text-slate-500">
                <span className={cn(
                  "font-medium",
                  isPositive ? "text-emerald-400" : "text-red-400"
                )}>
                  {isPositive ? "+" : ""}${Math.abs(totalPnL).toFixed(2)}
                </span>
                {" "}over {timeRange === "7d" ? "7 days" : timeRange === "14d" ? "14 days" : "30 days"}
              </p>
            </div>
          </div>

          {/* Time Range Selector */}
          <div className="flex gap-1 bg-white/[0.04] rounded-xl p-1">
            {(["7d", "14d", "30d"] as TimeRange[]).map((range) => (
              <TimeRangeButton
                key={range}
                active={timeRange === range}
                onClick={() => setTimeRange(range)}
              >
                {range}
              </TimeRangeButton>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="p-6">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorLoss" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.06)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: "#64748b" }}
                tickLine={{ stroke: "rgba(255,255,255,0.06)" }}
                axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                tickFormatter={(value) => format(new Date(value), "MMM d")}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#64748b" }}
                tickLine={{ stroke: "rgba(255,255,255,0.06)" }}
                axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                tickFormatter={(value) => `$${value.toFixed(0)}`}
                width={50}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="cumulativePnL"
                stroke={isPositive ? "#22c55e" : "#ef4444"}
                strokeWidth={2}
                fill={isPositive ? "url(#colorProfit)" : "url(#colorLoss)"}
                animationDuration={750}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ===========================================
// Time Range Button Component
// ===========================================

interface TimeRangeButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function TimeRangeButton({ active, onClick, children }: TimeRangeButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200",
        active
          ? "bg-white/[0.1] text-slate-100 shadow-sm"
          : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]"
      )}
    >
      {children}
    </button>
  );
}

// ===========================================
// Custom Tooltip Component
// ===========================================

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: ChartDataPoint }>;
  label?: string;
}

function ChartTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  const isPositive = data.cumulativePnL >= 0;
  const isDailyPositive = data.dailyPnL >= 0;

  return (
    <div className="bg-dark-900/95 backdrop-blur-sm border border-white/[0.1] rounded-xl p-3 shadow-xl">
      <p className="text-sm font-medium text-slate-300 mb-2">
        {format(new Date(data.date), "MMM d, yyyy")}
      </p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-slate-500">Daily</span>
          <span className={cn(
            "text-sm font-medium",
            isDailyPositive ? "text-emerald-400" : "text-red-400"
          )}>
            {isDailyPositive ? "+" : ""}${data.dailyPnL.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 pt-1.5 border-t border-white/[0.06]">
          <span className="text-xs text-slate-500">Cumulative</span>
          <span className={cn(
            "text-sm font-semibold",
            isPositive ? "text-emerald-400" : "text-red-400"
          )}>
            {isPositive ? "+" : ""}${data.cumulativePnL.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ===========================================
// Data Processing Function
// ===========================================

function processExecutionsToChartData(
  executions: Execution[],
  timeRange: TimeRange
): ChartDataPoint[] {
  if (!executions?.length) return [];

  // Calculate date range
  const now = Date.now();
  const days = timeRange === "7d" ? 7 : timeRange === "14d" ? 14 : 30;
  const startTime = now - days * 24 * 60 * 60 * 1000;

  // Filter executions within range and successful only
  const filteredExecutions = executions.filter((exec) => {
    const execTime = parseInt(exec.startedAt) * 1000;
    return execTime >= startTime && exec.result === "SUCCESS";
  });

  // Group by date - initialize all dates in range with 0
  const byDate = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const date = new Date(now - (days - 1 - i) * 24 * 60 * 60 * 1000);
    const dateKey = date.toISOString().split("T")[0];
    byDate.set(dateKey, 0);
  }

  // Sum P&L by date
  filteredExecutions.forEach((exec) => {
    const date = new Date(parseInt(exec.startedAt) * 1000);
    const dateKey = date.toISOString().split("T")[0];
    const pnl = parseFloat(exec.profitLoss) / 1e6; // Convert from USDC decimals

    if (byDate.has(dateKey)) {
      byDate.set(dateKey, (byDate.get(dateKey) || 0) + pnl);
    }
  });

  // Convert to chart data with cumulative P&L
  let cumulative = 0;
  const chartData: ChartDataPoint[] = [];

  byDate.forEach((dailyPnL, date) => {
    cumulative += dailyPnL;
    chartData.push({
      date,
      timestamp: new Date(date).getTime() / 1000,
      dailyPnL: Math.round(dailyPnL * 100) / 100,
      cumulativePnL: Math.round(cumulative * 100) / 100,
    });
  });

  return chartData;
}
