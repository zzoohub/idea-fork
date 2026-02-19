import { PageContainer } from "@/shared/ui/page-container";
import { SkeletonCard } from "@/shared/ui/skeleton-card";
import { Skeleton } from "@/shared/ui/skeleton";

export default function BriefsLoading() {
  return (
    <PageContainer maxWidth="feed">
      <div className="mb-6">
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} variant="brief" />
        ))}
      </div>
    </PageContainer>
  );
}
