"use client";

import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// ===========================================
// Badge Component
// ===========================================

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Visual style variant */
  variant?: "default" | "primary" | "secondary" | "success" | "danger" | "warning" | "outline";
  /** Size of the badge */
  size?: "sm" | "md" | "lg";
  /** Make the badge pill-shaped */
  pill?: boolean;
  /** Optional dot indicator */
  dot?: boolean;
  /** Dot color (if dot is true) */
  dotColor?: "green" | "red" | "yellow" | "blue" | "gray";
}

const variantStyles = {
  default: "bg-gray-100 text-gray-800",
  primary: "bg-primary-100 text-primary-800",
  secondary: "bg-gray-100 text-gray-600",
  success: "bg-green-50 text-green-700",
  danger: "bg-red-50 text-red-700",
  warning: "bg-yellow-50 text-yellow-700",
  outline: "border border-gray-300 bg-transparent text-gray-700",
};

const sizeStyles = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-0.5 text-xs",
  lg: "px-3 py-1 text-sm",
};

const dotColorStyles = {
  green: "bg-green-500",
  red: "bg-red-500",
  yellow: "bg-yellow-500",
  blue: "bg-blue-500",
  gray: "bg-gray-500",
};

export function Badge({
  className,
  variant = "default",
  size = "md",
  pill = true,
  dot = false,
  dotColor = "gray",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-medium",
        pill ? "rounded-full" : "rounded-md",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full mr-1.5",
            dotColorStyles[dotColor]
          )}
        />
      )}
      {children}
    </span>
  );
}

// ===========================================
// Strategy Badge Component
// ===========================================

interface StrategyBadgeProps {
  strategy: string;
  className?: string;
}

const strategyColors: Record<string, string> = {
  DCA: "bg-blue-50 text-blue-700",
  Arbitrage: "bg-purple-50 text-purple-700",
  Yield: "bg-green-50 text-green-700",
  Momentum: "bg-orange-50 text-orange-700",
  MeanReversion: "bg-pink-50 text-pink-700",
  GridTrading: "bg-cyan-50 text-cyan-700",
};

export function StrategyBadge({ strategy, className }: StrategyBadgeProps) {
  const colorClass = strategyColors[strategy] || strategyColors.DCA;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        colorClass,
        className
      )}
    >
      {strategy}
    </span>
  );
}

// ===========================================
// Risk Badge Component
// ===========================================

interface RiskBadgeProps {
  level: number;
  showLabel?: boolean;
  className?: string;
}

export function RiskBadge({ level, showLabel = true, className }: RiskBadgeProps) {
  const getRiskConfig = (level: number) => {
    if (level <= 3) return { label: "Low", color: "bg-green-50 text-green-700" };
    if (level <= 6) return { label: "Medium", color: "bg-yellow-50 text-yellow-700" };
    if (level <= 8) return { label: "High", color: "bg-orange-50 text-orange-700" };
    return { label: "Very High", color: "bg-red-50 text-red-700" };
  };

  const config = getRiskConfig(level);

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        config.color,
        className
      )}
    >
      {showLabel ? `Risk: ${level}/10` : level}
    </span>
  );
}

// ===========================================
// Status Badge Component
// ===========================================

interface StatusBadgeProps {
  status: "active" | "inactive" | "pending" | "success" | "failed";
  className?: string;
}

const statusConfig: Record<StatusBadgeProps["status"], { label: string; variant: "success" | "secondary" | "warning" | "danger"; dot: boolean; dotColor?: "green" | "gray" | "yellow" }> = {
  active: { label: "Active", variant: "success", dot: true, dotColor: "green" },
  inactive: { label: "Inactive", variant: "secondary", dot: true, dotColor: "gray" },
  pending: { label: "Pending", variant: "warning", dot: true, dotColor: "yellow" },
  success: { label: "Success", variant: "success", dot: false },
  failed: { label: "Failed", variant: "danger", dot: false },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge
      variant={config.variant}
      dot={config.dot}
      dotColor={config.dotColor}
      className={className}
    >
      {config.label}
    </Badge>
  );
}

// ===========================================
// Score Badge Component
// ===========================================

interface ScoreBadgeProps {
  score: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ScoreBadge({ score, max = 100, size = "md", className }: ScoreBadgeProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-50 text-green-700";
    if (score >= 60) return "bg-lime-50 text-lime-700";
    if (score >= 40) return "bg-yellow-50 text-yellow-700";
    if (score >= 20) return "bg-orange-50 text-orange-700";
    return "bg-red-50 text-red-700";
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-bold rounded-full",
        getScoreColor(score),
        sizeStyles[size],
        className
      )}
    >
      {score}/{max}
    </span>
  );
}
