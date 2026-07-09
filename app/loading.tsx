import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mt-4 grid min-w-0 gap-0 overflow-hidden rounded-[18px] border border-command-border bg-command-surface shadow-[0_18px_48px_rgba(16,24,40,0.08)]">
      <div className="grid grid-cols-[minmax(0,1fr)_232px] items-start gap-6 border-b border-command-border p-5 max-[1040px]:grid-cols-1">
        <div className="grid gap-2">
          <Skeleton className="h-2.5 w-32" />
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-full max-w-[420px]" />
        </div>
        <Skeleton className="h-[38px] w-full rounded-[10px]" />
      </div>

      <div className="grid grid-cols-4 gap-px border-b border-command-border bg-command-border max-[620px]:grid-cols-1">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="grid min-h-[64px] gap-1.5 bg-command-surface px-4 py-3" key={index}>
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-4 w-10" />
          </div>
        ))}
      </div>

      <div className="grid gap-2.5 p-4">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton className="h-11 w-full rounded-[10px]" key={index} />
        ))}
      </div>
    </div>
  );
}
