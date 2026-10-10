'use client'

import React from 'react'
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts'

interface Props {
  weightLogs: any[]
}

export default function DoctorPatientWeightChart({ weightLogs }: Props) {
  if (!weightLogs || weightLogs.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-[#8896A4] text-sm font-bold">
        No weight logs recorded by this user yet.
      </div>
    )
  }

  return (
    <div className="h-60 w-full min-w-0" style={{ minHeight: 240 }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
        <LineChart data={weightLogs}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
          <XAxis dataKey="date" stroke="#94A3B8" fontSize={10} tickLine={false} />
          <YAxis domain={['dataMin - 5', 'dataMax + 5']} stroke="#94A3B8" fontSize={10} tickLine={false} />
          <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontFamily: 'sans-serif' }} />
          <Line type="monotone" dataKey="weight" stroke="#10B981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} name="Weight (kg)" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
