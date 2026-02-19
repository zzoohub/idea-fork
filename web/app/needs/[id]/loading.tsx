import { PageContainer } from "@/shared/ui/page-container";
import { Skeleton } from "@/shared/ui/skeleton";

export default function NeedDetailLoading() {
  return (
    <PageContainer maxWidth="feed">
      <Skeleton className="h-4 w-20 mb-4" />
      <Skeleton className="h-8 w-3/4 mb-2" />
      <Skeleton className="h-5 w-20 rounded-full mb-6" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="rounded-lg border p-4 space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="rounded-lg border p-4 space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      </div>

      <div className="rounded-lg border p-6 space-y-3">
        <Skeleton className="h-4 w-32" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-4 w-4 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
