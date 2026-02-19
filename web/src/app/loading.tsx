import { PageContainer } from "@/components/layout/page-container";
import { SkeletonCard } from "@/components/skeleton-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function FeedLoading() {
  return (
    <PageContainer>
      <div className="flex gap-8">
        <div className="flex-1 min-w-0 max-w-[720px]">
          <Skeleton className="h-4 w-32 mb-4" />
          <div className="flex gap-2 mb-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-24 rounded-full" />
            ))}
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCard key={i} variant="feed" />
            ))}
          </div>
        </div>
        <div className="hidden lg:block w-64 shrink-0">
          <Skeleton className="h-4 w-20 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
