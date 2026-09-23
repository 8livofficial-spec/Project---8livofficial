'use client'

import React, { useState } from 'react'
import { CheckCircle2, Apple, Dumbbell } from 'lucide-react'
import PatientNutritionWidget from '@/components/patient/PatientNutritionWidget'

export default function CarePlanPage() {
  const [activeTab, setActiveTab] = useState<'nutrition' | 'fitness'>('nutrition')

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header section */}
      <div className="mb-8">
        <h1 className="text-3xl font-sora font-bold text-slate-900 tracking-tight">Your Care Plan</h1>
        <p className="text-slate-500 mt-2 text-sm leading-relaxed max-w-2xl">
          Follow your personalized diet and fitness guidelines to maximize the results of your treatment. 
          These plans are designed specifically for your body metrics and medical history.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-8 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('nutrition')}
          className={`pb-4 px-2 font-bold text-sm transition-colors border-b-2 ${
            activeTab === 'nutrition'
              ? 'border-[#00A884] text-[#00A884]'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Apple className="w-4 h-4" /> Nutritionist Diet Plan
          </div>
        </button>
        <button
          onClick={() => setActiveTab('fitness')}
          className={`pb-4 px-2 font-bold text-sm transition-colors border-b-2 ${
            activeTab === 'fitness'
              ? 'border-[#00A884] text-[#00A884]'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Dumbbell className="w-4 h-4" /> Fitness Coach Plan
          </div>
        </button>
      </div>

      {/* Content */}
      <div className="mt-4">
        {activeTab === 'nutrition' && (
          <div className="animate-in fade-in duration-300">
            <PatientNutritionWidget />
          </div>
        )}

        {activeTab === 'fitness' && (
          <div className="animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
              <div className="w-16 h-16 bg-[#00A884]/10 text-[#00A884] rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Fitness Plan Generation in Progress</h2>
              <p className="text-slate-500 max-w-md mx-auto text-sm leading-relaxed">
                Your assigned fitness coach is currently reviewing your medical profile and will upload your personalized workout plan within 24 hours. You will receive an email notification once it's ready.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
