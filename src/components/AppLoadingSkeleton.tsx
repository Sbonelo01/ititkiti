import { Skeleton, SkeletonOnGreen } from "@/components/Skeleton";

function EventCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
      <Skeleton className="h-48 w-full rounded-none rounded-t-2xl" />
      <div className="p-6 space-y-3">
        <Skeleton className="h-6 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="space-y-2 pt-2">
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-3/5" />
        </div>
        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-10 w-28 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

function SearchFiltersSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row gap-6 mb-8">
      <Skeleton className="h-14 flex-1 rounded-xl" />
      <Skeleton className="h-14 w-full sm:w-48 rounded-xl" />
    </div>
  );
}

function BrowseSectionSkeleton() {
  return (
    <main className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <Skeleton className="h-10 w-64 mx-auto mb-4 rounded-lg" />
        <Skeleton className="h-5 w-96 max-w-full mx-auto rounded-lg" />
      </div>
      <SearchFiltersSkeleton />
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <EventCardSkeleton key={i} />
        ))}
      </div>
    </main>
  );
}

/** Login / auth layout while Suspense resolves */
export function AuthPageSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Skeleton className="h-14 w-14 rounded-2xl" />
        </div>
        <Skeleton className="h-8 w-48 mx-auto rounded-lg" />
        <Skeleton className="h-4 w-64 mx-auto rounded-lg" />
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-4 border border-gray-100">
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-4 w-3/4 mx-auto rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/** Next.js `app/loading.tsx` — generic page shape while routes resolve */
export function RouteLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      <section className="relative bg-gradient-to-br from-green-600 via-green-700 to-green-800 py-16 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex justify-center mb-8">
            <SkeletonOnGreen className="h-9 w-72 rounded-full" />
          </div>
          <div className="space-y-4 max-w-3xl mx-auto mb-10">
            <SkeletonOnGreen className="h-14 w-full max-w-lg mx-auto rounded-xl" />
            <SkeletonOnGreen className="h-12 w-full max-w-md mx-auto rounded-xl" />
            <SkeletonOnGreen className="h-6 w-full max-w-2xl mx-auto rounded-lg" />
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <SkeletonOnGreen className="h-14 w-full sm:w-48 rounded-xl mx-auto sm:mx-0" />
            <SkeletonOnGreen className="h-14 w-full sm:w-48 rounded-xl mx-auto sm:mx-0" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="text-center space-y-2">
                <SkeletonOnGreen className="h-10 w-20 mx-auto rounded-lg" />
                <SkeletonOnGreen className="h-5 w-32 mx-auto rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 space-y-3">
            <Skeleton className="h-10 w-80 max-w-full mx-auto rounded-lg" />
            <Skeleton className="h-5 w-[28rem] max-w-full mx-auto rounded-lg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-gradient-to-br from-green-50 to-white p-8 rounded-2xl shadow-lg space-y-4">
                <Skeleton className="h-16 w-16 rounded-2xl" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            ))}
          </div>
        </div>
      </section>
      <BrowseSectionSkeleton />
    </div>
  );
}

