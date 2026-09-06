'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Apple,
  CheckCircle2,
  Download,
  Droplets,
  FileCheck,
  FileText,
  Plus,
  Utensils,
  AlertCircle,
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

export default function PatientNutritionWidget() {
  const [activePlan, setActivePlan] = useState<any>(null)
  const [plans, setPlans] = useState<any[]>([])
  const [foodLogs, setFoodLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [acknowledging, setAcknowledging] = useState(false)
  const [ackChecked, setAckChecked] = useState(false)
  const [showLogModal, setShowLogModal] = useState(false)
  const [mealType, setMealType] = useState('BREAKFAST')
  const [foodItems, setFoodItems] = useState('')
  const [portion, setPortion] = useState('')
  const [waterLiters, setWaterLiters] = useState('')
  const [notes, setNotes] = useState('')
  const [submittingLog, setSubmittingLog] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  const loadPatientNutrition = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const [plansRes, logsRes] = await Promise.all([
        fetch('/api/patient/nutrition-plans', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
        fetch('/api/patient/food-logs', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
      ])

      const plansJson = await plansRes.json()
      const logsJson = await logsRes.json()

      if (plansJson.success) {
        setPlans(plansJson.plans || [])
        setActivePlan(plansJson.activePlan || null)
      }
      if (logsJson.success) {
        setFoodLogs(logsJson.foodLogs || [])
      }
    } catch (err) {
      console.warn('Patient nutrition fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPatientNutrition()
  }, [loadPatientNutrition])

  const handleAcknowledge = async () => {
    if (!activePlan || !ackChecked) return
    setAcknowledging(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/patient/nutrition-plans/${activePlan.id}/acknowledge`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token || ''}` },
      })
      const json = await res.json()
      if (json.success) {
        setStatusMessage('Thank you! Your nutrition plan acknowledgement has been recorded.')
        loadPatientNutrition()
      }
    } catch (err: any) {
      console.warn('Acknowledgement error:', err)
    } finally {
      setAcknowledging(false)
    }
  }

  const handleSubmitLog = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittingLog(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/patient/food-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          meal_type: mealType,
          food_items: foodItems || (mealType === 'WATER' ? 'Water Intake' : 'Meal'),
          portion: portion || null,
          water_liters: waterLiters ? Number(waterLiters) : null,
          notes: notes || null,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setStatusMessage('Log saved! Your dietitian can now review it.')
        setShowLogModal(false)
        setFoodItems('')
        setPortion('')
        setWaterLiters('')
        setNotes('')
        loadPatientNutrition()
      }
    } catch (err) {
      console.warn('Log submit error:', err)
    } finally {
      setSubmittingLog(false)
    }
  }

  if (loading) return null

  return (
    <div className="space-y-6">
      {statusMessage && (
        <div className="rounded-2xl bg-[#DCFCE7] border border-[#86EFAC] p-4 text-xs font-bold text-[#166534] flex items-center justify-between">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage('')} className="text-[#166534] font-black">✕</button>
        </div>
      )}

      {/* 1. NUTRITION PLAN CARD */}
      {activePlan && (
        <div className="rounded-[28px] border border-[#E8DED4] bg-white p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#0D9488]">Clinical Nutrition Care</span>
              <h3 className="text-xl font-black text-[#1A1F36] mt-0.5">{activePlan.plan_name}</h3>
              <p className="text-xs text-slate-400 mt-1">
                Version {activePlan.version} • Start Date: {activePlan.start_date} • Review Date: {activePlan.review_date || 'In 14 Days'}
              </p>
            </div>
            <a
              href={`/api/dietitian/plans/${activePlan.id}/pdf`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-full border border-[#E8DED4] hover:bg-slate-50 text-xs font-bold text-[#1A1F36] flex items-center gap-2 self-start"
            >
              <Download className="w-4 h-4 text-[#0D9488]" />
              <span>View Nutrition Plan PDF</span>
            </a>
          </div>

          {/* Acknowledgement Block */}
          {activePlan.status === 'PUBLISHED' ? (
            <div className="mt-4 p-4 rounded-2xl bg-[#FAF8F5] border border-[#E8DED4] space-y-3">
              <p className="text-xs font-bold text-[#1A1F36]">
                Your clinical dietitian has published your personalized nutrition plan. Please review the schedule and acknowledge below:
              </p>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={ackChecked}
                  onChange={(e) => setAckChecked(e.target.checked)}
                  className="w-4 h-4 text-[#0D9488] rounded border-slate-300 focus:ring-[#0D9488]"
                />
                <span className="text-xs font-bold text-slate-700">
                  I have reviewed and acknowledge this nutrition plan.
                </span>
              </label>
              <div>
                <button
                  onClick={handleAcknowledge}
                  disabled={!ackChecked || acknowledging}
                  className={`px-5 py-2 rounded-full text-xs font-bold transition-colors ${
                    ackChecked && !acknowledging
                      ? 'bg-[#0D9488] hover:bg-[#0F766E] text-white shadow-sm'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {acknowledging ? 'Recording...' : 'Acknowledge Plan'}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-2 text-xs font-bold text-[#166534] bg-[#DCFCE7] px-3.5 py-2 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-[#166534]" />
              <span>You have acknowledged this nutrition plan.</span>
            </div>
          )}
        </div>
      )}

      {/* 2. MEAL & WATER LOGGER CARD */}
      <div className="rounded-[28px] border border-[#E8DED4] bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-[#1A1F36]">Daily Food & Hydration Tracker</h3>
            <p className="text-xs text-slate-400 font-semibold">Log your daily meals and water intake for clinical dietitian reviews</p>
          </div>
          <button
            onClick={() => setShowLogModal(true)}
            className="px-4 py-2 rounded-full bg-[#0D9488] text-white text-xs font-bold hover:bg-[#0F766E] flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Log Meal / Water</span>
          </button>
        </div>

        {/* Recent Food Logs */}
        {foodLogs.length > 0 ? (
          <div className="space-y-3">
            {foodLogs.slice(0, 4).map((log) => (
              <div key={log.id} className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E8DED4] flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#0D9488] uppercase text-[11px]">{log.meal_type}</span>
                    <span className="text-[10px] text-slate-400">{log.log_date} {log.time ? `• ${log.time}` : ''}</span>
                  </div>
                  <p className="font-semibold text-[#1A1F36] mt-0.5">{log.food_items || `${log.water_liters} L Water`}</p>
                  {log.dietitian_comment && (
                    <p className="text-[11px] font-bold text-[#0D9488] mt-1 bg-[#0D9488]/10 px-2 py-1 rounded-md">
                      Dietitian Note: {log.dietitian_comment}
                    </p>
                  )}
                </div>
                <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded ${
                  log.dietitian_reviewed ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-slate-100 text-slate-500'
                }`}>
                  {log.dietitian_reviewed ? 'Reviewed' : 'Logged'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center bg-[#FAF8F5] rounded-2xl text-xs text-slate-400 font-bold">
            No meals logged today yet. Click "Log Meal / Water" above to start!
          </div>
        )}
      </div>

      {/* Log Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-[#E8DED4] space-y-4">
            <h3 className="text-lg font-black text-[#1A1F36]">Log Meal or Water Intake</h3>

            <form onSubmit={handleSubmitLog} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Meal / Intake Type</label>
                <select
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E8DED4] rounded-xl text-xs font-semibold"
                >
                  <option value="BREAKFAST">Breakfast</option>
                  <option value="MID_MORNING">Mid-Morning</option>
                  <option value="LUNCH">Lunch</option>
                  <option value="EVENING_SNACK">Evening Snack</option>
                  <option value="DINNER">Dinner</option>
                  <option value="WATER">Water Intake</option>
                </select>
              </div>

              {mealType === 'WATER' ? (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Water Amount (Liters)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={waterLiters}
                    onChange={(e) => setWaterLiters(e.target.value)}
                    placeholder="e.g. 0.5"
                    className="w-full px-3 py-2 border border-[#E8DED4] rounded-xl text-xs"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Food Items Consumed</label>
                    <input
                      type="text"
                      required
                      value={foodItems}
                      onChange={(e) => setFoodItems(e.target.value)}
                      placeholder="e.g. 2 Idlis with Sambar + 1 Boiled Egg"
                      className="w-full px-3 py-2 border border-[#E8DED4] rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Portion</label>
                    <input
                      type="text"
                      value={portion}
                      onChange={(e) => setPortion(e.target.value)}
                      placeholder="e.g. 1 medium bowl"
                      className="w-full px-3 py-2 border border-[#E8DED4] rounded-xl text-xs"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Notes / Appetite</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Felt full, followed plan instructions"
                  className="w-full px-3 py-2 border border-[#E8DED4] rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 rounded-full border border-[#E8DED4] text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLog}
                  className="px-5 py-2 rounded-full bg-[#0D9488] text-white text-xs font-bold hover:bg-[#0F766E]"
                >
                  {submittingLog ? 'Saving...' : 'Save Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
