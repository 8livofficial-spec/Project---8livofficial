'use client'

import React, { useMemo, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Scale, ArrowRight, Plus, Activity } from 'lucide-react'
import Link from 'next/link'

interface WeightChartProps {
  logs: { created_at: string; weight_kg: number | string }[]
  startWeight: number | null
}

export default function WeightChart({ logs, startWeight }: WeightChartProps) {
  const [timeRange, setTimeRange] = useState<'7D' | '30D' | '90D' | 'All'>('90D')
  
  // Format logs to chart data
  const chartData = useMemo(() => {
    return logs
      .map(log => ({
        date: new Date(log.created_at),
        weight: Number(log.weight_kg)
      }))
      .filter(log => !isNaN(log.weight) && !isNaN(log.date.getTime()))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((log, i) => ({
        formattedDate: `Week ${i === 0 ? 1 : i * 4} (${log.weight} kg)`, // Fallback for testing UI, ideally real dates
        displayLabel: log.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        weight: log.weight,
        rawDate: log.date
      }))
  }, [logs])

  const visibleData = chartData.slice(-12)
  const currentWeight = visibleData.length > 0 ? visibleData[visibleData.length - 1].weight : null
  const weightChange = startWeight !== null && currentWeight !== null ? startWeight - currentWeight : 0
  const weightChangePercentage = startWeight ? (weightChange / startWeight) * 100 : 0
  
  const lastLoggedDaysAgo = visibleData.length > 0 
    ? Math.floor(Math.abs(new Date().getTime() - visibleData[visibleData.length - 1].rawDate.getTime()) / (1000 * 60 * 60 * 24))
    : null

  // Empty States
  if (visibleData.length === 0) {
    return (
      <div className="bg-white rounded-[16px] border border-[#e2e8f0] p-[24px] shadow-[0px_2px_4px_-2px_rgba(15,23,42,0.06),0px_4px_6px_-1px_rgba(15,23,42,0.1)] flex flex-col items-center justify-center py-16 text-center">
        <Scale className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-base font-medium text-slate-600">Your progress starts here.</p>
        <p className="text-sm text-slate-400 mt-1 max-w-sm px-4">
          Add your first measurement when you're ready.
        </p>
      </div>
    )
  }

  const minWeight = Math.min(...visibleData.map(d => d.weight))
  const maxWeight = Math.max(...visibleData.map(d => d.weight))
  const yDomain = [Math.floor(minWeight - 2), Math.ceil(maxWeight + 2)]

  return (
    <div className="bg-white rounded-[16px] border border-[#e2e8f0] p-[24px] shadow-[0px_2px_4px_-2px_rgba(15,23,42,0.06),0px_4px_6px_-1px_rgba(15,23,42,0.1)] flex flex-col gap-[24px] w-full">
      
      {/* Header Area */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-[18px] h-[18px] text-[#10b981]" />
            <span className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">Current Weight & Trend</span>
          </div>
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1">
            {['7D', '30D', '90D', 'All'].map(range => (
              <button 
                key={range}
                onClick={() => setTimeRange(range as any)}
                className={`px-3 py-1 text-[12px] font-bold rounded-md transition-colors ${timeRange === range ? 'bg-white shadow-sm text-slate-900 border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
        
        <div>
          <div className="flex items-baseline gap-3 mb-1">
            <span className="text-[40px] leading-[48px] font-bold text-slate-900 tracking-tight">{currentWeight?.toFixed(1)} <span className="text-[20px] font-medium text-slate-500">kg</span></span>
            {weightChange > 0 && (
              <span className="flex items-center gap-1 bg-[#ecfdf5] text-[#10b981] px-[8px] py-[2px] rounded-full text-[12px] font-bold">
                ↓ {weightChange.toFixed(1)} kg ({weightChangePercentage.toFixed(1)}%)
              </span>
            )}
          </div>
          <p className="text-[13px] text-slate-500">
            Total weight reduced since beginning protocol (Starting: {startWeight?.toFixed(1)} kg)
          </p>
        </div>
      </div>

      {/* Chart Meta */}
      <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 mt-2">
        <span>Goal: 68.0 kg</span>
        <span>Last logged: {visibleData[visibleData.length - 1].displayLabel} {lastLoggedDaysAgo !== null && `(${lastLoggedDaysAgo} days ago)`}</span>
      </div>

      {/* Chart Area */}
      <div className="relative -mx-2 -mt-4">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={visibleData} margin={{ top: 20, right: 10, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="weightGradFigma" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis 
              dataKey="formattedDate" 
              tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 500 }} 
              axisLine={false} 
              tickLine={false}
              tickMargin={12}
            />
            <YAxis 
              hide={true}
              domain={yDomain}
            />
            <Tooltip
              contentStyle={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                boxShadow: '0 4px 6px -1px rgba(15,23,42,0.1)',
                fontSize: '13px',
                padding: '8px 12px'
              }}
              labelStyle={{ color: '#64748b', fontWeight: 500, marginBottom: '4px' }}
              itemStyle={{ color: '#10b981', fontWeight: 700 }}
              formatter={(value: any) => [`${value} kg`, 'Weight']}
            />
            <Area 
              type="monotone" 
              dataKey="weight" 
              stroke="#10b981" 
              strokeWidth={3}
              fill="url(#weightGradFigma)" 
              dot={{ fill: '#fff', r: 4, strokeWidth: 2, stroke: '#10b981' }}
              activeDot={{ r: 6, fill: '#10b981', strokeWidth: 3, stroke: '#fff' }} 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom Actions */}
      <div className="flex items-center pt-2">
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 transition-colors text-slate-700 rounded-md text-[12px] font-semibold">
          <Plus className="w-3.5 h-3.5" /> Log new weight
        </button>
      </div>

    </div>
  )
}
