export default function PageLoading({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-[#0f0f1a] border border-[#1e1e35] rounded-xl p-5">
            <div className="h-3 bg-[#1e1e35] rounded w-1/2 mb-3" />
            <div className="h-7 bg-[#1e1e35] rounded w-2/3 mb-2" />
            <div className="h-2 bg-[#1e1e35] rounded w-1/3" />
          </div>
        ))}
      </div>
      {/* Table/list skeleton */}
      <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-xl p-5 space-y-3">
        <div className="h-4 bg-[#1e1e35] rounded w-1/4 mb-4" />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 items-center">
            <div className="w-8 h-8 bg-[#1e1e35] rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-[#1e1e35] rounded w-3/4" />
              <div className="h-2 bg-[#1e1e35] rounded w-1/2" />
            </div>
            <div className="h-6 bg-[#1e1e35] rounded w-16 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
