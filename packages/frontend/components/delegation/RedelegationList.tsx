"use client";

/**
 * RedelegationList Component
 *
 * Displays a list of A2A redelegations for a user, showing parent → child
 * agent relationships with amounts, durations, and status.
 */

import Link from "next/link";
import { useUserRedelegations, isRedelegationExpired, getTimeRemaining } from "@/hooks/useDelegation";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge, ScoreBadge, StrategyBadge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn, formatAmount, formatDate, formatDuration, truncateAddress } from "@/lib/utils";
import { ArrowRight, Clock, Wallet, AlertCircle, Users, ExternalLink } from "lucide-react";

// ===========================================
// Types
// ===========================================

interface RedelegationListProps {
  /** User wallet address */
  userId: string;
  /** Additional CSS classes */
  className?: string;
  /** Maximum items to show */
  limit?: number;
  /** Show header */
  showHeader?: boolean;
}

// ===========================================
// RedelegationList Component
// ===========================================

export function RedelegationList({
  userId,
  className,
  limit,
  showHeader = true,
}: RedelegationListProps) {
  const { redelegations, loading, error, count } = useUserRedelegations(userId);

  const displayRedelegations = limit ? redelegations.slice(0, limit) : redelegations;

  // Loading state
  if (loading) {
    return (
      <Card className={className} variant="glass">
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary-400" />
              Your Redelegations
            </CardTitle>
          </CardHeader>
        )}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={className} variant="glass">
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary-400" />
              Your Redelegations
            </CardTitle>
          </CardHeader>
        )}
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
          <p className="text-red-400 font-medium">Error loading redelegations</p>
          <p className="text-sm text-primary-500 mt-1">{error.message}</p>
        </div>
      </Card>
    );
  }

  // Empty state
  if (count === 0) {
    return (
      <Card className={className} variant="glass">
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary-400" />
              Your Redelegations
            </CardTitle>
          </CardHeader>
        )}
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="h-12 w-12 text-primary-500/30 mb-4" />
          <p className="text-primary-400 font-medium">No Active Redelegations</p>
          <p className="text-sm text-primary-500 mt-1 max-w-sm">
            When agents you've delegated to re-delegate to specialists, they'll appear here
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={className} variant="glass">
      {showHeader && (
        <CardHeader
          action={
            count > 0 && (
              <Badge variant="default" size="sm">
                {count} Active
              </Badge>
            )
          }
        >
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary-400" />
            Your Redelegations
          </CardTitle>
        </CardHeader>
      )}

      <div className="space-y-4">
        {displayRedelegations.map((redel) => (
          <RedelegationCard key={redel.id} redelegation={redel} />
        ))}
      </div>

      {/* Show more link if limited */}
      {limit && count > limit && (
        <div className="mt-4 pt-4 border-t border-primary-400/20 text-center">
          <Link
            href="/dashboard?tab=redelegations"
            className="text-sm text-primary-400 hover:text-primary-300 font-medium"
          >
            View all {count} redelegations
          </Link>
        </div>
      )}
    </Card>
  );
}

// ===========================================
// RedelegationCard Component
// ===========================================

interface RedelegationCardProps {
  redelegation: any;
  className?: string;
}

function RedelegationCard({ redelegation, className }: RedelegationCardProps) {
  const isExpired = isRedelegationExpired(redelegation.expiresAt);
  const timeRemaining = getTimeRemaining(redelegation.expiresAt);

  return (
    <div
      className={cn(
        "border rounded-xl p-4 hover:border-primary-400/40 transition-colors",
        isExpired ? "bg-dark-800/30 border-primary-400/10" : "bg-dark-800/50 border-primary-400/20",
        className
      )}
    >
      {/* Agent Flow Row */}
      <div className="flex items-center gap-3 mb-3">
        {/* Parent Agent */}
        <Link
          href={`/agents/${redelegation.parentAgent.id}`}
          className="flex-1 group"
        >
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
              {redelegation.parentAgent.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-primary-200 truncate group-hover:text-primary-400 transition-colors">
                {redelegation.parentAgent.name}
              </p>
              <p className="text-xs text-primary-500">Manager</p>
            </div>
          </div>
        </Link>

        {/* Arrow */}
        <div className="flex items-center gap-1 px-2">
          <ArrowRight className="h-4 w-4 text-primary-500" />
        </div>

        {/* Child Agent */}
        <Link
          href={`/agents/${redelegation.childAgent.id}`}
          className="flex-1 group"
        >
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-bold text-sm">
              {redelegation.childAgent.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-primary-200 truncate group-hover:text-primary-400 transition-colors">
                {redelegation.childAgent.name}
              </p>
              <div className="flex items-center gap-1.5">
                <StrategyBadge strategy={redelegation.childAgent.strategyType} />
              </div>
            </div>
          </div>
        </Link>

        {/* Score */}
        <div className="text-right">
          <ScoreBadge score={redelegation.childAgent.reputationScore} size="lg" />
        </div>
      </div>

      {/* Details Row */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-primary-400 pt-3 border-t border-primary-400/20">
        {/* Amount */}
        <div className="flex items-center gap-1.5">
          <Wallet className="h-3.5 w-3.5 text-primary-500" />
          <span className="font-medium text-green-400">
            {formatAmount(redelegation.amount)} USDC
          </span>
        </div>

        {/* Duration */}
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-primary-500" />
          <span>{formatDuration(redelegation.duration)}</span>
        </div>

        {/* Time Remaining / Expiry */}
        <div className="flex items-center gap-1.5">
          {isExpired ? (
            <Badge variant="secondary" size="sm">
              Expired
            </Badge>
          ) : (
            <Badge variant="success" size="sm" dot dotColor="green">
              {timeRemaining}
            </Badge>
          )}
        </div>

        {/* Created Date */}
        <div className="text-primary-500 text-xs ml-auto">
          Created {formatDate(redelegation.createdAt)}
        </div>
      </div>
    </div>
  );
}

// ===========================================
// Compact Redelegation Row (for tables)
// ===========================================

interface RedelegationRowProps {
  redelegation: any;
  showUser?: boolean;
  className?: string;
}

export function RedelegationRow({
  redelegation,
  showUser = false,
  className,
}: RedelegationRowProps) {
  const isExpired = isRedelegationExpired(redelegation.expiresAt);

  return (
    <div
      className={cn(
        "flex items-center justify-between py-3 px-4 hover:bg-dark-700/50 transition-colors",
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Parent → Child */}
        <div className="flex items-center gap-2 text-sm">
          <Link
            href={`/agents/${redelegation.parentAgent.id}`}
            className="font-medium text-primary-200 hover:text-primary-400 truncate max-w-[100px]"
          >
            {redelegation.parentAgent.name}
          </Link>
          <ArrowRight className="h-3 w-3 text-primary-500 shrink-0" />
          <Link
            href={`/agents/${redelegation.childAgent.id}`}
            className="font-medium text-primary-200 hover:text-primary-400 truncate max-w-[100px]"
          >
            {redelegation.childAgent.name}
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Amount */}
        <span className="text-sm font-medium text-green-400">
          {formatAmount(redelegation.amount)}
        </span>

        {/* Status */}
        <Badge variant={isExpired ? "secondary" : "success"} size="sm">
          {isExpired ? "Expired" : "Active"}
        </Badge>

        {/* Link */}
        <Link
          href={`/agents/${redelegation.childAgent.id}`}
          className="text-primary-500 hover:text-primary-400"
        >
          <ExternalLink className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
