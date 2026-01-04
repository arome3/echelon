"use client";

import { BadgeCheck, Shield, Star, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// ===========================================
// Verified Badge Component
// ===========================================

export type BadgeType = "verified" | "community" | "new" | "warning";

interface VerifiedBadgeProps {
  /** Type of badge to display */
  type: BadgeType;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Show label text */
  showLabel?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const badgeConfig = {
  verified: {
    icon: BadgeCheck,
    label: "Verified",
    tooltip: "Verified by Echelon - Audited and trusted agent",
    bgColor: "bg-blue-500/20",
    borderColor: "border-blue-500/40",
    textColor: "text-blue-400",
    iconColor: "text-blue-400",
    glowColor: "shadow-blue-500/20",
  },
  community: {
    icon: Star,
    label: "Community",
    tooltip: "Community agent - Check reputation before delegating",
    bgColor: "bg-purple-500/20",
    borderColor: "border-purple-500/40",
    textColor: "text-purple-400",
    iconColor: "text-purple-400",
    glowColor: "shadow-purple-500/20",
  },
  new: {
    icon: Shield,
    label: "New",
    tooltip: "New agent - No track record yet",
    bgColor: "bg-yellow-500/20",
    borderColor: "border-yellow-500/40",
    textColor: "text-yellow-400",
    iconColor: "text-yellow-400",
    glowColor: "shadow-yellow-500/20",
  },
  warning: {
    icon: AlertCircle,
    label: "Caution",
    tooltip: "Low reputation - Exercise caution",
    bgColor: "bg-red-500/20",
    borderColor: "border-red-500/40",
    textColor: "text-red-400",
    iconColor: "text-red-400",
    glowColor: "shadow-red-500/20",
  },
};

const sizeConfig = {
  sm: {
    iconSize: "w-3 h-3",
    padding: "px-1.5 py-0.5",
    text: "text-xs",
    gap: "gap-1",
  },
  md: {
    iconSize: "w-4 h-4",
    padding: "px-2 py-1",
    text: "text-sm",
    gap: "gap-1.5",
  },
  lg: {
    iconSize: "w-5 h-5",
    padding: "px-3 py-1.5",
    text: "text-base",
    gap: "gap-2",
  },
};

export function VerifiedBadge({
  type,
  size = "md",
  showLabel = true,
  className,
}: VerifiedBadgeProps) {
  const config = badgeConfig[type];
  const sizeStyles = sizeConfig[size];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border",
        config.bgColor,
        config.borderColor,
        sizeStyles.padding,
        sizeStyles.gap,
        "hover:shadow-lg transition-shadow",
        config.glowColor,
        className
      )}
      title={config.tooltip}
    >
      <Icon className={cn(sizeStyles.iconSize, config.iconColor)} />
      {showLabel && (
        <span className={cn(sizeStyles.text, config.textColor, "font-medium")}>
          {config.label}
        </span>
      )}
    </div>
  );
}

// ===========================================
// Agent Trust Indicator
// ===========================================

interface AgentTrustIndicatorProps {
  /** Is the agent verified by Echelon */
  isVerified: boolean;
  /** Agent's reputation score (0-100) */
  reputationScore: number;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Show label text */
  showLabel?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Determines the appropriate badge type based on verification and reputation
 */
export function getAgentBadgeType(
  isVerified: boolean,
  reputationScore: number
): BadgeType {
  if (isVerified) return "verified";
  if (reputationScore === 0) return "new";
  if (reputationScore < 30) return "warning";
  return "community";
}

export function AgentTrustIndicator({
  isVerified,
  reputationScore,
  size = "md",
  showLabel = true,
  className,
}: AgentTrustIndicatorProps) {
  const badgeType = getAgentBadgeType(isVerified, reputationScore);

  return (
    <VerifiedBadge
      type={badgeType}
      size={size}
      showLabel={showLabel}
      className={className}
    />
  );
}

// ===========================================
// Reputation Score Badge
// ===========================================

interface ReputationScoreBadgeProps {
  /** Reputation score (0-100) */
  score: number;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Additional CSS classes */
  className?: string;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-lime-400";
  if (score >= 40) return "text-yellow-400";
  if (score >= 20) return "text-orange-400";
  return "text-red-400";
}

function getScoreBgColor(score: number): string {
  if (score >= 80) return "bg-green-500/20 border-green-500/40";
  if (score >= 60) return "bg-lime-500/20 border-lime-500/40";
  if (score >= 40) return "bg-yellow-500/20 border-yellow-500/40";
  if (score >= 20) return "bg-orange-500/20 border-orange-500/40";
  return "bg-red-500/20 border-red-500/40";
}

export function ReputationScoreBadge({
  score,
  size = "md",
  className,
}: ReputationScoreBadgeProps) {
  const sizeStyles = sizeConfig[size];
  const scoreColor = getScoreColor(score);
  const bgColor = getScoreBgColor(score);

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border",
        bgColor,
        sizeStyles.padding,
        sizeStyles.gap,
        className
      )}
      title={`Reputation Score: ${score}/100`}
    >
      <Shield className={cn(sizeStyles.iconSize, scoreColor)} />
      <span className={cn(sizeStyles.text, scoreColor, "font-bold")}>
        {score}
      </span>
    </div>
  );
}

// ===========================================
// Combined Agent Badge Row
// ===========================================

interface AgentBadgeRowProps {
  /** Is the agent verified by Echelon */
  isVerified: boolean;
  /** Agent's reputation score (0-100) */
  reputationScore: number;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Additional CSS classes */
  className?: string;
}

export function AgentBadgeRow({
  isVerified,
  reputationScore,
  size = "sm",
  className,
}: AgentBadgeRowProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <AgentTrustIndicator
        isVerified={isVerified}
        reputationScore={reputationScore}
        size={size}
        showLabel={true}
      />
      <ReputationScoreBadge score={reputationScore} size={size} />
    </div>
  );
}
