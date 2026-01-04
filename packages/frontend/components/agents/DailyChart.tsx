"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { TrendingUp, BarChart3 } from "lucide-react";
import { cn, formatAmount, formatDate } from "@/lib/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { SkeletonChart } from "@/components/ui/Skeleton";
import type { AgentDailyStat } from "@/lib/types";

// ===========================================
// Daily Chart Component
// ===========================================

interface DailyChartProps {
  dailyStats: AgentDailyStat[];
  loading?: boolean;
  className?: string;
}

type ChartType = "profitLoss" | "winRate" | "volume" | "executions";

export function DailyChart({ dailyStats, loading, className }: DailyChartProps) {
  const [chartType, setChartType] = useState<ChartType>("profitLoss");

  if (loading) {
    return <SkeletonChart className={className} />;
  }

  if (!dailyStats?.length) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-400" />
            Performance History
          </CardTitle>
        </CardHeader>
        <div className="h-64 flex items-center justify-center text-primary-500">
          No historical data available
        </div>
      </Card>
    );
  }

  // Transform data for chart
  const chartData = dailyStats.map((stat) => ({
    date: stat.date,
    profitLoss: parseFloat(stat.profitLoss) / 1e6, // Convert to USDC
    winRate: parseFloat(stat.winRate) * 100,
    volume: parseFloat(stat.volumeIn) / 1e6,
    executions: parseInt(stat.executionCount),
    success: parseInt(stat.successCount),
    failure: parseInt(stat.failureCount),
  }));

  // Calculate cumulative P&L
  let cumulative = 0;
  const cumulativeData = chartData.map((d) => {
    cumulative += d.profitLoss;
    return { ...d, cumulativePL: cumulative };
  });

  return (
    <Card className={className} padding="none">
      <div className="p-6 border-b border-primary-400/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary-400" />
            <h3 className="text-lg font-semibold text-primary-200">
              Performance History
            </h3>
          </div>

          {/* Chart Type Selector */}
          <div className="flex gap-1 bg-dark-700 rounded-lg p-1">
            <ChartTypeButton
              active={chartType === "profitLoss"}
              onClick={() => setChartType("profitLoss")}
            >
              P&L
            </ChartTypeButton>
            <ChartTypeButton
              active={chartType === "winRate"}
              onClick={() => setChartType("winRate")}
            >
              Win Rate
            </ChartTypeButton>
            <ChartTypeButton
              active={chartType === "volume"}
              onClick={() => setChartType("volume")}
            >
              Volume
            </ChartTypeButton>
            <ChartTypeButton
              active={chartType === "executions"}
              onClick={() => setChartType("executions")}
            >
              Trades
            </ChartTypeButton>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "profitLoss" ? (
              <AreaChart data={cumulativeData}>
                <defs>
                  <linearGradient id="colorPL" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: "#9ca3af" }}
                  tickFormatter={(value) => formatDate(value, "MMM d")}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#9ca3af" }}
                  tickFormatter={(value) => `$${value.toFixed(0)}`}
                />
                <Tooltip
                  content={<CustomTooltip type="profitLoss" />}
                />
                <Area
                  type="monotone"
                  dataKey="cumulativePL"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fill="url(#colorPL)"
                />
              </AreaChart>
            ) : chartType === "winRate" ? (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: "#9ca3af" }}
                  tickFormatter={(value) => formatDate(value, "MMM d")}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#9ca3af" }}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip content={<CustomTooltip type="winRate" />} />
                <Line
                  type="monotone"
                  dataKey="winRate"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            ) : chartType === "volume" ? (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: "#9ca3af" }}
                  tickFormatter={(value) => formatDate(value, "MMM d")}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#9ca3af" }}
                  tickFormatter={(value) => `$${value.toFixed(0)}`}
                />
                <Tooltip content={<CustomTooltip type="volume" />} />
                <Bar dataKey="volume" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: "#9ca3af" }}
                  tickFormatter={(value) => formatDate(value, "MMM d")}
                />
                <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} />
                <Tooltip content={<CustomTooltip type="executions" />} />
                <Bar dataKey="success" stackId="a" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="failure" stackId="a" fill="#ef4444" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}

// ===========================================
// Chart Type Button Component
// ===========================================

interface ChartTypeButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function ChartTypeButton({ active, onClick, children }: ChartTypeButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
        active
          ? "bg-dark-600 text-primary-100 shadow-sm"
          : "text-primary-400 hover:text-primary-200"
      )}
    >
      {children}
    </button>
  );
}

// ===========================================
// Custom Tooltip Component
// ===========================================

interface CustomTooltipProps {
  type: ChartType;
  active?: boolean;
  payload?: Array<{ value: number; payload: Record<string, number> }>;
  label?: string;
}

function CustomTooltip({ type, active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-dark-800 p-3 rounded-lg shadow-lg border border-primary-400/30">
      <p className="text-sm font-medium text-primary-100 mb-2">{label}</p>

      {type === "profitLoss" && (
        <>
          <p className="text-sm text-primary-400">
            Daily: <span className={data.profitLoss >= 0 ? "text-green-400" : "text-red-400"}>
              {data.profitLoss >= 0 ? "+" : ""}${data.profitLoss.toFixed(2)}
            </span>
          </p>
          <p className="text-sm text-primary-400">
            Cumulative: <span className={data.cumulativePL >= 0 ? "text-green-400" : "text-red-400"}>
              {data.cumulativePL >= 0 ? "+" : ""}${data.cumulativePL.toFixed(2)}
            </span>
          </p>
        </>
      )}

      {type === "winRate" && (
        <p className="text-sm text-primary-400">
          Win Rate: <span className="text-blue-400">{data.winRate.toFixed(1)}%</span>
        </p>
      )}

      {type === "volume" && (
        <p className="text-sm text-primary-400">
          Volume: <span className="text-purple-400">${data.volume.toFixed(2)}</span>
        </p>
      )}

      {type === "executions" && (
        <>
          <p className="text-sm text-primary-400">
            Success: <span className="text-green-400">{data.success}</span>
          </p>
          <p className="text-sm text-primary-400">
            Failed: <span className="text-red-400">{data.failure}</span>
          </p>
        </>
      )}
    </div>
  );
}
