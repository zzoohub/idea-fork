import { PageContainer } from "@/shared/ui/page-container";
import { Skeleton } from "@/shared/ui/skeleton";

export default function TrackingLoading() {
  return (
    <PageContainer maxWidth="feed">
      <Skeleton className="h-8 w-28 mb-2" />
      <Skeleton className="h-4 w-64 mb-6" />
      <div className="rounded-lg border p-6 mb-6 space-y-4">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-11 w-full rounded-md" />
      </div>
      <div className="rounded-lg border p-6 space-y-3">
        <Skeleton className="h-4 w-28" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    </PageContainer>
  );
}
