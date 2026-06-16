'use client'

import React from 'react'
import { TrendingDown, TrendingUp, Activity, Calendar, Clock, Plus } from 'lucide-react'
import Link from 'next/link'

interface OverviewCardsProps {
  weightLost: number | null
  currentWeight: number | null
  goalWeight: number | null
  programWeek: number
  totalWeeks: number
  bookingDate: string
  bookingTime: string
}

export default function OverviewCards({
  weightLost,
  currentWeight,
  goalWeight,
  programWeek,
  totalWeeks,
  bookingDate,
  bookingTime
}: OverviewCardsProps) {
  const stats = [
    {
      label: 'Weight Lost',
      value: weightLost !== null && weightLost > 0
        ? `${weightLost.toFixed(1)} kg`
        : weightLost === 0
          ? '0.0 kg'
          : '—',
      sub: weightLost !== null ? 'Since program start' : 'Log your weight to track',
      icon: TrendingDown,
      iconBg: 'rgba(92,122,107,0.1)',
      iconColor: '#5C7A6B',
      trend: weightLost !== null && weightLost >= 0 ? 'positive' : undefined,
      trendLabel: 'On track'
    },
    {
      label: 'Current Weight',
      value: currentWeight !== null ? `${currentWeight} kg` : '—',
      sub: goalWeight !== null ? `Goal: ${goalWeight} kg` : 'Set from your assessment',
      icon: Activity,
      iconBg: 'rgba(196,98,45,0.08)',
      iconColor: '#C4622D'
    },
    {
      label: 'Program Week',
      value: `Week ${programWeek}`,
      sub: `${Math.max(0, totalWeeks - programWeek)} weeks remaining`,
      icon: Calendar,
      iconBg: 'rgba(26,31,54,0.06)',
      iconColor: '#1A1F36'
    },
    {
      label: 'Next Check-in',
      value: bookingDate ? bookingDate : '--',
      sub: bookingDate ? `${bookingTime} • Video Call` : null,
      icon: Clock,
      iconBg: 'rgba(196,98,45,0.08)',
      iconColor: '#C4622D'
    },
  ]

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, idx) => {
        const Icon = stat.icon

        return (
          <div key={idx} className="dash-card p-5 select-none">
            {/* Header row — label left, icon right */}
            <div className="flex items-start justify-between gap-2">
              <span className="card-label">{stat.label}</span>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: stat.iconBg }}
              >
                <Icon size={16} style={{ color: stat.iconColor }} strokeWidth={2} />
              </div>
            </div>

            {/* Value */}
            <p className="card-value mt-3">{stat.value}</p>

            {/* Sub — handle empty state gracefully */}
            {stat.sub ? (
              <p className="card-sub">{stat.sub}</p>
            ) : (
              <Link
                href="/patient/consultation"
                className="mt-2 text-[11px] font-semibold text-[#C4622D] hover:underline flex items-center gap-1 w-fit no-underline"
              >
                <Plus size={11} /> Book a slot
              </Link>
            )}

            {/* Optional trend badge */}
            {stat.trend && (
              <div className={`mt-3 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg
                ${stat.trend === 'positive' ? 'bg-[rgba(92,122,107,0.1)] text-[#5C7A6B]' : 'bg-[rgba(196,98,45,0.08)] text-[#C4622D]'}`}>
                {stat.trend === 'positive' ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
                <span>{stat.trendLabel}</span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
