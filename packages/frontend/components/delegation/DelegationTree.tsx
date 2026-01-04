"use client";

/**
 * DelegationTree Component
 *
 * Visualizes the A2A (Agent-to-Agent) delegation hierarchy using react-d3-tree.
 * Shows parent-child relationships with reputation score-based coloring.
 */

import { useCallback, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useDelegationTree, getScoreColorHex } from "@/hooks/useDelegation";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn, formatAmount } from "@/lib/utils";
import { GitBranch, Users, AlertCircle } from "lucide-react";

// Dynamically import react-d3-tree to avoid SSR issues
const Tree = dynamic(() => import("react-d3-tree").then((mod) => mod.default), {
  ssr: false,
  loading: () => <Skeleton className="h-[400px] w-full" />,
});

// ===========================================
// Types
// ===========================================

interface DelegationTreeProps {
  /** The root agent ID for the tree */
  agentId: string;
  /** Additional CSS classes */
  className?: string;
  /** Tree height in pixels */
  height?: number;
  /** Show legend */
  showLegend?: boolean;
}

interface CustomNodeProps {
  nodeDatum: {
    name: string;
    attributes?: {
      id: string;
      score: number;
      amount?: string;
      strategyType?: string;
    };
    children?: any[];
  };
}

// ===========================================
// DelegationTree Component
// ===========================================

export function DelegationTree({
  agentId,
  className,
  height = 400,
  showLegend = true,
}: DelegationTreeProps) {
  const { treeData, loading, error, hasChildren } = useDelegationTree(agentId);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });

  // Center the tree on container mount
  const containerRef = useCallback((containerElem: HTMLDivElement | null) => {
    if (containerElem !== null) {
      const { width } = containerElem.getBoundingClientRect();
      setTranslate({ x: width / 2, y: 60 });
    }
  }, []);

  // Custom node renderer (dark theme compatible)
  const renderCustomNode = useCallback(({ nodeDatum }: CustomNodeProps) => {
    const score = nodeDatum.attributes?.score ?? 50;
    const fillColor = getScoreColorHex(score);
    const hasAmount = nodeDatum.attributes?.amount;

    return (
      <g>
        {/* Main circle */}
        <circle
          r={28}
          fill={fillColor}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={2}
          className="cursor-pointer transition-all hover:stroke-[3px]"
        />

        {/* Score text inside circle */}
        <text
          dy="0.31em"
          textAnchor="middle"
          style={{
            fontSize: "12px",
            fontWeight: "bold",
            fill: "#fff",
            pointerEvents: "none",
          }}
        >
          {score}
        </text>

        {/* Agent name above */}
        <text
          dy="-2.8em"
          textAnchor="middle"
          style={{
            fontSize: "13px",
            fontWeight: "600",
            fill: "#e2e8f0", // slate-200 for dark theme
          }}
        >
          {nodeDatum.name.length > 15
            ? `${nodeDatum.name.slice(0, 15)}...`
            : nodeDatum.name}
        </text>

        {/* Strategy type below */}
        {nodeDatum.attributes?.strategyType && (
          <text
            dy="3.8em"
            textAnchor="middle"
            style={{
              fontSize: "10px",
              fill: "#94a3b8", // slate-400 for dark theme
            }}
          >
            {nodeDatum.attributes.strategyType}
          </text>
        )}

        {/* Delegated amount */}
        {hasAmount && (
          <text
            dy="5.2em"
            textAnchor="middle"
            style={{
              fontSize: "10px",
              fontWeight: "500",
              fill: "#34d399", // emerald-400 for dark theme
            }}
          >
            {formatAmount(nodeDatum.attributes!.amount)} USDC
          </text>
        )}
      </g>
    );
  }, []);

  // Tree configuration (dark theme)
  const treeConfig = useMemo(
    () => ({
      orientation: "vertical" as const,
      pathFunc: "step" as const,
      translate,
      nodeSize: { x: 180, y: 140 },
      separation: { siblings: 1.2, nonSiblings: 1.5 },
      depthFactor: 140,
      collapsible: false,
      zoomable: true,
      draggable: true,
      pathClassFunc: () => "stroke-slate-600 stroke-2 fill-none",
    }),
    [translate]
  );

  // Loading state
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-violet-400" />
            A2A Delegation Tree
          </CardTitle>
        </CardHeader>
        <Skeleton className="h-[400px] w-full rounded-lg" />
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-violet-400" />
            A2A Delegation Tree
          </CardTitle>
        </CardHeader>
        <div className="flex flex-col items-center justify-center h-[200px] text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
          <p className="text-red-300 font-medium">Error loading delegation tree</p>
          <p className="text-sm text-slate-400 mt-1">{error.message}</p>
        </div>
      </Card>
    );
  }

  // Empty state (no children)
  if (!treeData || !hasChildren) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-violet-400" />
            A2A Delegation Tree
          </CardTitle>
        </CardHeader>
        <div className="flex flex-col items-center justify-center h-[200px] text-center">
          <Users className="h-10 w-10 text-slate-400 mb-3" />
          <p className="text-slate-200 font-medium">No Active Redelegations</p>
          <p className="text-sm text-slate-400 mt-1">
            This agent has not delegated to any specialist agents
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)} padding="none">
      <CardHeader className="px-6 pt-6">
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-violet-400" />
          A2A Delegation Tree
        </CardTitle>
      </CardHeader>

      {/* Tree Container - dark theme background */}
      <div
        ref={containerRef}
        style={{ width: "100%", height: `${height}px` }}
        className="bg-dark-900/50"
      >
        <Tree
          data={treeData}
          {...treeConfig}
          renderCustomNodeElement={(rd3tProps) =>
            renderCustomNode(rd3tProps as unknown as CustomNodeProps)
          }
        />
      </div>

      {/* Legend - dark theme */}
      {showLegend && (
        <div className="px-6 py-4 border-t border-white/[0.06] bg-white/[0.02]">
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-emerald-500" />
              <span className="text-slate-400">Score 80+</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-yellow-500" />
              <span className="text-slate-400">Score 60-79</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500" />
              <span className="text-slate-400">Score &lt;60</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

// ===========================================
// Compact DelegationTree (for smaller spaces)
// ===========================================

interface CompactDelegationTreeProps {
  agentId: string;
  className?: string;
}

export function CompactDelegationTree({ agentId, className }: CompactDelegationTreeProps) {
  const { treeData, loading, hasChildren } = useDelegationTree(agentId);

  if (loading) {
    return <Skeleton className={cn("h-20 w-full", className)} />;
  }

  if (!hasChildren || !treeData) {
    return (
      <div className={cn("text-sm text-slate-400 italic", className)}>
        No active redelegations
      </div>
    );
  }

  const childCount = treeData.children?.length ?? 0;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex items-center gap-2 text-sm">
        <GitBranch className="h-4 w-4 text-violet-400" />
        <span className="font-medium text-slate-300">
          {childCount} Specialist{childCount !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="flex -space-x-2">
        {treeData.children?.slice(0, 4).map((child, index) => (
          <Link
            key={child.attributes?.id || index}
            href={`/agents/${child.attributes?.id}`}
            className="relative"
            title={child.name}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-dark-800 hover:z-10 hover:scale-110 transition-transform"
              style={{ backgroundColor: getScoreColorHex(child.attributes?.score ?? 50) }}
            >
              {child.attributes?.score ?? "?"}
            </div>
          </Link>
        ))}
        {childCount > 4 && (
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-slate-400 bg-dark-700 border-2 border-dark-800">
            +{childCount - 4}
          </div>
        )}
      </div>
    </div>
  );
}