/** Home page while Supabase events are loading */
export function HomePageSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      <section className="relative bg-gradient-to-br from-green-600 via-green-700 to-green-800 py-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="flex justify-center mb-6">
            <SkeletonOnGreen className="h-9 w-80 rounded-full" />
          </div>
          <div className="space-y-4 mb-8">
            <SkeletonOnGreen className="h-16 md:h-20 w-full max-w-xl mx-auto rounded-xl" />
            <SkeletonOnGreen className="h-16 md:h-20 w-full max-w-lg mx-auto rounded-xl" />
          </div>
          <SkeletonOnGreen className="h-7 w-full max-w-2xl mx-auto rounded-lg mb-10" />
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <SkeletonOnGreen className="h-14 w-full sm:w-52 rounded-xl" />
            <SkeletonOnGreen className="h-14 w-full sm:w-52 rounded-xl" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <SkeletonOnGreen className="h-11 w-24 mx-auto rounded-lg" />
                <SkeletonOnGreen className="h-5 w-36 mx-auto rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 space-y-3">
            <Skeleton className="h-11 w-96 max-w-full mx-auto rounded-lg" />
            <Skeleton className="h-6 w-[32rem] max-w-full mx-auto rounded-lg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-gradient-to-br from-green-50 to-white p-8 rounded-2xl shadow-lg space-y-4">
                <Skeleton className="h-16 w-16 rounded-2xl" />
                <Skeleton className="h-7 w-4/5" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-green-600 via-green-700 to-green-800 py-16 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 space-y-3 relative z-10">
            <SkeletonOnGreen className="h-12 w-80 max-w-full mx-auto rounded-lg" />
            <SkeletonOnGreen className="h-6 w-96 max-w-full mx-auto rounded-lg" />
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-8 mx-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <SkeletonOnGreen className="h-10 w-3/4 rounded-lg" />
                <SkeletonOnGreen className="h-4 w-full rounded-lg" />
                <SkeletonOnGreen className="h-4 w-full rounded-lg" />
                <SkeletonOnGreen className="h-4 w-2/3 rounded-lg" />
                <div className="space-y-2 pt-4">
                  <SkeletonOnGreen className="h-4 w-4/5 rounded-lg" />
                  <SkeletonOnGreen className="h-4 w-3/5 rounded-lg" />
                </div>
              </div>
              <SkeletonOnGreen className="h-56 w-full rounded-2xl lg:min-h-[14rem]" />
            </div>
          </div>
          <div className="flex justify-center mt-8 gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonOnGreen key={i} className="h-4 w-4 rounded-full" />
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 space-y-3">
            <Skeleton className="h-10 w-80 max-w-full mx-auto rounded-lg" />
            <Skeleton className="h-6 w-[28rem] max-w-full mx-auto rounded-lg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white p-8 rounded-2xl shadow-lg space-y-4">
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((__, j) => (
                    <Skeleton key={j} className="h-5 w-5 rounded" />
                  ))}
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <div className="flex items-center gap-4 pt-2">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-br from-green-600 to-green-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <SkeletonOnGreen className="h-10 w-96 max-w-full mx-auto rounded-lg" />
          <SkeletonOnGreen className="h-6 w-[28rem] max-w-full mx-auto rounded-lg" />
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <SkeletonOnGreen className="h-14 w-full sm:w-64 rounded-xl" />
            <SkeletonOnGreen className="h-14 w-full sm:w-56 rounded-xl" />
          </div>
        </div>
      </section>

      <BrowseSectionSkeleton />
    </div>
  );
}

/** Events listing page while data loads */
export function EventsPageSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      <section className="bg-gradient-to-br from-green-600 via-green-700 to-green-800 py-16 shadow-2xl relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 space-y-3 relative z-10">
            <SkeletonOnGreen className="h-12 w-72 max-w-full mx-auto rounded-lg" />
            <SkeletonOnGreen className="h-6 w-96 max-w-full mx-auto rounded-lg" />
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-8 mx-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <SkeletonOnGreen className="h-10 w-4/5 rounded-lg" />
                <SkeletonOnGreen className="h-4 w-full rounded-lg" />
                <SkeletonOnGreen className="h-4 w-full rounded-lg" />
                <div className="space-y-2">
                  <SkeletonOnGreen className="h-4 w-3/4 rounded-lg" />
                  <SkeletonOnGreen className="h-4 w-2/3 rounded-lg" />
                </div>
              </div>
              <SkeletonOnGreen className="h-52 w-full rounded-2xl" />
            </div>
          </div>
          <div className="flex justify-center mt-8 gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonOnGreen key={i} className="h-4 w-4 rounded-full" />
            ))}
          </div>
        </div>
      </section>
      <BrowseSectionSkeleton />
    </div>
  );
}
