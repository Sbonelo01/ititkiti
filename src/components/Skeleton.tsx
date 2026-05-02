export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gray-200/90 rounded-md ${className}`}
      aria-hidden
    />
  );
}

export function SkeletonOnGreen({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-white/20 rounded-md ${className}`}
      aria-hidden
    />
  );
}
