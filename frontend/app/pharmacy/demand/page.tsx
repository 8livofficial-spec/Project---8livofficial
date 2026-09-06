'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  TrendingUp,
  Calendar,
  Pill,
  Package,
  Clock,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Building2,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Info,
} from 'lucide-react'
import { authedFetch } from '@/lib/apiClient'

type AggregateDemandItem = {
  medicine_name: string
  strength: string
  dosage_form: string
  route: string
  expected_quantity: number
  prescriptions_count: number
  forecasted_quantity: number
  committed_quantity: number
  actual_order_quantity: number
}

type UpcomingFulfillment = {
  id: string
  prescription_number: string
  medicine_summary: string
  quantity: number
  expected_fulfillment_date: string
  stage: 'FORECASTED' | 'COMMITTED' | 'ACTUAL_ORDER'
  status: string
}

export default function PharmacyUpcomingDemandPage() {
  const router = useRouter()
  const [windowDays, setWindowDays] = useState<7 | 14 | 30>(7)
  const [demandData, setDemandData] = useState<{
    aggregateDemand: AggregateDemandItem[]
    upcomingFulfillments: UpcomingFulfillment[]
    totalPrescriptions: number
    totalUnits: number
    pharmacy: { id: string; name: string }
    windowEnd: string
    disclaimer: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchDemand = async (days: number) => {
    setLoading(true)
    setError('')
    try {
      const res = await authedFetch(`/api/pharmacy/demand?window=${days}`)
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load upcoming demand forecast.')
      }
      setDemandData(data)
    } catch (err: any) {
      setError(err.message || 'Error loading demand data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDemand(windowDays)
  }, [windowDays])

  return (
    <main className="min-h-screen bg-[#F5F0EB] p-4 text-[#1A1F36] sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Top Navigation & Pharmacy Header */}
        <div className="rounded-2xl border border-[#1A1F36]/10 bg-white p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/pharmacy"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#1A1F36]/10 text-[#40516A] hover:bg-[#F5F0EB] hover:text-[#1A1F36] transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#C4622D]">
                  Partner Pharmacy Portal
                </span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 border border-emerald-200">
                  Verified Fulfillment Partner
                </span>
              </div>
              <h1 className="text-xl font-black text-[#1A1F36]">Upcoming Medication Demand</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/pharmacy"
              className="inline-flex items-center gap-2 rounded-xl border border-[#1A1F36]/10 bg-white px-4 py-2.5 text-xs font-black text-[#40516A] hover:bg-[#FAF7F5] transition-colors"
            >
              <Package className="h-4 w-4 text-[#C4622D]" />
              Fulfillment Orders
            </Link>
            <button
              onClick={() => fetchDemand(windowDays)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1A1F36] px-4 py-2.5 text-xs font-black text-white hover:bg-[#2A314E] transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh Forecast
            </button>
          </div>
        </div>

        {/* Informational Guidance / Scope Banner */}
        <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4 text-xs text-sky-950 flex items-start gap-3 shadow-sm">
          <Info className="h-5 w-5 text-sky-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-sky-900">
              Procurement Signal & Fulfillment Demand Forecast
            </p>
            <p className="leading-relaxed text-sky-800">
              Upcoming demand represents projected medication volume derived strictly from valid, authorized clinical prescriptions issued by 8LIV physicians.
              8LIV does not manage warehouse stock or pharmacy inventory. Partner pharmacies utilize this signal to independently arrange procurement ahead of dispatch.
            </p>
          </div>
        </div>

        {/* Window Selector & High-Level Metrics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-[#1A1F36]/10 bg-white p-5 shadow-sm space-y-3 sm:col-span-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#8896A4]">
                Forecast Timeframe
              </span>
              <span className="text-xs font-semibold text-[#8896A4]">
                Until {demandData?.windowEnd || '...'}
              </span>
            </div>
            <div className="flex gap-2">
              {([7, 14, 30] as const).map((days) => (
                <button
                  key={days}
                  onClick={() => setWindowDays(days)}
                  className={`flex-1 rounded-xl py-2.5 text-xs font-black transition-all ${
                    windowDays === days
                      ? 'bg-[#1A1F36] text-white shadow-sm'
                      : 'bg-[#FAF7F5] text-[#40516A] border border-[#1A1F36]/5 hover:bg-[#F5F0EB]'
                  }`}
                >
                  Next {days} Days
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#1A1F36]/10 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#8896A4]">
                Upcoming Fulfillment Demand
              </span>
              <Pill className="h-4 w-4 text-[#C4622D]" />
            </div>
            <p className="mt-2 text-2xl font-black text-[#1A1F36]">
              {demandData ? `${demandData.totalUnits} units` : '...'}
            </p>
            <p className="text-[11px] font-semibold text-[#8896A4] mt-0.5">
              Projected medication quantity
            </p>
          </div>

          <div className="rounded-2xl border border-[#1A1F36]/10 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#8896A4]">
                Active Prescriptions
              </span>
              <FileText className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-2xl font-black text-[#1A1F36]">
              {demandData ? demandData.totalPrescriptions : '...'}
            </p>
            <p className="text-[11px] font-semibold text-[#8896A4] mt-0.5">
              In current forecast window
            </p>
          </div>
        </div>

        {/* Section 1: Aggregate Demand Table */}
        <div className="overflow-hidden rounded-2xl border border-[#1A1F36]/10 bg-white shadow-sm">
          <div className="border-b border-[#1A1F36]/10 bg-[#FAF7F5] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#C4622D]" />
              <h2 className="text-sm font-black uppercase tracking-wider text-[#1A1F36]">
                Aggregate Upcoming Demand (Next {windowDays} Days)
              </h2>
            </div>
            <span className="text-xs font-semibold text-[#8896A4]">
              {demandData?.aggregateDemand.length || 0} distinct medicines
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-[#8896A4]">
              <RefreshCw className="mx-auto h-6 w-6 animate-spin text-[#C4622D]" />
              <p className="mt-2 text-xs font-bold">Calculating clinical demand forecast...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-rose-600">
              <AlertCircle className="mx-auto h-6 w-6" />
              <p className="mt-2 text-xs font-bold">{error}</p>
            </div>
          ) : demandData?.aggregateDemand.length === 0 ? (
            <div className="p-12 text-center text-[#8896A4]">
              <Package className="mx-auto h-8 w-8 text-[#8896A4]/50" />
              <p className="mt-2 text-sm font-bold text-[#1A1F36]">No upcoming prescription demand</p>
              <p className="mt-1 text-xs text-[#8896A4]">
                There are no active prescriptions scheduled for fulfillment in the next {windowDays} days.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#1A1F36]/10 bg-[#FAF7F5]/50 text-[10px] font-black uppercase tracking-wider text-[#8896A4]">
                    <th className="px-6 py-3.5">Medicine & Strength</th>
                    <th className="px-4 py-3.5">Dosage Form & Route</th>
                    <th className="px-4 py-3.5">Upcoming Demand</th>
                    <th className="px-4 py-3.5">Prescriptions</th>
                    <th className="px-6 py-3.5">Stage Breakdown</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A1F36]/5">
                  {demandData?.aggregateDemand.map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#FAF7F5]/40 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-black text-sm text-[#1A1F36]">{row.medicine_name}</p>
                        <p className="text-[11px] font-semibold text-[#8896A4] mt-0.5">Strength: {row.strength}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center rounded-lg bg-[#1A1F36]/5 px-2.5 py-1 text-xs font-bold text-[#1A1F36]">
                          {row.dosage_form}
                        </span>
                        <p className="text-[10px] text-[#8896A4] mt-1">Route: {row.route}</p>
                      </td>
                      <td className="px-4 py-4 font-black text-sm text-[#C4622D]">
                        {row.expected_quantity} units
                      </td>
                      <td className="px-4 py-4 font-bold text-[#1A1F36]">
                        {row.prescriptions_count} Rx
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                          {row.forecasted_quantity > 0 && (
                            <span className="rounded-md bg-amber-50 px-2 py-0.5 font-bold text-amber-800 border border-amber-200">
                              {row.forecasted_quantity} Forecasted
                            </span>
                          )}
                          {row.committed_quantity > 0 && (
                            <span className="rounded-md bg-blue-50 px-2 py-0.5 font-bold text-blue-800 border border-blue-200">
                              {row.committed_quantity} Committed
                            </span>
                          )}
                          {row.actual_order_quantity > 0 && (
                            <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-bold text-emerald-800 border border-emerald-200">
                              {row.actual_order_quantity} Actual Order
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 2: Upcoming Fulfillments Timeline */}
        <div className="overflow-hidden rounded-2xl border border-[#1A1F36]/10 bg-white shadow-sm">
          <div className="border-b border-[#1A1F36]/10 bg-[#FAF7F5] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#C4622D]" />
              <h2 className="text-sm font-black uppercase tracking-wider text-[#1A1F36]">
                Upcoming Fulfillments Timeline
              </h2>
            </div>
            <span className="text-xs font-semibold text-[#8896A4]">
              Chronological Dispatch Schedule
            </span>
          </div>

          {demandData?.upcomingFulfillments.length === 0 ? (
            <div className="p-8 text-center text-[#8896A4] text-xs font-semibold">
              No individual fulfillments scheduled.
            </div>
          ) : (
            <div className="divide-y divide-[#1A1F36]/5">
              {demandData?.upcomingFulfillments.map((item) => (
                <div
                  key={item.id}
                  className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-[#FAF7F5]/30 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black text-[#1A1F36]">
                        {item.prescription_number}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                          item.stage === 'ACTUAL_ORDER'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : item.stage === 'COMMITTED'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {item.stage.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-[#40516A]">{item.medicine_summary}</p>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-right">
                      <p className="font-black text-[#C4622D]">{item.quantity} units</p>
                      <p className="text-[11px] text-[#8896A4] flex items-center gap-1 justify-end">
                        <Clock className="h-3 w-3" /> Expected: {item.expected_fulfillment_date}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
