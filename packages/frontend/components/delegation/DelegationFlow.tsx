"use client";

import { useState } from "react";
import {
  Briefcase,
  Target,
  Shield,
  TrendingUp,
  Users,
  ArrowRight,
  Info,
  Zap,
  PieChart,
  GitBranch,
} from "lucide-react";
import { useAccount } from "wagmi";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { ConnectPrompt } from "@/components/ui/ConnectPrompt";
import { GrantPermission } from "@/components/permissions/GrantPermission";
import { AgentTrustIndicator } from "@/components/agents/VerifiedBadge";
import { useAgents } from "@/hooks/useAgents";
import { useFundManager, getStaticFundManager, isFundManager } from "@/hooks/useFundManager";
import { FUND_MANAGER } from "@/lib/constants";
import type { Agent } from "@/lib/types";

// Tab type
type DelegationMode = "managed" | "direct";

// ===========================================
// DelegationFlow Component
// ===========================================

interface DelegationFlowProps {
  /** Whether the flow is shown as a modal */
  isModal?: boolean;
  /** Modal open state (only used if isModal=true) */
  isOpen?: boolean;
  /** Modal close handler (only used if isModal=true) */
  onClose?: () => void;
  /** Callback when delegation completes */
  onComplete?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Main delegation flow component with Managed/Direct tabs.
 * - Managed: Delegates to Fund Manager who re-delegates via A2A (ERC-7710)
 * - Direct: User picks a specific agent from the leaderboard
 */
export function DelegationFlow({
  isModal = false,
  isOpen = true,
  onClose,
  onComplete,
  className,
}: DelegationFlowProps) {
  const { isConnected } = useAccount();
  const [mode, setMode] = useState<DelegationMode>("managed");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  // Fetch the official Fund Manager (pre-built, verified agent)
  const {
    fundManager: indexedFundManager,
    isAvailable: fundManagerAvailable,
    loading: fundManagerLoading,
  } = useFundManager();

  // Fetch other agents for Direct mode
  const { agents, loading: agentsLoading } = useAgents({ pageSize: 20 });

  // Use indexed Fund Manager if available, otherwise use static fallback data
  // This ensures the Fund Manager is always available even before indexing
  const fundManager = indexedFundManager || (getStaticFundManager() as Agent);
  const loading = fundManagerLoading || agentsLoading;

  // Filter out the Fund Manager from the direct delegation list
  const directAgents = (agents || []).filter((a) => {
    const isFM = isFundManager(a);
    if (isFM) {
      console.log("Filtering out Fund Manager from direct list:", a.name, a.id, a.walletAddress);
    }
    return !isFM;
  });

  // Content based on mode
  const content = (
    <div className={cn("space-y-6", className)}>
      {/* Not connected */}
      {!isConnected ? (
        <ConnectPrompt
          message="Connect your wallet to start delegating to AI agents"
          showBenefits
        />
      ) : (
        <>
          {/* Mode Tabs */}
          <div className="flex gap-2 p-1 bg-dark-800/50 rounded-xl border border-primary-400/20">
            <ModeTab
              active={mode === "managed"}
              onClick={() => {
                setMode("managed");
                setSelectedAgent(null);
              }}
              icon={<Briefcase className="w-4 h-4" />}
              label="Managed Portfolio"
              badge="Recommended"
            />
            <ModeTab
              active={mode === "direct"}
              onClick={() => {
                setMode("direct");
                setSelectedAgent(null);
              }}
              icon={<Target className="w-4 h-4" />}
              label="Direct Delegation"
              badge="Advanced"
            />
          </div>

          {/* Mode Content */}
          {mode === "managed" ? (
            <ManagedPortfolioView
              fundManager={fundManager}
              loading={fundManagerLoading}
              onComplete={onComplete}
            />
          ) : (
            <DirectDelegationView
              agents={directAgents}
              loading={agentsLoading}
              selectedAgent={selectedAgent}
              onSelectAgent={setSelectedAgent}
              onComplete={onComplete}
            />
          )}
        </>
      )}
    </div>
  );

  // Render as modal or inline
  if (isModal) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose || (() => {})}
        title="Start Earning"
        size="lg"
      >
        {content}
      </Modal>
    );
  }

  return content;
}

// ===========================================
// Mode Tab Component
// ===========================================

interface ModeTabProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: string;
}

