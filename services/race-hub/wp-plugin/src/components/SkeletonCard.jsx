export default function SkeletonCard() {
  return (
    <div className="bg-surface border border-border flex flex-col">
      <div className="aspect-video w-full skeleton-shimmer" />
      <div className="p-6 flex flex-col gap-4">
        <div className="space-y-2">
          <div className="h-5 w-3/4 skeleton-shimmer" />
          <div className="h-5 w-1/2 skeleton-shimmer" />
        </div>
        <div className="h-3 w-1/3 skeleton-shimmer" />
        <div className="h-6 w-20 skeleton-shimmer" />
      </div>
    </div>
  )
}
