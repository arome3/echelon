"use client";

/**
 * UserDelegationTree Component
 *
 * Visualizes a user's delegation hierarchy showing:
 * - User (root) → Direct Agents OR Fund Manager → Specialist Agents
 * - Real-time allocation percentages
 * - Performance metrics per agent
 */

import { useMemo } from "react";
import Link from "next/link";
import {
  User,
  Briefcase,
  ArrowRight,
  ArrowDown,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Shield,
  GitBranch,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { useAccount } from "wagmi";
import { cn, formatAmount, truncateAddress } from "@/lib/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { AgentTrustIndicator } from "@/components/agents/VerifiedBadge";
import { useUserDashboard } from "@/hooks/useUser";
import { useUserDelegationTree, getScoreColorHex } from "@/hooks/useDelegation";
import type { Permission, Agent } from "@/lib/types";

// ===========================================
// Types
// ===========================================

interface UserDelegationTreeProps {
  /** User address (optional, uses connected wallet if not provided) */
  userAddress?: string;
  /** Additional CSS classes */
  className?: string;
  /** Show compact version */
  compact?: boolean;
  /** Permissions to display (optional, fetches from GraphQL if not provided) */
  permissions?: Permission[];
}

interface DelegationNode {
  type: "user" | "agent" | "specialist";
  id: string;
  name: string;
  amount?: string;
  reputationScore?: number;
  strategyType?: string;
  isVerified?: boolean;
  isActive?: boolean;
  expiresAt?: string;
  children?: DelegationNode[];
  profitLoss?: string;
}

// ===========================================
// Main Component
// ===========================================

export function UserDelegationTree({
  userAddress,
  className,
  compact = false,
  permissions: propPermissions,
}: UserDelegationTreeProps) {
  const { address: connectedAddress } = useAccount();
  const address = userAddress || connectedAddress;

  // Only fetch from GraphQL if permissions aren't provided as props
  const { user, permissions: fetchedPermissions, loading, error } = useUserDashboard(
    propPermissions ? "" : (address || "") // Skip fetch if we have prop permissions
  );

  // Use prop permissions if provided, otherwise use fetched permissions
  const permissions = propPermissions || fetchedPermissions;

  // Build the tree data from permissions
  const treeData = useMemo(() => {
    if (!address || !permissions?.length) return null;

    const activePermissions = permissions.filter((p) => p.isActive);
    if (!activePermissions.length) return null;

    const rootNode: DelegationNode = {
      type: "user",
      id: address,
      name: "You",
      children: activePermissions.map((p) => {
        // Build agent display name with proper fallbacks
        const walletAddr = p.agent?.walletAddress || "";
        const agentName = p.agent?.name && p.agent.name.trim()
          ? p.agent.name
          : walletAddr
            ? `Agent ${walletAddr.slice(0, 6)}...${walletAddr.slice(-4)}`
            : "Unknown Agent";

        return {
          type: "agent" as const,
          id: p.agent?.id || "",
          name: agentName,
          amount: p.amountPerPeriod,
          reputationScore: p.agent?.reputationScore || 0,
          strategyType: p.agent?.strategyType || "",
          isVerified: p.agent?.isVerified || false,
          isActive: p.isActive,
          expiresAt: p.expiresAt,
          // Children will be populated by redelegation data
          children: [],
        };
      }),
    };

    return rootNode;
  }, [address, permissions]);

  // Loading state (skip if permissions provided as props)
  if (loading && !propPermissions) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-primary-400" />
            Your Delegation Flow
          </CardTitle>
        </CardHeader>
        <div className="p-6">
          <Skeleton className="h-64 w-full" />
        </div>
      </Card>
    );
  }

  // Error state (skip if permissions provided as props)
  if (error && !propPermissions) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-primary-400" />
            Your Delegation Flow
          </CardTitle>
        </CardHeader>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
          <p className="text-red-400 font-medium">Error loading delegation data</p>
        </div>
      </Card>
    );
  }

  // Empty state
  if (!treeData || !treeData.children?.length) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-primary-400" />
            Your Delegation Flow
          </CardTitle>
        </CardHeader>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Shield className="w-12 h-12 text-primary-500/30 mb-4" />
          <p className="text-primary-400 font-medium">No Active Delegations</p>
          <p className="text-sm text-primary-500 mt-1">
            Grant permissions to agents to see your delegation flow here
          </p>
        </div>
      </Card>
    );
  }

  if (compact) {
    return <CompactDelegationFlow treeData={treeData} className={className} />;
  }

  return (
    <Card className={className} variant="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-primary-400" />
          Your Delegation Flow
        </CardTitle>
      </CardHeader>

      <div className="p-6 pt-0">
        <DelegationFlowVisualization treeData={treeData} userAddress={address || ""} />
      </div>
    </Card>
  );
}

