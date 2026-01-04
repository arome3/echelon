import { SkeletonAgentDetail } from "@/components/ui/Skeleton";

// ===========================================
// Agent Detail Loading Component
// ===========================================

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <SkeletonAgentDetail />
      </div>
    </div>
  );
}
