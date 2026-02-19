import { PageContainer } from "@/components/layout/page-container";
import { SkeletonCard } from "@/components/skeleton-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function BookmarksLoading() {
  return (
    <PageContainer maxWidth="feed">
      <Skeleton className="h-8 w-40 mb-2" />
      <Skeleton className="h-4 w-48 mb-6" />
      <div className="flex gap-2 mb-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-24 rounded-md" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} variant="feed" />
        ))}
      </div>
    </PageContainer>
  );
}