// ===========================================
// Delegation Flow Visualization
// ===========================================

interface DelegationFlowVisualizationProps {
  treeData: DelegationNode;
  userAddress: string;
}

function DelegationFlowVisualization({ treeData, userAddress }: DelegationFlowVisualizationProps) {
  const hasMultipleAgents = (treeData.children?.length || 0) > 1;

  return (
    <div className="space-y-6">
      {/* User Node (Root) */}
      <div className="flex justify-center">
        <UserNode address={treeData.id} />
      </div>

      {/* Connection Line - Animated Flow */}
      <div className="flex justify-center">
        <div className="flex flex-col items-center">
          <div className="w-0.5 h-6 bg-gradient-to-b from-primary-400 to-primary-500 relative overflow-hidden">
            {/* Animated pulse flowing down */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/40 to-transparent animate-flow-down" />
          </div>
          <ArrowDown className="w-4 h-4 text-primary-400 -mt-1 animate-bounce-subtle" />
        </div>
      </div>

      {/* Agent Nodes */}
      <div className={cn(
        "flex gap-6 justify-center",
        hasMultipleAgents && "flex-wrap"
      )}>
        {treeData.children?.map((agent, index) => (
          <AgentNodeWithRedelegations
            key={agent.id || index}
            agent={agent}
            userAddress={userAddress}
            showArrow={index === 0 || !hasMultipleAgents}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="mt-8 pt-6 border-t border-primary-400/20">
        <div className="flex flex-wrap justify-center gap-6 text-xs text-primary-500">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>High Performance (80+)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span>Medium (60-79)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>Low (&lt;60)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===========================================
// User Node Component
// ===========================================

interface UserNodeProps {
  address: string;
}

function UserNode({ address }: UserNodeProps) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
        <User className="w-8 h-8 text-white" />
      </div>
      <p className="mt-2 text-sm font-medium text-primary-200">Your Wallet</p>
      <p className="text-xs text-primary-500 font-mono">{truncateAddress(address)}</p>
    </div>
  );
}

// ===========================================
// Agent Node with Redelegations
// ===========================================

interface AgentNodeWithRedelegationsProps {
  agent: DelegationNode;
  userAddress: string;
  showArrow?: boolean;
}

function AgentNodeWithRedelegations({ agent, userAddress, showArrow }: AgentNodeWithRedelegationsProps) {
  // Fetch redelegation data for this agent, filtered by the current user
  const { treeData: redelegationData, hasChildren } = useUserDelegationTree(agent.id, userAddress);

  const scoreColor = getScoreColorHex(agent.reputationScore || 50);
  const isFundManager = agent.strategyType === "Yield" || hasChildren;

  return (
    <div className="flex flex-col items-center">
      {/* Agent Card */}
      <Link href={`/agents/${agent.id}`}>
        <div className={cn(
          "relative p-4 rounded-xl border-2 transition-all hover:scale-105 cursor-pointer min-w-[180px]",
          isFundManager
            ? "bg-purple-500/10 border-purple-500/30 hover:border-purple-400"
            : "bg-dark-800/50 border-primary-400/20 hover:border-primary-400"
        )}>
          {/* Score Badge */}
          <div
            className="absolute -top-3 -right-3 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg"
            style={{ backgroundColor: scoreColor }}
          >
            {agent.reputationScore || 0}
          </div>

          {/* Icon */}
          <div className={cn(
            "w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3",
            isFundManager
              ? "bg-purple-500/20"
              : "bg-primary-500/20"
          )}>
            {isFundManager ? (
              <Briefcase className="w-6 h-6 text-purple-400" />
            ) : (
              <Zap className="w-6 h-6 text-primary-400" />
            )}
          </div>

          {/* Agent Info */}
          <div className="text-center">
            <p className="font-semibold text-primary-200 truncate max-w-[150px]">
              {agent.name}
            </p>
            <p className="text-xs text-primary-500 mt-1">
              {agent.strategyType}
            </p>
            {agent.amount && (
              <p className="text-sm text-green-400 mt-2 font-medium">
                {formatAmount(agent.amount)} USDC/period
              </p>
            )}
          </div>

          {/* Verified Badge */}
          {agent.isVerified && (
            <div className="absolute -top-2 -left-2">
              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
            </div>
          )}

          {/* Fund Manager Label */}
          {isFundManager && (
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-purple-500 text-white text-xs rounded-full whitespace-nowrap">
              Fund Manager
            </div>
          )}
        </div>
      </Link>

      {/* Redelegations (A2A) */}
      {hasChildren && redelegationData?.children && (
        <div className="mt-8">
          {/* Connection Line - Animated A2A Flow */}
          <div className="flex justify-center mb-4">
            <div className="flex flex-col items-center">
              {/* Upper line with flow animation */}
              <div className="w-0.5 h-6 bg-gradient-to-b from-purple-400 to-purple-500 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/40 to-transparent animate-flow-down" />
              </div>
              {/* A2A Label with glow effect */}
              <div className="px-3 py-1.5 bg-purple-500/20 rounded-full text-xs font-medium text-purple-300 border border-purple-500/30 shadow-lg shadow-purple-500/20 animate-pulse-subtle">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping-slow" />
                  A2A Delegation (ERC-7710)
                </span>
              </div>
              {/* Lower line with flow animation */}
              <div className="w-0.5 h-4 bg-purple-500 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/40 to-transparent animate-flow-down" />
              </div>
              <ArrowDown className="w-4 h-4 text-purple-400 -mt-1 animate-bounce-subtle" />
            </div>
          </div>

          {/* Specialist Agents */}
          <div className="flex gap-4 flex-wrap justify-center">
            {redelegationData.children.map((specialist, index) => (
              <SpecialistAgentNode
                key={specialist.attributes?.id || index}
                specialist={specialist}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ===========================================
// Specialist Agent Node
// ===========================================

interface SpecialistAgentNodeProps {
  specialist: {
    name: string;
    attributes?: {
      id: string;
      score: number;
      amount?: string;
      strategyType?: string;
    };
  };
}

function SpecialistAgentNode({ specialist }: SpecialistAgentNodeProps) {
  const score = specialist.attributes?.score || 50;
  const scoreColor = getScoreColorHex(score);

  return (
    <Link href={`/agents/${specialist.attributes?.id}`}>
      <div className="relative p-3 rounded-lg bg-dark-800/30 border border-primary-400/10 hover:border-primary-400/30 transition-all hover:scale-105 cursor-pointer min-w-[140px]">
        {/* Score Badge */}
        <div
          className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow"
          style={{ backgroundColor: scoreColor }}
        >
          {score}
        </div>

        {/* Info */}
        <div className="text-center">
          <p className="font-medium text-primary-300 text-sm truncate max-w-[120px]">
            {specialist.name}
          </p>
          <p className="text-xs text-primary-500 mt-1">
            {specialist.attributes?.strategyType || "Specialist"}
          </p>
          {specialist.attributes?.amount && (
            <p className="text-xs text-green-400 mt-1">
              {formatAmount(specialist.attributes.amount)} USDC
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

// ===========================================
// Compact Delegation Flow
// ===========================================

interface CompactDelegationFlowProps {
  treeData: DelegationNode;
  className?: string;
}

function CompactDelegationFlow({ treeData, className }: CompactDelegationFlowProps) {
  const agentCount = treeData.children?.length || 0;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex items-center gap-2">
        <GitBranch className="w-4 h-4 text-primary-400" />
        <span className="text-sm text-primary-300 font-medium">
          {agentCount} Active Delegation{agentCount !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="flex -space-x-2">
        {treeData.children?.slice(0, 4).map((agent, index) => (
          <Link
            key={agent.id || index}
            href={`/agents/${agent.id}`}
            className="relative"
            title={agent.name}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-dark-800 hover:z-10 hover:scale-110 transition-transform"
              style={{ backgroundColor: getScoreColorHex(agent.reputationScore || 50) }}
            >
              {agent.reputationScore || 0}
            </div>
          </Link>
        ))}
        {agentCount > 4 && (
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-primary-400 bg-dark-700 border-2 border-dark-800">
            +{agentCount - 4}
          </div>
        )}
      </div>
    </div>
  );
}

// ===========================================
// Export
// ===========================================

export { CompactDelegationFlow };
