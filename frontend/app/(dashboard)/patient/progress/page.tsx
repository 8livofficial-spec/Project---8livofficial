'use client'

import React, { useState } from 'react'
import { 
  AreaChart, Area, BarChart, Bar, LineChart, Line, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts'
import { TrendingDown, Award, Flame, Zap } from 'lucide-react'
import { usePatientData } from '@/hooks/usePatientData'

export default function ProgressPage() {
  const { assessment, weightLogs, consultation } = usePatientData()
  const [range, setRange] = useState<'1M' | '3M' | '6M' | 'ALL'>('1M')

  // Calculate metrics based on logs
  const currentWeight = weightLogs.length > 0 
    ? parseFloat(weightLogs[weightLogs.length - 1].weight_kg as any)
    : assessment?.weight_kg || 80
  const startWeight = assessment?.weight_kg || 82
  const goalWeight = assessment?.goal_weight_kg || 60
  const totalChange = startWeight - currentWeight

  // Calculated BMI
  const heightM = assessment?.height_cm ? assessment.height_cm / 100 : 1.7
  const startBmi = startWeight / (heightM * heightM)
  const currentBmi = currentWeight / (heightM * heightM)
  const bmiChange = startBmi - currentBmi

  // Mock data for auxiliary charts
  const caloriesData = [
    { day: 'Mon', calories: 1800 },
    { day: 'Tue', calories: 1650 },
    { day: 'Wed', calories: 1720 },
    { day: 'Thu', calories: 1590 },
    { day: 'Fri', calories: 1910 },
    { day: 'Sat', calories: 1680 },
    { day: 'Sun', calories: 1750 }
  ]

  const waterData = [
    { day: 'Mon', cups: 8 },
    { day: 'Tue', cups: 9 },
    { day: 'Wed', cups: 8 },
    { day: 'Thu', cups: 10 },
    { day: 'Fri', cups: 7 },
    { day: 'Sat', cups: 8 },
    { day: 'Sun', cups: 9 }
  ]

  const exerciseData = [
    { day: 'Mon', mins: 30 },
    { day: 'Tue', mins: 45 },
    { day: 'Wed', mins: 0 },
    { day: 'Thu', mins: 40 },
    { day: 'Fri', mins: 35 },
    { day: 'Sat', mins: 60 },
    { day: 'Sun', mins: 20 }
  ]

  const getMilestones = () => {
    const startProgramDate = assessment?.created_at 
      ? new Date(assessment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

    const list = [
      { date: startProgramDate, text: 'Started Metabolic Program 🚀', week: 'Week 1' }
    ]

    if (weightLogs.length > 0) {
      const firstLogDate = new Date(weightLogs[0].created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      list.push({
        date: firstLogDate,
        text: 'Logged first weight entry ⚖️',
        week: 'Week 1'
      })
      if (weightLogs.length > 1) {
        const latestLogDate = new Date(weightLogs[weightLogs.length - 1].created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        list.push({
          date: latestLogDate,
          text: 'Tracking active progress 📈',
          week: 'Current'
        })
      }
    }

    if (consultation) {
      const consultDate = new Date(consultation.created_at || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      if (consultation.status === 'approved') {
        list.push({
          date: consultDate,
          text: 'Physician evaluation approved 🏥',
          week: 'Active'
        })
        list.push({
          date: consultDate,
          text: 'Dosage protocol verified 💊',
          week: 'Active'
        })
      } else {
        list.push({
          date: consultDate,
          text: 'Consultation request submitted ⏳',
          week: 'Pending'
        })
      }
    }

    return list
  }

  const milestones = getMilestones()

  // Recharts custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white rounded-xl shadow-md px-3 py-1.5 border border-[#1A1F36]/8">
          <p className="text-xs font-bold text-[#1A1F36]">{payload[0].value} {payload[0].name === 'weight' ? 'kg' : ''}</p>
        </div>
      )
    }
    return null
  }

  // Weight Area Chart Data
  const chartData = weightLogs.map((log, index) => ({
    week: `Wk ${index + 1}`,
    weight: parseFloat(log.weight_kg as any)
  }))

  const displayWeightData = chartData.length > 0 ? chartData : [
    { week: 'Start', weight: startWeight }
  ]

  return (
    <div className="space-y-6 text-[#1A1F36]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-sora">My Progress</h2>
          <p className="text-xs text-[#8896A4] font-medium">Track your weight trajectory and auxiliary logs.</p>
        </div>
        
        {/* Date Ranges */}
        <div className="bg-white rounded-full p-1 border border-[#1A1F36]/8 shadow-sm flex items-center gap-1 shrink-0">
          {(['1M', '3M', '6M', 'ALL'] as const).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                range === r 
                  ? 'bg-[#1A1F36] text-white shadow-sm' 
                  : 'text-[#8896A4] hover:text-[#1A1F36]'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Large Weight Chart */}
      <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(26,31,54,0.08)] border border-[#1A1F36]/6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-base font-sora">Weight Analysis</h3>
          <span className="bg-[#5C7A6B]/10 text-[#5C7A6B] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            {totalChange > 0 ? `-${totalChange.toFixed(1)} kg lost` : 'Starting weight logged'}
          </span>
        </div>
        <div className="h-64 w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={displayWeightData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="largeWeightGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C4622D" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#C4622D" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,31,54,0.06)" vertical={false} />
              <XAxis dataKey="week" tick={{ fill: '#8896A4', fontSize: 10, fontWeight: 500 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8896A4', fontSize: 10, fontWeight: 500 }} domain={['dataMin - 3', 'dataMax + 3']} axisLine={false} tickLine={false} />
              <Tooltip />
              <Area type="monotone" dataKey="weight" stroke="#C4622D" strokeWidth={3} fillOpacity={1} fill="url(#largeWeightGrad)" dot={{ fill: '#C4622D', r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
          {weightLogs.length === 0 && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] flex flex-col items-center justify-center text-center p-4 rounded-xl border border-dashed border-[#C4622D]/20 m-1 select-none">
              <p className="text-[#1A1F36] text-sm font-bold">No weight entries logged yet</p>
              <p className="text-[#8896A4] text-xs mt-1">Submit your first log via "Log Weight" on the Overview dashboard.</p>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-[#1A1F36]/6 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#5C7A6B]/10 text-[#5C7A6B] flex items-center justify-center shrink-0">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#8896A4] uppercase tracking-wider">Total Loss</p>
            <p className="text-lg font-bold font-sora mt-0.5">{totalChange.toFixed(1)} kg</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#1A1F36]/6 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4622D]/10 text-[#C4622D] flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#8896A4] uppercase tracking-wider">BMI Change</p>
            <p className="text-lg font-bold font-sora mt-0.5">{bmiChange > 0 ? `-${bmiChange.toFixed(1)}` : '0.0'}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#1A1F36]/6 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1A1F36]/10 text-[#1A1F36] flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#8896A4] uppercase tracking-wider">Weekly Average</p>
            <p className="text-lg font-bold font-sora mt-0.5">{(totalChange / 4).toFixed(1)} kg</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#1A1F36]/6 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C4622D]/10 text-[#C4622D] flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#8896A4] uppercase tracking-wider">Log Streak</p>
            <p className="text-lg font-bold font-sora mt-0.5">{weightLogs.length} Days</p>
          </div>
        </div>
      </div>

      {/* Auxiliary Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Calories BarChart */}
        <div className="bg-white rounded-2xl p-5 border border-[#1A1F36]/6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-sm font-sora">Calorie Intake</h4>
            <span className="text-[9px] font-bold bg-[#C4622D]/10 text-[#C4622D] px-2 py-0.5 rounded-full select-none">Fitbit Sync</span>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={caloriesData} margin={{ left: -25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,31,54,0.06)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: '#8896A4', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#8896A4', fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="calories" fill="#C4622D" radius={[4, 4, 0, 0]} opacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Water LineChart */}
        <div className="bg-white rounded-2xl p-5 border border-[#1A1F36]/6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-sm font-sora">Water Intake</h4>
            <span className="text-[9px] font-bold bg-[#5C7A6B]/10 text-[#5C7A6B] px-2 py-0.5 rounded-full select-none">Apple Health</span>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={waterData} margin={{ left: -25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,31,54,0.06)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: '#8896A4', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#8896A4', fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="cups" stroke="#5C7A6B" strokeWidth={3} dot={{ fill: '#5C7A6B', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Exercise AreaChart */}
        <div className="bg-white rounded-2xl p-5 border border-[#1A1F36]/6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-sm font-sora">Active Exercise</h4>
            <span className="text-[9px] font-bold bg-[#C4622D]/10 text-[#C4622D] px-2 py-0.5 rounded-full select-none">Smartwatch</span>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={exerciseData} margin={{ left: -25 }}>
                <defs>
                  <linearGradient id="exerciseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C4622D" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#C4622D" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,31,54,0.06)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: '#8896A4', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#8896A4', fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="mins" stroke="#C4622D" strokeWidth={3} fill="url(#exerciseGrad)" dot={{ fill: '#C4622D', r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Timeline milestones */}
      <div className="space-y-4">
        <h3 className="font-bold text-base font-sora">Program Milestones</h3>
        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
          {milestones.map((m, idx) => (
            <div 
              key={idx} 
              className="bg-white rounded-2xl p-5 shadow-sm border border-[#1A1F36]/6 min-w-[220px] flex-shrink-0 border-l-4 border-l-[#C4622D] space-y-2 select-none"
            >
              <span className="text-[10px] font-black uppercase tracking-wider text-[#8896A4]">{m.week}</span>
              <h4 className="text-sm font-bold text-[#1A1F36] font-sora leading-tight">{m.text}</h4>
              <p className="text-[10px] text-[#8896A4] font-medium mt-1">{m.date}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
