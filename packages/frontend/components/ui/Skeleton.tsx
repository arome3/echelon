"use client";

import { cn } from "@/lib/utils";

// ===========================================
// Skeleton Component
// ===========================================

interface SkeletonProps {
  className?: string;
  /** Use shimmer animation */
  shimmer?: boolean;
  /** Inline styles for dynamic sizing */
  style?: React.CSSProperties;
}

export function Skeleton({ className, shimmer = true, style }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-md bg-gray-200",
        shimmer && "animate-pulse",
        className
      )}
      style={style}
    />
  );
}

// ===========================================
// Skeleton Text Component
// ===========================================

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4",
            i === lines - 1 ? "w-4/5" : "w-full"
          )}
        />
      ))}
    </div>
  );
}

// ===========================================
// Skeleton Card Component
// ===========================================

interface SkeletonCardProps {
  className?: string;
  showAvatar?: boolean;
  showActions?: boolean;
}

export function SkeletonCard({ className, showAvatar = false, showActions = true }: SkeletonCardProps) {
  return (
    <div className={cn("bg-white rounded-xl shadow-sm border border-gray-100 p-6", className)}>
      <div className="flex items-start gap-4">
        {showAvatar && <Skeleton className="h-12 w-12 rounded-full shrink-0" />}
        <div className="flex-1 space-y-3">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
      {showActions && (
        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
      )}
    </div>
  );
}

// ===========================================
// Skeleton Agent Card Component
// ===========================================

export function SkeletonAgentCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between p-4 border rounded-lg bg-white",
        className
      )}
    >
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-14 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-8">
        <div className="text-right space-y-2">
          <Skeleton className="h-5 w-12 ml-auto" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="text-right space-y-2">
          <Skeleton className="h-5 w-16 ml-auto" />
          <Skeleton className="h-4 w-12" />
        </div>
        <div className="text-right space-y-2">
          <Skeleton className="h-6 w-10 ml-auto" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>
    </div>
  );
}

// ===========================================
// Skeleton Leaderboard Component
// ===========================================

interface SkeletonLeaderboardProps {
  count?: number;
  className?: string;
}

export function SkeletonLeaderboard({ count = 5, className }: SkeletonLeaderboardProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonAgentCard key={i} />
      ))}
    </div>
  );
}

// ===========================================
// Skeleton Stats Bar Component
// ===========================================

export function SkeletonStatsBar({ className }: { className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-4", className)}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg p-4 shadow-sm flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ===========================================
// Skeleton Table Component
// ===========================================

interface SkeletonTableProps {
  rows?: number;
  cols?: number;
  className?: string;
}

export function SkeletonTable({ rows = 5, cols = 4, className }: SkeletonTableProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex gap-4 pb-3 border-b border-gray-100">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 py-2">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-5 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ===========================================
// Skeleton Chart Component
// ===========================================

export function SkeletonChart({ className }: { className?: string }) {
  return (
    <div className={cn("bg-white rounded-xl p-6", className)}>
      <Skeleton className="h-6 w-40 mb-4" />
      <div className="flex items-end gap-2 h-48">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t"
            style={{ height: `${Math.random() * 80 + 20}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// ===========================================
// Skeleton Agent Detail Component
// ===========================================

export function SkeletonAgentDetail({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-8", className)}>
      {/* Header Skeleton */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <Skeleton className="h-4 w-32 mb-4" />
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <Skeleton className="w-16 h-16 rounded-xl" />
            <div className="space-y-3">
              <Skeleton className="h-7 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-4">
                <Skeleton className="h-8 w-16 mx-auto" />
                <Skeleton className="h-4 w-12 mx-auto mt-2" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">
          <SkeletonChart />
          <div className="bg-white rounded-xl p-6">
            <Skeleton className="h-6 w-40 mb-4" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          <div className="bg-white rounded-xl p-6">
            <Skeleton className="h-6 w-36 mb-4" />
            <div className="space-y-4">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-6">
            <Skeleton className="h-6 w-40 mb-4" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-4 bg-gray-50 rounded-lg mb-3 last:mb-0">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-6 w-32" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===========================================
// Skeleton Dashboard Component
// ===========================================

export function SkeletonDashboard({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-8", className)}>
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-6">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-28" />
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Permissions */}
        <div className="bg-white rounded-xl p-6">
          <Skeleton className="h-6 w-36 mb-4" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
              <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
          ))}
        </div>

        {/* Activity */}
        <div className="bg-white rounded-xl p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 border-b border-gray-100 last:border-0">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
