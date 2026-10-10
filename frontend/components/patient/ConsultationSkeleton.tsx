import React from 'react'

export default function ConsultationSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50/70 pb-16 font-sans animate-in fade-in duration-300">
      {/* Top Bar Navigation Skeleton */}
      <div className="bg-white/90 border-b border-slate-200/80 sticky top-0 z-20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-28 h-9 bg-slate-200 rounded-xl animate-pulse" />
            <div className="h-5 w-[1px] bg-slate-200 hidden sm:block" />
            <div className="w-44 h-5 bg-slate-200 rounded-md animate-pulse hidden sm:block" />
          </div>
          <div className="w-36 h-7 bg-slate-200 rounded-full animate-pulse" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Header Hero Banner Skeleton */}
        <div className="bg-gradient-to-br from-[#0B1120] via-[#0F172A] to-[#0D9488]/80 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl shadow-slate-900/10 mb-8">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="w-40 h-6 bg-white/15 rounded-full animate-pulse" />
              <div className="w-80 max-w-full h-8 bg-white/20 rounded-lg animate-pulse" />
              <div className="w-96 max-w-full h-4 bg-white/10 rounded-md animate-pulse" />
            </div>

            <div className="bg-white/10 border border-white/15 rounded-2xl p-4 backdrop-blur-md flex items-center gap-4 shrink-0">
              <div className="w-12 h-12 rounded-xl bg-white/20 animate-pulse" />
              <div className="space-y-2">
                <div className="w-24 h-3 bg-white/15 rounded animate-pulse" />
                <div className="w-32 h-4 bg-white/25 rounded animate-pulse" />
                <div className="w-28 h-3 bg-white/15 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Two Column Booking Workspace Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Cols: Slot Selection & Calendar Skeleton */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div className="space-y-2">
                  <div className="w-48 h-6 bg-slate-200 rounded-lg animate-pulse" />
                  <div className="w-72 max-w-full h-4 bg-slate-100 rounded-md animate-pulse" />
                </div>
                <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 animate-pulse" />
              </div>

              <div className="space-y-6">
                {/* Date Carousel Skeleton */}
                <div>
                  <div className="w-28 h-4 bg-slate-200 rounded mb-3 animate-pulse" />
                  <div className="flex gap-2.5 overflow-x-auto pb-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="min-w-22 py-3 px-3 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col items-center gap-1.5 animate-pulse"
                      >
                        <div className="w-10 h-2.5 bg-slate-200 rounded" />
                        <div className="w-8 h-6 bg-slate-300 rounded my-0.5" />
                        <div className="w-10 h-2.5 bg-slate-200 rounded" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Time Slots Area Skeleton */}
                <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200/80 space-y-5">
                  <div className="space-y-1.5">
                    <div className="w-36 h-4 bg-slate-200 rounded animate-pulse" />
                    <div className="w-64 max-w-full h-3 bg-slate-100 rounded animate-pulse" />
                  </div>

                  {/* Morning Slots */}
                  <div>
                    <div className="w-20 h-3 bg-slate-200 rounded mb-2.5 animate-pulse" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-11 rounded-xl bg-white border border-slate-200 animate-pulse" />
                      ))}
                    </div>
                  </div>

                  {/* Afternoon Slots */}
                  <div>
                    <div className="w-24 h-3 bg-slate-200 rounded mb-2.5 animate-pulse" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-11 rounded-xl bg-white border border-slate-200 animate-pulse" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right 1 Col: Summary Card Skeleton */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <div className="w-32 h-5 bg-slate-200 rounded animate-pulse" />
                <div className="w-16 h-4 bg-slate-100 rounded-md animate-pulse" />
              </div>

              <div className="space-y-3.5 pb-4 border-b border-slate-100">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex justify-between items-center py-1">
                    <div className="w-16 h-3 bg-slate-100 rounded animate-pulse" />
                    <div className="w-28 h-3 bg-slate-200 rounded animate-pulse" />
                  </div>
                ))}
              </div>

              <div className="mt-5 space-y-3">
                <div className="w-full h-14 bg-slate-200 rounded-2xl animate-pulse" />
                <div className="w-48 h-3 bg-slate-100 rounded mx-auto animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
