"use client";

import { useState, useMemo, useEffect } from "react";
import { useAccount } from "wagmi";
import { Wallet, Shield, Activity, TrendingUp, GitBranch, Compass, LayoutDashboard, Zap } from "lucide-react";
import { cn, truncateAddress } from "@/lib/utils";
import { useUserDashboard } from "@/hooks/useUser";
import { useWalletPermissions } from "@/hooks/useWalletPermissions";
import { UserStats, PerformanceChart } from "@/components/dashboard";
import { PermissionList } from "@/components/permissions";
import { RedelegationList, DelegationFlow, UserDelegationTree } from "@/components/delegation";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { SkeletonDashboard } from "@/components/ui/Skeleton";
import { ConnectPrompt } from "@/components/ui/ConnectPrompt";
import { ErrorState } from "@/components/ui/ErrorState";
import { SectionErrorBoundary } from "@/components/ui/ErrorBoundary";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";

// Tab types
type DashboardTab = "overview" | "permissions" | "activity" | "delegations";

// ===========================================
// Dashboard Page
// ===========================================

export default function DashboardPage() {
  const { isConnected, address } = useAccount();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by waiting for client-side mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Show loading skeleton until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <SkeletonDashboard />
        </div>
      </div>
    );
  }

  // Not connected state
  if (!isConnected) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <ConnectPrompt
            message="Connect your wallet to view your permissions, activity, and performance metrics."
            showBenefits={true}
          />
        </div>
      </div>
    );
  }

  return <DashboardContent address={address!} />;
}

// ===========================================
// Dashboard Content Component
// ===========================================

interface DashboardContentProps {
  address: string;
}

