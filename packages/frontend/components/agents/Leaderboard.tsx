"use client";

import { useState, useMemo } from "react";
import { Trophy, RefreshCw, Crown, Users, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useLeaderboard } from "@/hooks/useAgents";
import { AgentCard } from "./AgentCard";
import { StrategyFilter } from "./StrategyFilter";
import { SkeletonLeaderboard } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { NoAgentsFound } from "@/components/ui/EmptyState";
import { ReputationBadge } from "./ReputationBadge";
import { cn } from "@/lib/utils";
import type { StrategyType, RankedAgent } from "@/lib/types";

// ===========================================
// Leaderboard Component
// ===========================================

interface LeaderboardProps {
  /** Initial strategy filter */
  initialStrategy?: StrategyType;
  /** Number of agents to show */
  limit?: number;
  /** Show filter controls */
  showFilters?: boolean;
  /** Show refresh button */
  showRefresh?: boolean;
  /** Container class */
  className?: string;
}

export function Leaderboard({
  initialStrategy,
  limit = 10,
  showFilters = true,
  showRefresh = true,
  className,
}: LeaderboardProps) {
  const [strategyType, setStrategyType] = useState<StrategyType | undefined>(
    initialStrategy
  );

  const { agents, loading, error, refetch } = useLeaderboard({
    limit,
    strategyType,
  });

  // Separate orchestrators from trading agents
  const { orchestrators, tradingAgents } = useMemo(() => {
    const orchestrators: RankedAgent[] = [];
    const tradingAgents: RankedAgent[] = [];

    agents.forEach((agent) => {
      if (agent.isOrchestrator) {
        orchestrators.push(agent);
      } else {
        tradingAgents.push(agent);
      }
    });

    // Re-rank trading agents (1, 2, 3...) excluding orchestrators
    return {
      orchestrators,
      tradingAgents: tradingAgents.map((agent, idx) => ({
        ...agent,
        rank: idx + 1,
      })),
    };
  }, [agents]);

  const handleStrategyChange = (strategy: StrategyType | undefined) => {
    setStrategyType(strategy);
  };

  if (error) {
    return <ErrorState error={error} onRetry={() => refetch()} />;
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Orchestrator Spotlight Card */}
      {orchestrators.length > 0 && !strategyType && (
        <OrchestratorSpotlight orchestrators={orchestrators} />
      )}

      {/* Main Leaderboard */}
      <div className="glass-card">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 border-b border-stone-700/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Trophy className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-100">Trading Specialists</h2>
              <p className="text-sm text-stone-400">
                Top agents ranked by reputation score
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {showFilters && (
              <StrategyFilter
                value={strategyType}
                onChange={handleStrategyChange}
              />
            )}

            {showRefresh && (
              <button
                onClick={() => refetch()}
                disabled={loading}
                className={cn(
                  "p-2 text-stone-400 hover:text-stone-200 hover:bg-stone-700/50 rounded-lg transition-colors",
                  loading && "animate-spin"
                )}
                aria-label="Refresh leaderboard"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && agents.length === 0 ? (
            <SkeletonLeaderboard count={limit} />
          ) : tradingAgents.length === 0 ? (
            <NoAgentsFound
              action={
                strategyType
                  ? {
                      label: "Clear Filter",
                      onClick: () => setStrategyType(undefined),
                    }
                  : undefined
              }
            />
          ) : (
            <div className="space-y-3">
              {tradingAgents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} rank={agent.rank} />
              ))}
            </div>
          )}
        </div>

        {/* Loading indicator for subsequent loads */}
        {loading && agents.length > 0 && (
          <div className="px-6 pb-4">
            <div className="h-1 bg-stone-700/50 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500/50 animate-pulse w-1/3" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ===========================================
// Orchestrator Spotlight Component
// ===========================================

interface OrchestratorSpotlightProps {
  orchestrators: RankedAgent[];
}

function OrchestratorSpotlight({ orchestrators }: OrchestratorSpotlightProps) {
  const mainOrchestrator = orchestrators[0];

  if (!mainOrchestrator) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-dark-900/80 border border-primary-300/20">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary-300/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-amber-500/20 rounded-lg">
            <Crown className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-primary-200">Fund Orchestrator</h3>
            <p className="text-xs text-primary-500">Manages specialist agents via A2A delegation</p>
          </div>
        </div>

        {/* Main Card */}
        <Link
          href={`/agents/${mainOrchestrator.id}`}
          className="block p-4 bg-dark-800/50 rounded-xl border border-primary-300/10 hover:border-primary-300/30 transition-all group"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Left: Identity */}
            <div className="flex items-center gap-4">
              {/* Avatar with crown */}
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-primary-300 to-primary-500 rounded-xl flex items-center justify-center shadow-lg shadow-primary-300/20">
                  <span className="text-2xl font-bold text-dark-900">
                    {mainOrchestrator.name.charAt(0)}
                  </span>
                </div>
                <div className="absolute -top-2 -right-2 p-1 bg-amber-500 rounded-full">
                  <Crown className="w-3 h-3 text-dark-900" />
                </div>
              </div>

              <div>
                <h4 className="text-xl font-bold text-primary-200 group-hover:text-primary-100 transition-colors">
                  {mainOrchestrator.name}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-xs font-medium rounded-full border border-amber-500/30">
                    Orchestrator
                  </span>
                  <span className="flex items-center gap-1 text-xs text-primary-500">
                    <Users className="w-3 h-3" />
                    Manages specialist agents
                  </span>
                </div>
              </div>
            </div>

            {/* Right: CTA */}
            <div className="flex items-center">
              <div className="p-2 bg-primary-300/10 rounded-lg group-hover:bg-primary-300/20 transition-colors">
                <ArrowRight className="w-5 h-5 text-primary-300 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="mt-4 text-sm text-primary-500 border-t border-primary-300/10 pt-4">
            The Fund Orchestrator coordinates specialist trading agents through Agent-to-Agent (A2A) delegation.
            It doesn&apos;t trade directly — instead, it intelligently routes funds to top-performing specialists.
          </p>
        </Link>

        {/* Additional orchestrators (if any) */}
        {orchestrators.length > 1 && (
          <div className="mt-4 pt-4 border-t border-primary-300/10">
            <p className="text-xs text-primary-500 mb-2">Other orchestrators:</p>
            <div className="flex flex-wrap gap-2">
              {orchestrators.slice(1).map((orch) => (
                <Link
                  key={orch.id}
                  href={`/agents/${orch.id}`}
                  className="px-3 py-1.5 bg-dark-800/50 hover:bg-dark-700/50 rounded-lg text-sm text-primary-300 transition-colors"
                >
                  {orch.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ===========================================
// Compact Leaderboard Component
// ===========================================

interface CompactLeaderboardProps {
  limit?: number;
  className?: string;
}

export function CompactLeaderboard({
  limit = 5,
  className,
}: CompactLeaderboardProps) {
  const { agents, loading, error } = useLeaderboard({ limit });

  if (loading) {
    return (
      <div className={cn("space-y-2", className)}>
        {Array.from({ length: limit }).map((_, i) => (
          <div
            key={i}
            className="h-12 bg-stone-800/50 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error || agents.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      {agents.map((agent) => (
        <div
          key={agent.id}
          className="flex items-center justify-between p-3 bg-stone-800/30 hover:bg-stone-700/40 rounded-lg transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-stone-400 w-6">
              #{agent.rank}
            </span>
            <span className="font-medium text-stone-100">{agent.name}</span>
          </div>
          <span className="text-sm font-semibold text-amber-400">
            {agent.reputationScore}/100
          </span>
        </div>
      ))}
    </div>
  );
}
