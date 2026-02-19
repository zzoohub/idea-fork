import { Skeleton } from "@/shared/ui/skeleton";

interface SkeletonCardProps {
  variant?: "feed" | "brief";
}

export function SkeletonCard({ variant = "feed" }: SkeletonCardProps) {
  if (variant === "brief") {
    return (
      <div className="rounded-lg border p-4 space-y-3" role="status" aria-busy="true">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-2 w-32" />
        </div>
        <span className="sr-only">Loading brief card…</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-l-4 border-l-muted p-4 space-y-3" role="status" aria-busy="true">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-3 w-12" />
      </div>
      <span className="sr-only">Loading feed card…</span>
    </div>
  );
}