function ModeTab({ active, onClick, icon, label, badge }: ModeTabProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all",
        active
          ? "bg-primary-400/20 text-primary-200 border border-primary-400/30"
          : "text-primary-400 hover:bg-primary-400/10"
      )}
    >
      {icon}
      <span className="font-medium">{label}</span>
      {badge && (
        <span
          className={cn(
            "px-2 py-0.5 text-xs rounded-full",
            active
              ? "bg-primary-400/30 text-primary-200"
              : "bg-primary-400/10 text-primary-500"
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// ===========================================
// Managed Portfolio View
// ===========================================

interface ManagedPortfolioViewProps {
  fundManager: Agent | null;
  loading: boolean;
  onComplete?: () => void;
}

function ManagedPortfolioView({
  fundManager,
  loading,
  onComplete,
}: ManagedPortfolioViewProps) {
  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-primary-400/10 rounded-xl" />
        <div className="h-48 bg-primary-400/10 rounded-xl" />
      </div>
    );
  }

  // Use static data from constants for display (always available)
  const displayName = FUND_MANAGER.NAME;
  const displayStrategy = FUND_MANAGER.STRATEGY;
  const displayRiskLevel = FUND_MANAGER.RISK_LEVEL;
  const displayDescription = FUND_MANAGER.DESCRIPTION;
  const displayFeatures = FUND_MANAGER.FEATURES;

  // Use indexed data if available, otherwise fallback to defaults
  const reputationScore = fundManager?.reputationScore ?? 85;
  const isVerified = fundManager?.isVerified ?? true;

  return (
    <div className="space-y-6">
      {/* Benefits - from FUND_MANAGER.FEATURES */}
      <div className="grid sm:grid-cols-3 gap-4">
        <BenefitCard
          icon={<PieChart className="w-5 h-5" />}
          title="Diversified"
          description="Funds spread across top performers"
          gradient="from-blue-500/20 to-blue-600/10"
          iconColor="text-blue-400"
        />
        <BenefitCard
          icon={<GitBranch className="w-5 h-5" />}
          title="A2A Delegation"
          description="Smart re-delegation via ERC-7710"
          gradient="from-purple-500/20 to-purple-600/10"
          iconColor="text-purple-400"
        />
        <BenefitCard
          icon={<Zap className="w-5 h-5" />}
          title="Auto-Optimized"
          description="Rebalanced based on performance"
          gradient="from-amber-500/20 to-amber-600/10"
          iconColor="text-amber-400"
        />
      </div>

      {/* Fund Manager Info */}
      <Card variant="glass">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary-400" />
              {displayName}
            </CardTitle>
            <AgentTrustIndicator
              isVerified={isVerified}
              reputationScore={reputationScore}
              size="sm"
            />
          </div>
        </CardHeader>

        <div className="space-y-4">
          {/* Manager Description */}
          <p className="text-sm text-primary-400">{displayDescription}</p>

          {/* Manager Stats */}
          <div className="flex items-center gap-4 p-4 bg-dark-800/50 rounded-lg border border-primary-400/20">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500/20 to-primary-600/10 rounded-xl flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-primary-400" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-primary-200">{displayName}</p>
              <p className="text-sm text-primary-500">
                Strategy: {displayStrategy} | Risk Level: {displayRiskLevel}/10
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-primary-200">
                {reputationScore}
              </p>
              <p className="text-xs text-primary-500">Reputation</p>
            </div>
          </div>

          {/* Features List */}
          <div className="grid sm:grid-cols-2 gap-2">
            {displayFeatures.map((feature, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-primary-300">
                <Shield className="w-4 h-4 text-green-400" />
                {feature}
              </div>
            ))}
          </div>

          {/* How it works */}
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <div className="text-sm text-blue-200">
                <p className="font-medium text-blue-300 mb-1">How Managed Portfolio Works</p>
                <p className="text-blue-200/80">
                  Your permission is granted to the Fund Manager, who intelligently
                  re-delegates to specialized agents (DCA, Arbitrage, Yield) using
                  ERC-7710 A2A delegation. This maximizes returns while spreading risk.
                </p>
              </div>
            </div>
          </div>

          {/* Delegation Flow Visualization */}
          <div className="p-4 bg-dark-800/30 rounded-lg border border-primary-400/10">
            <p className="text-xs text-primary-500 mb-3 uppercase tracking-wide">Delegation Flow</p>
            <div className="flex items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-2 px-3 py-2 bg-primary-400/10 rounded-lg">
                <Shield className="w-4 h-4 text-primary-400" />
                <span className="text-primary-300">You</span>
              </div>
              <ArrowRight className="w-4 h-4 text-primary-500" />
              <div className="flex items-center gap-2 px-3 py-2 bg-purple-500/10 rounded-lg border border-purple-500/30">
                <Briefcase className="w-4 h-4 text-purple-400" />
                <span className="text-purple-300">Fund Manager</span>
              </div>
              <ArrowRight className="w-4 h-4 text-primary-500" />
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 rounded-lg">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-blue-300">Top Agents</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Grant Permission Form - only if we have a valid Fund Manager */}
      {fundManager ? (
        <GrantPermission
          agent={fundManager}
          onPermissionChanged={onComplete}
        />
      ) : (
        <Card variant="glass" className="text-center py-6">
          <div className="text-amber-400 mb-2">
            <Info className="w-8 h-8 mx-auto" />
          </div>
          <p className="text-primary-300 font-medium">Fund Manager Not Yet Deployed</p>
          <p className="text-sm text-primary-500 mt-1">
            The Fund Manager will be available soon. Check back shortly.
          </p>
        </Card>
      )}
    </div>
  );
}

// ===========================================
// Direct Delegation View
// ===========================================

interface DirectDelegationViewProps {
  agents: Agent[];
  loading: boolean;
  selectedAgent: Agent | null;
  onSelectAgent: (agent: Agent | null) => void;
  onComplete?: () => void;
}

function DirectDelegationView({
  agents,
  loading,
  selectedAgent,
  onSelectAgent,
  onComplete,
}: DirectDelegationViewProps) {
  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-primary-400/10 rounded-xl" />
        ))}
      </div>
    );
  }

  // If agent is selected, show the grant form
  if (selectedAgent) {
    return (
      <div className="space-y-4">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSelectAgent(null)}
          className="text-primary-400"
        >
          ← Back to agent list
        </Button>

        {/* Selected Agent Info */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary-400" />
              Direct Delegation to {selectedAgent.name}
            </CardTitle>
          </CardHeader>
          <div className="p-4 bg-dark-800/50 rounded-lg border border-primary-400/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500/20 to-primary-600/10 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-primary-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-primary-200">{selectedAgent.name}</p>
                <p className="text-sm text-primary-500">
                  {selectedAgent.strategyType} | Risk: {selectedAgent.riskLevel}/10
                </p>
              </div>
              <AgentTrustIndicator
                isVerified={selectedAgent.isVerified}
                reputationScore={selectedAgent.reputationScore}
                size="sm"
              />
            </div>
          </div>
        </Card>

        {/* Grant Permission Form */}
        <GrantPermission
          agent={selectedAgent}
          onPermissionChanged={onComplete}
        />
      </div>
    );
  }

  // Agent List
  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-amber-300">Direct Delegation</p>
            <p className="text-amber-200/80">
              Choose a specific agent to delegate to. Your funds will only be managed
              by this single agent (no A2A re-delegation).
            </p>
          </div>
        </div>
      </div>

      {/* Agent List */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-400" />
            Select an Agent
          </CardTitle>
        </CardHeader>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {agents.map((agent, index) => (
            <AgentListItem
              key={agent.id}
              agent={agent}
              rank={index + 1}
              onClick={() => onSelectAgent(agent)}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}

// ===========================================
// Agent List Item Component
// ===========================================

interface AgentListItemProps {
  agent: Agent;
  rank: number;
  onClick: () => void;
}

function AgentListItem({ agent, rank, onClick }: AgentListItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 bg-dark-800/30 hover:bg-dark-800/50 rounded-lg border border-transparent hover:border-primary-400/20 transition-all text-left"
    >
      {/* Rank */}
      <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary-400/10 text-primary-400 font-bold text-sm">
        {rank}
      </div>

      {/* Agent Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-primary-200 truncate">{agent.name}</p>
        <p className="text-sm text-primary-500">
          {agent.strategyType} | Risk: {agent.riskLevel}/10
        </p>
      </div>

      {/* Stats */}
      <div className="text-right">
        <p className="font-semibold text-primary-200">{agent.reputationScore}</p>
        <p className="text-xs text-primary-500">Score</p>
      </div>

      {/* Trust Indicator */}
      <AgentTrustIndicator
        isVerified={agent.isVerified}
        reputationScore={agent.reputationScore}
        size="sm"
        showLabel={false}
      />

      {/* Arrow */}
      <ArrowRight className="w-4 h-4 text-primary-500" />
    </button>
  );
}

// ===========================================
// Benefit Card Component
// ===========================================

interface BenefitCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
  iconColor: string;
}

function BenefitCard({ icon, title, description, gradient, iconColor }: BenefitCardProps) {
  return (
    <div className="p-4 bg-dark-800/30 rounded-xl border border-primary-400/10">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3 bg-gradient-to-br", gradient, iconColor)}>
        {icon}
      </div>
      <p className="font-medium text-primary-200">{title}</p>
      <p className="text-sm text-primary-500 mt-1">{description}</p>
    </div>
  );
}

// ===========================================
// Export Helper Components
// ===========================================

export { ManagedPortfolioView, DirectDelegationView };
