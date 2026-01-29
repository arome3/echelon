"use client";

import {
  TrendingUp,
  TrendingDown,
  Shield,
  DollarSign,
  Zap,
} from "lucide-react";
import { cn, formatAmount, formatDisplayAmount } from "@/lib/utils";
import type { User } from "@/lib/types";

// ===========================================
// User Stats Component - Dark Mode Premium
// ===========================================

interface UserStatsProps {
  user: User;
  className?: string;
}

export function UserStats({ user, className }: UserStatsProps) {
  const totalProfitLoss = parseFloat(user.totalProfitFromAgents || "0");
  const isProfit = totalProfitLoss >= 0;

  return (
    <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      {/* Active Permissions */}
      <StatCard
        icon={<Shield className="w-5 h-5 text-blue-400" />}
        iconGradient="bg-gradient-to-br from-blue-500/20 to-blue-600/10"
        label="Active Permissions"
        value={user.activePermissions}
        sublabel={`${user.totalPermissionsGranted} total`}
        glowColor="blue"
      />

      {/* Total Delegated */}
      <StatCard
        icon={<DollarSign className="w-5 h-5 text-purple-400" />}
        iconGradient="bg-gradient-to-br from-purple-500/20 to-purple-600/10"
        label="Total Delegated"
        value={`${formatDisplayAmount(user.totalDelegated)} USDC`}
        sublabel="Across all agents"
        glowColor="purple"
      />

      {/* Total P&L */}
      <StatCard
        icon={
          isProfit ? (
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          ) : (
            <TrendingDown className="w-5 h-5 text-red-400" />
          )
        }
        iconGradient={
          isProfit
            ? "bg-gradient-to-br from-emerald-500/20 to-emerald-600/10"
            : "bg-gradient-to-br from-red-500/20 to-red-600/10"
        }
        label="Total Profit/Loss"
        value={`${isProfit ? "+" : ""}${formatAmount(user.totalProfitFromAgents || "0")} USDC`}
        valueColor={isProfit ? "text-emerald-400" : "text-red-400"}
        glowColor={isProfit ? "green" : "red"}
      />

      {/* Total Delegated Amount */}
      <StatCard
        icon={<Zap className="w-5 h-5 text-amber-400" />}
        iconGradient="bg-gradient-to-br from-amber-500/20 to-amber-600/10"
        label="Currently Delegated"
        value={`${formatDisplayAmount(user.currentDelegated || "0")} USDC`}
        sublabel={`${formatDisplayAmount(user.totalDelegated || "0")} total delegated`}
        glowColor="cyan"
      />
    </div>
  );
}

// ===========================================
// Stat Card Component - Dark Mode Premium
// ===========================================

interface StatCardProps {
  icon: React.ReactNode;
  iconGradient: string;
  label: string;
  value: string | number;
  sublabel?: string;
  valueColor?: string;
  glowColor?: "blue" | "green" | "red" | "purple" | "cyan";
}

function StatCard({
  icon,
  iconGradient,
  label,
  value,
  sublabel,
  valueColor = "text-slate-100",
  glowColor,
}: StatCardProps) {
  const glowStyles = {
    blue: "hover:shadow-glow-blue",
    green: "hover:shadow-glow-green",
    red: "hover:shadow-glow-red",
    purple: "hover:shadow-glow-purple",
    cyan: "hover:shadow-glow-cyan",
  };

  return (
    <div
      className={cn(
        "glass-card-hover p-5",
        glowColor && glowStyles[glowColor]
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn("p-2.5 rounded-xl", iconGradient)}>{icon}</div>
      </div>
      <div className="mt-4">
        <p className={cn("text-2xl font-bold tracking-tight", valueColor)}>{value}</p>
        <p className="text-sm text-slate-400 mt-1">{label}</p>
        {sublabel && (
          <p className="text-xs text-slate-500 mt-1">{sublabel}</p>
        )}
      </div>
    </div>
  );
}

// ===========================================
// Compact User Stats Component - Dark Mode Premium
// ===========================================

interface CompactUserStatsProps {
  user: User;
  className?: string;
}

export function CompactUserStats({ user, className }: CompactUserStatsProps) {
  const totalProfitLoss = parseFloat(user.totalProfitFromAgents || "0");
  const isProfit = totalProfitLoss >= 0;

  return (
    <div className={cn("flex items-center gap-6 text-sm", className)}>
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-blue-400" />
        <span className="text-slate-400">
          <strong className="text-slate-100">{user.activePermissions}</strong>{" "}
          permissions
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-purple-400" />
        <span className="text-slate-400">
          <strong className="text-slate-100">{formatDisplayAmount(user.totalDelegated || "0")}</strong>{" "}
          delegated
        </span>
      </div>
      <div className="flex items-center gap-2">
        {isProfit ? (
          <TrendingUp className="w-4 h-4 text-emerald-400" />
        ) : (
          <TrendingDown className="w-4 h-4 text-red-400" />
        )}
        <span className={isProfit ? "text-emerald-400" : "text-red-400"}>
          <strong>
            {isProfit ? "+" : ""}
            {formatAmount(user.totalProfitFromAgents || "0")}
          </strong>{" "}
          USDC
        </span>
      </div>
    </div>
  );
}
