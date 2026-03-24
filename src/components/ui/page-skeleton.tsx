import { Skeleton } from "~/components/ui/skeleton";

export function PageSkeleton() {
  return (
    <div className="p-6 space-y-6" role="status" aria-label="Loading page">
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
