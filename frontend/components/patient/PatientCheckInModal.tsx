'use client'

import React, { useState, useEffect } from 'react'
import { X, Check, Loader2 } from 'lucide-react'

type CheckInStep = 1 | 2 | 3 | 4 | 'submitting' | 'complete'

interface PatientCheckInModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
  patientName: string
  latestWeight?: number | null
  lastRecordedDays?: number | null
}

export default function PatientCheckInModal({ 
  isOpen, 
  onClose, 
  onComplete, 
  patientName,
  latestWeight,
  lastRecordedDays
}: PatientCheckInModalProps) {
  const [step, setStep] = useState<CheckInStep>(1)
  const [mood, setMood] = useState<string | null>(null)
  const [appetite, setAppetite] = useState<string | null>(null)
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [newWeight, setNewWeight] = useState<string>('')

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setMood(null)
      setAppetite(null)
      setSymptoms([])
      setNewWeight('')
    }
  }, [isOpen])

  // Accessibility: Focus trap & Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden' // Prevent background scrolling
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleSubmit = async () => {
    setStep('submitting')
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    setStep('complete')
  }

  const toggleSymptom = (sym: string) => {
    if (sym === 'None') {
      setSymptoms(['None'])
      return
    }
    setSymptoms(prev => {
      const next = prev.filter(s => s !== 'None')
      if (next.includes(sym)) return next.filter(s => s !== sym)
      return [...next, sym]
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={step === 'submitting' || step === 'complete' ? undefined : onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg bg-white rounded-[24px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            {typeof step === 'number' && (
              <div className="flex gap-1.5">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-6 bg-[#0066FF]' : i < step ? 'w-2 bg-blue-200' : 'w-2 bg-slate-200'}`} />
                ))}
              </div>
            )}
            {typeof step === 'number' && (
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Step {step} of 4
              </span>
            )}
            {step === 'complete' && (
              <span className="text-xs font-semibold text-[#00A884] uppercase tracking-wider flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Check-in complete
              </span>
            )}
          </div>
          {(step !== 'submitting' && step !== 'complete') && (
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#0066FF]/20"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="p-6 sm:p-8 overflow-y-auto">
          
          {/* Step 1: Mood */}
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div>
                <h2 id="modal-title" className="text-2xl font-bold text-slate-900 tracking-tight">How are you feeling today?</h2>
                <p className="text-sm text-slate-500 mt-1">This helps us track your overall wellbeing.</p>
              </div>
              <div className="space-y-3">
                {[
                  { id: 'good', label: 'Good', emoji: '😊' },
                  { id: 'okay', label: 'Okay', emoji: '😐' },
                  { id: 'not_great', label: 'Not great', emoji: '😕' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setMood(opt.id); setTimeout(() => setStep(2), 250) }}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left focus:outline-none focus:ring-2 focus:ring-[#0066FF]/20 ${
                      mood === opt.id ? 'bg-blue-50 border-[#0066FF] ring-1 ring-[#0066FF]/20 shadow-sm' : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <span className={`text-base font-medium ${mood === opt.id ? 'text-[#0066FF]' : 'text-slate-700'}`}>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Appetite */}
          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">How is your appetite today?</h2>
                <p className="text-sm text-slate-500 mt-1">Monitoring your hunger levels.</p>
              </div>
              <div className="space-y-3">
                {[
                  { id: 'lower', label: 'Lower than usual' },
                  { id: 'same', label: 'About the same' },
                  { id: 'higher', label: 'Higher than usual' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setAppetite(opt.id); setTimeout(() => setStep(3), 250) }}
                    className={`w-full flex items-center p-4 rounded-xl border transition-all text-left focus:outline-none focus:ring-2 focus:ring-[#0066FF]/20 ${
                      appetite === opt.id ? 'bg-blue-50 border-[#0066FF] ring-1 ring-[#0066FF]/20 shadow-sm' : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`text-base font-medium ${appetite === opt.id ? 'text-[#0066FF]' : 'text-slate-700'}`}>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Symptoms */}
          {step === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 flex flex-col">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Any symptoms today?</h2>
                <p className="text-sm text-slate-500 mt-1">Select all that apply.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {['None', 'Nausea', 'Headache', 'Constipation', 'Fatigue', 'Other'].map(opt => {
                  const isSelected = symptoms.includes(opt)
                  return (
                    <button
                      key={opt}
                      onClick={() => toggleSymptom(opt)}
                      className={`flex items-center gap-3 p-3 sm:p-4 rounded-xl border transition-all text-left focus:outline-none focus:ring-2 focus:ring-[#0066FF]/20 ${
                        isSelected ? 'bg-blue-50 border-[#0066FF] ring-1 ring-[#0066FF]/20 shadow-sm' : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors shrink-0 ${isSelected ? 'bg-[#0066FF] border-[#0066FF] text-white' : 'border-slate-300 bg-white'}`}>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <span className={`text-sm sm:text-base font-medium ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>{opt}</span>
                    </button>
                  )
                })}
              </div>
              <div className="pt-2">
                <button
                  onClick={() => setStep(4)}
                  disabled={symptoms.length === 0}
                  className="w-full min-h-[52px] bg-[#0066FF] text-white rounded-xl font-semibold text-base hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs focus:outline-none focus:ring-4 focus:ring-[#0066FF]/20"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Weight (Optional) */}
          {step === 4 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 flex flex-col">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Weight (Optional)</h2>
                {latestWeight !== undefined && latestWeight !== null ? (
                  <p className="text-sm text-slate-500 mt-1">
                    Your last measurement was <span className="font-semibold text-slate-700">{latestWeight} kg</span>
                    {lastRecordedDays !== null && lastRecordedDays !== undefined ? ` (recorded ${lastRecordedDays} days ago)` : ''}.
                  </p>
                ) : (
                  <p className="text-sm text-slate-500 mt-1">We don't have a starting weight for you yet.</p>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Update weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    placeholder="e.g. 70.5"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF]/20 focus:border-[#0066FF] text-slate-900 text-lg transition-colors placeholder:text-slate-400"
                  />
                </div>
              </div>
              <div className="pt-4 flex flex-col gap-3">
                <button
                  onClick={handleSubmit}
                  disabled={!newWeight}
                  className="w-full min-h-[52px] bg-[#0066FF] text-white rounded-xl font-semibold text-base hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs focus:outline-none focus:ring-4 focus:ring-[#0066FF]/20"
                >
                  Update weight & Complete
                </button>
                <button
                  onClick={handleSubmit}
                  className="w-full min-h-[52px] bg-slate-100 text-slate-700 rounded-xl font-semibold text-base hover:bg-slate-200 transition-colors focus:outline-none focus:ring-4 focus:ring-slate-200"
                >
                  Skip
                </button>
              </div>
            </div>
          )}

          {/* Submitting State */}
          {step === 'submitting' && (
            <div className="py-12 flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-300">
              <Loader2 className="w-10 h-10 text-[#0066FF] animate-spin" />
              <p className="text-slate-600 font-medium">Saving your update...</p>
            </div>
          )}

          {/* Complete State */}
          {step === 'complete' && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in-95 duration-500">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2">
                <Check className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Thanks, {patientName}!</h2>
              <p className="text-base text-slate-500 max-w-xs">
                Your care team can now see your latest update.
              </p>
              <button
                onClick={() => {
                  onComplete();
                  setTimeout(onClose, 150);
                }}
                className="mt-6 min-h-[48px] px-8 bg-slate-900 text-white rounded-xl font-semibold text-sm hover:bg-slate-800 transition-colors shadow-xs"
              >
                Done
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
