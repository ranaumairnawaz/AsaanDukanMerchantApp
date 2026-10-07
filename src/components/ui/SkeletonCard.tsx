export default function SkeletonCard() {
  return (
    <div className="bg-bg-card border border-border-card/60 rounded-2xl p-5 w-full h-full flex flex-col gap-3 overflow-hidden relative">
      <div className="skeleton h-8 w-8 rounded-xl" />
      <div className="skeleton h-3 rounded-md w-1/2" />
      <div className="skeleton h-6 rounded-md w-2/3 mt-1" />
      <div className="skeleton h-2.5 rounded-md w-3/4 mt-auto" />
    </div>
  );
}

export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2.5 w-full">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="bg-bg-card border border-border-card/60 rounded-xl p-3 flex items-center gap-3 overflow-hidden"
          style={{ animationDelay: `${i * 0.06}s` }}
        >
          <div className="skeleton w-10 h-10 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3 rounded-md w-1/2" />
            <div className="skeleton h-2 rounded-md w-1/3" />
          </div>
          <div className="skeleton w-14 h-5 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton h-3 rounded-md"
          style={{ width: `${90 - i * 15}%` }}
        />
      ))}
    </div>
  );
}
