"use client";

import { AlertCircle } from "lucide-react";
import { useAgentDetails } from "@/hooks/useAgents";
import { AgentHeader } from "@/components/agents/AgentHeader";
import { PerformanceMetrics } from "@/components/agents/PerformanceMetrics";
import { ExecutionHistory } from "@/components/agents/ExecutionHistory";
import { DailyChart } from "@/components/agents/DailyChart";
import { GrantPermission } from "@/components/permissions";
import { DelegationTree, RedelegationStats, Delegators } from "@/components/delegation";
import { SkeletonAgentDetail } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { SectionErrorBoundary } from "@/components/ui/ErrorBoundary";
import { Card } from "@/components/ui/Card";
import { ReputationMeter, ReputationGatedPermission } from "@/components/reputation";
import { FUND_MANAGER } from "@/lib/constants";

// ===========================================
// Agent Detail Page
// ===========================================

interface AgentPageProps {
  params: { id: string };
}

export default function AgentPage({ params }: AgentPageProps) {
  const { id } = params;
  const { agent, executions, dailyStats, loading, error } = useAgentDetails(id);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <SkeletonAgentDetail />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <ErrorState
            error={error}
            title="Failed to load agent"
            description={error.message || "Unable to fetch agent details. Please try again."}
            onRetry={() => window.location.reload()}
          />
        </div>
      </div>
    );
  }

  // Agent not found
  if (!agent) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <Card className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-primary-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-primary-200 mb-2">
              Agent Not Found
            </h1>
            <p className="text-primary-400 mb-6">
              The agent you're looking for doesn't exist or has been removed.
            </p>
            <a
              href="/"
              className="inline-flex items-center px-4 py-2 bg-primary-300 text-dark-900 font-medium rounded-lg hover:bg-primary-200 transition-colors"
            >
              Back to Leaderboard
            </a>
          </Card>
        </div>
      </div>
    );
  }

  // Check if this is the Fund Manager (portfolio manager, not a direct trader)
  const isFundManager = id === FUND_MANAGER.ID ||
    agent.walletAddress.toLowerCase() === FUND_MANAGER.ADDRESS.toLowerCase();

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Agent Header */}
        <AgentHeader agent={agent} className="mb-8" isFundManager={isFundManager} />

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column: Charts, Metrics, History & Delegation */}
          <div className="lg:col-span-2 space-y-8">
            {/* Performance Chart + Metrics Row - Hide for Fund Manager */}
            {!isFundManager && (
              <div className="grid md:grid-cols-2 gap-6">
                <SectionErrorBoundary sectionName="Daily Chart">
                  <DailyChart dailyStats={dailyStats || []} />
                </SectionErrorBoundary>
                <SectionErrorBoundary sectionName="Performance Metrics">
                  <PerformanceMetrics agent={agent} />
                </SectionErrorBoundary>
              </div>
            )}

            {/* For Fund Manager: Show Delegators AND A2A Redelegations */}
            {isFundManager ? (
              <div className="space-y-6">
                {/* Users who delegated to the Fund Manager */}
                <SectionErrorBoundary sectionName="Delegators">
                  <Delegators agentId={id} />
                </SectionErrorBoundary>

                {/* A2A: How Fund Manager allocates to specialists */}
                <div className="grid md:grid-cols-2 gap-6">
                  <SectionErrorBoundary sectionName="Delegation Tree">
                    <DelegationTree agentId={id} />
                  </SectionErrorBoundary>
                  <SectionErrorBoundary sectionName="Redelegation Stats">
                    <RedelegationStats agentId={id} />
                  </SectionErrorBoundary>
                </div>
              </div>
            ) : (
              /* For other agents: A2A Section Row */
              <div className="grid md:grid-cols-2 gap-6">
                <SectionErrorBoundary sectionName="Delegation Tree">
                  <DelegationTree agentId={id} />
                </SectionErrorBoundary>
                <SectionErrorBoundary sectionName="Redelegation Stats">
                  <RedelegationStats agentId={id} />
                </SectionErrorBoundary>
              </div>
            )}

            {/* Execution History - Hide for Fund Manager */}
            {!isFundManager && (
              <SectionErrorBoundary sectionName="Execution History">
                <ExecutionHistory
                  executions={executions || []}
                  agentId={id}
                  totalCount={parseInt(agent.totalExecutions) || 0}
                />
              </SectionErrorBoundary>
            )}
          </div>

          {/* Right Column: Permission Granting Only */}
          <div className="space-y-8">
            {/* Standard Permission Grant Card */}
            <SectionErrorBoundary sectionName="Permission Grant">
              <GrantPermission agent={agent} />
            </SectionErrorBoundary>

            {/* Reputation-Gated Permission (Dynamic Scaling) */}
            <SectionErrorBoundary sectionName="Reputation-Gated Permission">
              <ReputationGatedPermission
                agentAddress={agent.walletAddress}
                agentName={agent.name}
                agentId={id}
                currentScore={agent.reputationScore}
                tokenSymbol="USDC"
                decimals={6}
              />
            </SectionErrorBoundary>
          </div>
        </div>
      </div>
    </div>
  );
}
