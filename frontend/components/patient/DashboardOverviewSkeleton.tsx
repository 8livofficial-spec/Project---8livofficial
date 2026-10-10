'use client'

import React from 'react'

export default function DashboardOverviewSkeleton() {
  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto font-sans animate-pulse" aria-busy="true" aria-label="Loading dashboard overview">
      {/* Hero Motivation Banner Skeleton */}
      <div className="rounded-[26px] border border-slate-200/80 bg-slate-100/70 p-6 sm:p-8 h-40 flex flex-col justify-center space-y-3">
        <div className="h-3 w-32 bg-slate-200/80 rounded-full" />
        <div className="h-7 w-64 bg-slate-200/80 rounded-xl" />
        <div className="h-4 w-96 bg-slate-200/80 rounded-lg" />
      </div>

      {/* Four Metrics Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-[22px] p-5 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-slate-100 shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-3 w-20 bg-slate-100 rounded" />
                <div className="h-6 w-28 bg-slate-100 rounded" />
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div className="h-3 w-20 bg-slate-100 rounded" />
              <div className="h-3 w-16 bg-slate-100 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Middle Row Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Progress summary (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-[24px] p-6 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="h-4 w-32 bg-slate-100 rounded" />
            <div className="h-6 w-24 bg-slate-100 rounded-xl" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((j) => (
              <div key={j} className="h-20 bg-slate-50 rounded-2xl p-3 border border-slate-100 flex flex-col justify-center space-y-2">
                <div className="h-4 w-12 bg-slate-200/80 rounded mx-auto" />
                <div className="h-2 w-14 bg-slate-200/80 rounded mx-auto" />
              </div>
            ))}
          </div>
        </div>

        {/* Next Appointment (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-[24px] p-6 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="h-4 w-28 bg-slate-100 rounded" />
            <div className="h-3 w-12 bg-slate-100 rounded" />
          </div>
          <div className="h-20 bg-slate-50 rounded-2xl border border-slate-100 p-3.5 flex items-center gap-3">
            <div className="w-12 h-14 bg-slate-200/80 rounded-xl shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-3 w-32 bg-slate-200/80 rounded" />
              <div className="h-3 w-24 bg-slate-200/80 rounded" />
            </div>
          </div>
        </div>

        {/* Quick Actions (3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-[24px] p-6 border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-3">
          <div className="h-4 w-24 bg-slate-100 rounded pb-3 border-b border-slate-100 mb-2" />
          {[1, 2, 3].map((k) => (
            <div key={k} className="h-10 bg-slate-50 rounded-xl border border-slate-100" />
          ))}
        </div>
      </div>
    </div>
  )
}
