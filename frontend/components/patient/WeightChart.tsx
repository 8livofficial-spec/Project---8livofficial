'use client'

import React from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface WeightChartProps {
  logs: { created_at: string; weight_kg: number }[]
  startWeight: number
}

export default function WeightChart({ logs, startWeight }: WeightChartProps) {
  // Convert logs to chart data
  const chartData = logs.map((log, index) => ({
    week: `Wk ${index + 1}`,
    weight: parseFloat(log.weight_kg as any)
  }))

  // Fallback data if no logs exist
  const displayData = chartData.length > 0 ? chartData : [
    { week: 'Start', weight: startWeight }
  ]

  const currentWeight = logs.length > 0 ? chartData[chartData.length - 1].weight : startWeight
  const initialWeight = startWeight
  const totalChange = logs.length > 0 ? (initialWeight - currentWeight) : 0

  return (
    <div className="dash-card p-6">
      {/* Header — proper flex, no overlap */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div>
          <h3 className="text-[#1A1F36] font-bold text-base font-[Sora]">Weight Progress</h3>
          <p className="text-[#8896A4] text-xs mt-0.5">Last 8 weeks</p>
        </div>
        <span className="flex-shrink-0 bg-[rgba(92,122,107,0.1)] text-[#5C7A6B] 
                        text-xs font-semibold px-3 py-1.5 rounded-full">
          {totalChange > 0 ? `−${totalChange.toFixed(1)} kg total` : 'Starting weight'}
        </span>
      </div>

      {/* Chart — add margins so axes don't clip */}
      <div className="relative">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={displayData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#C4622D" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#C4622D" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,31,54,0.05)" vertical={false} />
            <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#8896A4' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#8896A4' }} axisLine={false} tickLine={false} domain={['dataMin - 2', 'dataMax + 1']} />
            <Tooltip
              contentStyle={{
                background: '#fff',
                border: '1px solid rgba(26,31,54,0.08)',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(26,31,54,0.1)',
                fontSize: '12px',
              }}
              labelStyle={{ color: '#8896A4', fontWeight: 600 }}
              itemStyle={{ color: '#C4622D', fontWeight: 700 }}
            />
            <Area type="monotone" dataKey="weight" stroke="#C4622D" strokeWidth={2.5}
                  fill="url(#weightGrad)" dot={{ fill: '#C4622D', r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#C4622D', strokeWidth: 2, stroke: '#fff' }} />
          </AreaChart>
        </ResponsiveContainer>
        {logs.length === 0 && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] flex flex-col items-center justify-center text-center p-4 rounded-xl border border-dashed border-[#C4622D]/20 m-1 select-none">
            <p className="text-[#1A1F36] text-sm font-bold">No weight entries logged yet</p>
            <p className="text-[#8896A4] text-xs mt-1">Use 'Log Weight' under Quick Actions to record your first entry.</p>
          </div>
        )}
      </div>
    </div>
  )
}