function DashboardContent({ address }: DashboardContentProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [showDelegationFlow, setShowDelegationFlow] = useState(false);
  const { user, permissions: indexedPermissions, executions, loading, error, refetch } =
    useUserDashboard(address);

  // Also fetch permissions directly from MetaMask Flask
  const { permissions: walletPermissions, loading: walletLoading } = useWalletPermissions();

  // Use indexed permissions as the source of truth (they have accurate amounts and agent links)
  // Wallet permissions from localStorage can have stale data
  const permissions = useMemo(() => {
    // If we have indexed permissions, use them exclusively (they're authoritative)
    if (indexedPermissions && indexedPermissions.length > 0) {
      return indexedPermissions;
    }
    // Fall back to wallet permissions only if no indexed data available
    return walletPermissions || [];
  }, [indexedPermissions, walletPermissions]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <DashboardHeader address={address} />
          <SkeletonDashboard className="mt-8" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <DashboardHeader address={address} />
          <ErrorState
            error={error}
            title="Failed to load dashboard"
            description={error.message || "Unable to fetch your data. Please try again."}
            onRetry={() => window.location.reload()}
            className="mt-8"
          />
        </div>
      </div>
    );
  }

  // Tab configuration - show tabs even for new users
  const tabs = [
    { id: "overview" as const, label: "Overview", icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: "permissions" as const, label: "Permissions", icon: <Shield className="w-4 h-4" />, count: permissions?.filter(p => p.isActive).length },
    { id: "activity" as const, label: "Activity", icon: <Activity className="w-4 h-4" />, count: executions?.length },
    { id: "delegations" as const, label: "Delegations", icon: <GitBranch className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header with Start Earning CTA */}
        <DashboardHeader
          address={address}
          onStartEarning={() => setShowDelegationFlow(true)}
        />

        {/* Stats - Show if user data exists */}
        {user && <UserStats user={user} className="mt-8" />}

        {/* Delegation Flow Modal */}
        <DelegationFlow
          isModal
          isOpen={showDelegationFlow}
          onClose={() => setShowDelegationFlow(false)}
          onComplete={() => setShowDelegationFlow(false)}
        />

        {/* Tab Navigation */}
        <div className="mt-8 border-b border-white/[0.06]">
          <nav className="flex gap-1 -mb-px overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  activeTab === tab.id
                    ? "border-primary-400 text-primary-300"
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600"
                )}
              >
                {tab.icon}
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={cn(
                    "px-2 py-0.5 text-xs rounded-full",
                    activeTab === tab.id
                      ? "bg-primary-400/20 text-primary-300"
                      : "bg-slate-700 text-slate-400"
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mt-8">
          {activeTab === "overview" && (
            <div className="space-y-8">
              {/* Show onboarding message if no user data yet */}
              {!user && (
                <Card variant="glass" className="text-center py-8">
                  <div className="max-w-md mx-auto">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-500/20 to-primary-600/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <Zap className="w-6 h-6 text-primary-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-100 mb-2">
                      Start Earning with AI Agents
                    </h3>
                    <p className="text-slate-400 text-sm mb-4">
                      Delegate to our managed portfolio or choose a specific agent.
                      Your funds stay in your wallet - agents only get spending permission.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => setShowDelegationFlow(true)}
                      leftIcon={<Zap className="w-4 h-4" />}
                    >
                      Start Earning
                    </Button>
                  </div>
                </Card>
              )}

              {/* Delegation Flow Visualization - Show when user has permissions */}
              {permissions && permissions.filter(p => p.isActive).length > 0 && (
                <SectionErrorBoundary sectionName="Delegation Tree">
                  <UserDelegationTree permissions={permissions} />
                </SectionErrorBoundary>
              )}

              {/* Performance Chart - only if we have data */}
              {executions && executions.length > 0 && (
                <SectionErrorBoundary sectionName="Performance Chart">
                  <PerformanceChart executions={executions} />
                </SectionErrorBoundary>
              )}

              {/* Quick overview grid */}
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Permissions Preview */}
                <SectionErrorBoundary sectionName="Permissions">
                  <PermissionList
                    permissions={(permissions || []).slice(0, 3)}
                    onPermissionRevoked={() => refetch()}
                  />
                </SectionErrorBoundary>

                {/* Activity Preview */}
                <SectionErrorBoundary sectionName="Activity Feed">
                  <ActivityFeed executions={(executions || []).slice(0, 5)} />
                </SectionErrorBoundary>
              </div>

              {/* Quick Actions */}
              <QuickActions />
            </div>
          )}

          {activeTab === "permissions" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-100">Your Permissions</h2>
                  <p className="text-slate-400 text-sm mt-1">
                    Manage your delegated permissions to AI agents
                  </p>
                </div>
                <a href="/">
                  <Button size="sm" leftIcon={<Compass className="w-4 h-4" />}>
                    Find Agents
                  </Button>
                </a>
              </div>
              <SectionErrorBoundary sectionName="Permission List">
                <PermissionList
                  permissions={permissions || []}
                  onPermissionRevoked={() => refetch()}
                />
              </SectionErrorBoundary>
            </div>
          )}

          {activeTab === "activity" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-100">Activity History</h2>
                <p className="text-slate-400 text-sm mt-1">
                  All executions performed by your delegated agents
                </p>
              </div>
              <SectionErrorBoundary sectionName="Performance Chart">
                <PerformanceChart executions={executions || []} />
              </SectionErrorBoundary>
              <SectionErrorBoundary sectionName="Activity Feed">
                <ActivityFeed executions={executions || []} limit={50} showViewAll={false} />
              </SectionErrorBoundary>
            </div>
          )}

          {activeTab === "delegations" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-100">Your Delegation Flow</h2>
                <p className="text-slate-400 text-sm mt-1">
                  See how your funds flow through the A2A delegation hierarchy
                </p>
              </div>

              {/* User's Delegation Tree */}
              <SectionErrorBoundary sectionName="Delegation Tree">
                <UserDelegationTree permissions={permissions} />
              </SectionErrorBoundary>

              {/* Detailed Redelegation List */}
              <div className="mt-8">
                <h3 className="text-lg font-medium text-slate-200 mb-4">
                  Detailed A2A Redelegations
                </h3>
                <SectionErrorBoundary sectionName="Redelegation List">
                  <RedelegationList userId={address} />
                </SectionErrorBoundary>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===========================================
// Dashboard Header Component
// ===========================================

interface DashboardHeaderProps {
  address: string;
  className?: string;
  onStartEarning?: () => void;
}

function DashboardHeader({ address, className, onStartEarning }: DashboardHeaderProps) {
  return (
    <div className={cn("flex flex-col md:flex-row md:items-center justify-between gap-4", className)}>
      <div>
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight">My Dashboard</h1>
        <p className="text-slate-400 mt-1 flex items-center gap-2">
          <Wallet className="w-4 h-4" />
          <span className="font-mono text-sm">{truncateAddress(address)}</span>
        </p>
      </div>
      <div className="flex items-center gap-3">
        <a href="/">
          <Button variant="outline" size="sm" leftIcon={<Compass className="w-4 h-4" />}>
            Explore Agents
          </Button>
        </a>
        <Button
          size="sm"
          onClick={onStartEarning}
          leftIcon={<Zap className="w-4 h-4" />}
          className="bg-gradient-to-r from-primary-400 to-primary-500 hover:from-primary-300 hover:to-primary-400"
        >
          Start Earning
        </Button>
      </div>
    </div>
  );
}

// ===========================================
// New User Onboarding Component
// ===========================================

interface NewUserOnboardingProps {
  className?: string;
}

function NewUserOnboarding({ className }: NewUserOnboardingProps) {
  return (
    <Card className={cn("text-center py-12", className)} variant="glass">
      <div className="max-w-md mx-auto">
        <div className="w-16 h-16 bg-gradient-to-br from-primary-500/20 to-primary-600/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Shield className="w-8 h-8 text-primary-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-100 mb-3">
          Welcome to Echelon!
        </h2>
        <p className="text-slate-400 mb-6">
          You haven't delegated to any AI agents yet. Explore our leaderboard to
          find top-performing agents and grant your first permission.
        </p>
        <a href="/">
          <Button>
            Explore Top Agents
          </Button>
        </a>
      </div>
    </Card>
  );
}

// ===========================================
// Quick Actions Component
// ===========================================

interface QuickActionsProps {
  className?: string;
}

function QuickActions({ className }: QuickActionsProps) {
  const actions = [
    {
      icon: <TrendingUp className="w-5 h-5" />,
      title: "Find Top Agents",
      description: "Explore agents ranked by performance and reputation",
      href: "/",
      gradient: "bg-gradient-to-br from-blue-500/20 to-blue-600/10",
      iconColor: "text-blue-400",
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: "Manage Permissions",
      description: "Review and revoke your active permissions",
      href: "/dashboard",
      gradient: "bg-gradient-to-br from-purple-500/20 to-purple-600/10",
      iconColor: "text-purple-400",
    },
    {
      icon: <GitBranch className="w-5 h-5" />,
      title: "A2A Delegations",
      description: "View agent-to-agent delegation hierarchy",
      href: "/dashboard",
      gradient: "bg-gradient-to-br from-amber-500/20 to-amber-600/10",
      iconColor: "text-amber-400",
    },
    {
      icon: <Activity className="w-5 h-5" />,
      title: "View Activity",
      description: "Track all executions across your delegated agents",
      href: "/dashboard",
      gradient: "bg-gradient-to-br from-emerald-500/20 to-emerald-600/10",
      iconColor: "text-emerald-400",
    },
  ];

  return (
    <Card className={className} variant="glass">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((action) => (
          <a
            key={action.title}
            href={action.href}
            className="flex items-start gap-4 p-4 bg-white/[0.02] rounded-xl hover:bg-white/[0.05] border border-transparent hover:border-white/[0.06] transition-all duration-200"
          >
            <div className={cn("p-2.5 rounded-xl", action.gradient, action.iconColor)}>
              {action.icon}
            </div>
            <div>
              <p className="font-medium text-slate-100">{action.title}</p>
              <p className="text-sm text-slate-500 mt-0.5">
                {action.description}
              </p>
            </div>
          </a>
        ))}
      </div>
    </Card>
  );
}
