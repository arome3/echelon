import { SkeletonLeaderboard } from "@/components/ui/Skeleton";

// ===========================================
// Global Loading Component
// ===========================================

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header Skeleton */}
        <div className="animate-pulse mb-8">
          <div className="h-8 w-48 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-64 bg-gray-200 rounded" />
        </div>

        {/* Content Skeleton */}
        <SkeletonLeaderboard count={5} />
      </div>
    </div>
  );
}
