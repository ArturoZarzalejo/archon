import { Skeleton } from '@/components/ui/skeleton';

export default function AgentLoading() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="flex flex-col gap-5">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    </div>
  );
}
