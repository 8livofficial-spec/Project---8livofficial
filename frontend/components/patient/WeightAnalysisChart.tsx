'use client'

import React from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Props {
  data: Array<{ week: string; weight: number }>
  hasLogs: boolean
}

export default function WeightAnalysisChart({ data, hasLogs }: Props) {
  return (
    <div className="h-64 w-full relative min-w-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="largeWeightGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#C4622D" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#C4622D" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,31,54,0.06)" vertical={false} />
          <XAxis dataKey="week" tick={{ fill: '#8896A4', fontSize: 10, fontWeight: 500 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#8896A4', fontSize: 10, fontWeight: 500 }} domain={['dataMin - 3', 'dataMax + 3']} axisLine={false} tickLine={false} />
          <Tooltip />
          <Area type="monotone" dataKey="weight" stroke="#C4622D" strokeWidth={3} fillOpacity={1} fill="url(#largeWeightGrad)" dot={{ fill: '#C4622D', r: 4 }} />
        </AreaChart>
      </ResponsiveContainer>
      {!hasLogs && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] flex flex-col items-center justify-center text-center p-4 rounded-xl border border-dashed border-[#C4622D]/20 m-1 select-none">
          <p className="text-[#1A1F36] text-sm font-bold">No weight entries logged yet</p>
          <p className="text-[#8896A4] text-xs mt-1">Submit your first log via &ldquo;Log Weight&rdquo; on the Overview dashboard.</p>
        </div>
      )}
    </div>
  )
}
