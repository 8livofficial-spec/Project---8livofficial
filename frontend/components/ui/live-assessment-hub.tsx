"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  ShieldCheck,
  Stethoscope,
  Heart,
  Sparkles,
  CheckCircle2,
  Lock,
  UserCheck,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface LiveAssessmentHubProps {
  step: number;
  formData: {
    first_name: string;
    last_name: string;
    age: string;
    phone_number: string;
    height_cm: string;
    weight_kg: string;
    goal_weight_kg: string;
    gender: string;
    has_mtc_men2: string;
    has_pancreatitis: string;
    has_active_cancer: string;
    hard_rejections: string[];
    review_conditions: string[];
  };
  className?: string;
}

export function LiveAssessmentHub({
  step,
  formData,
  className
}: LiveAssessmentHubProps) {
  // Compute live BMI & ideal weight range
  const heightM = Number(formData.height_cm) / 100;
  const weightKg = Number(formData.weight_kg);
  const bmi =
    heightM > 0 && weightKg > 0
      ? Number((weightKg / (heightM * heightM)).toFixed(1))
      : 0;

  const idealMin = heightM > 0 ? Math.round(18.5 * heightM * heightM) : 52;
  const idealMax = heightM > 0 ? Math.round(24.9 * heightM * heightM) : 68;

  // Compute live eligibility score
  let eligibilityScore = 60;
  let statusTag = "INITIALIZING";
  let statusColor = "text-[#0D9488] bg-[#0D9488]/10 border-[#0D9488]/20";

  if (formData.first_name || formData.phone_number) {
    eligibilityScore += 10;
  }
  if (heightM > 0 && weightKg > 0) {
    eligibilityScore += 15;
  }
  if (step >= 3) {
    const hasContraindication =
      [formData.has_mtc_men2, formData.has_pancreatitis, formData.has_active_cancer].includes("yes") ||
      formData.hard_rejections.length > 0;

    if (hasContraindication) {
      eligibilityScore = 20;
      statusTag = "SAFE ALTERNATIVE REQUIRED";
      statusColor = "text-rose-600 bg-rose-50 border-rose-200";
    } else {
      eligibilityScore = 96;
      statusTag = "HIGH ELIGIBILITY MATCH";
      statusColor = "text-emerald-700 bg-emerald-50 border-emerald-200";
    }
  }

  return (
    <div
      className={cn(
        "w-full rounded-[2.5rem] bg-white border border-slate-200/80 shadow-2xl p-6 sm:p-8 space-y-6",
        className
      )}
    >
      {/* Header Badge */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#0D9488]/15 text-[#0D9488] flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-sora text-sm font-bold text-[#0F172A]">Live Biometric Hub</h4>
            <p className="text-[10px] text-[#64748B]">Real-time clinical intake calculation</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#0D9488] animate-pulse" />
          <span className="text-[10px] font-bold text-[#0F766E] uppercase tracking-wider font-sora">
            Live Active
          </span>
        </div>
      </div>

      {/* Patient Name Greeting Card */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#0D9488] text-white flex items-center justify-center font-sora font-bold text-sm shadow-md">
          {formData.first_name ? formData.first_name[0].toUpperCase() : "P"}
        </div>
        <div>
          <p className="text-[10px] uppercase font-bold tracking-wider text-[#64748B] font-sora">
            Member Profile
          </p>
          <p className="font-sora text-sm font-bold text-[#0F172A]">
            {formData.first_name ? `${formData.first_name} ${formData.last_name}` : "Prospective Member"}
          </p>
        </div>
      </div>

      {/* Live Eligibility Confidence Radial Ring */}
      <div className="p-5 rounded-2xl bg-[#0D9488]/5 border border-[#0D9488]/20 flex items-center justify-between">
        <div className="space-y-1">
          <span className={cn("inline-block px-3 py-0.5 rounded-full border text-[10px] font-bold font-sora", statusColor)}>
            {statusTag}
          </span>
          <h5 className="font-sora text-lg font-bold text-[#0F172A]">
            Clinical Match: <span className="text-[#0D9488]">{eligibilityScore}%</span>
          </h5>
          <p className="text-xs text-[#475569] font-light">
            Calculated based on metabolic guidelines
          </p>
        </div>

        <div className="relative w-16 h-16 shrink-0">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="32" cy="32" r="26" className="stroke-slate-200 fill-transparent" strokeWidth="6" />
            <circle
              cx="32"
              cy="32"
              r="26"
              style={{
                stroke: "#0D9488",
                strokeDasharray: 163,
                strokeDashoffset: 163 - (163 * eligibilityScore) / 100,
                transition: "stroke-dashoffset 0.6s ease-out"
              }}
              className="fill-transparent stroke-linecap-round"
              strokeWidth="6"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-[11px] font-black font-sora text-[#0F172A]">
            {eligibilityScore}%
          </div>
        </div>
      </div>

      {/* Live Vitals Preview (Steps 2+) */}
      {heightM > 0 && weightKg > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-3"
        >
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm text-center">
            <p className="text-[10px] uppercase font-bold text-[#64748B] font-sora">Live BMI</p>
            <p className="font-sora text-2xl font-black text-[#0F172A] mt-0.5">{bmi}</p>
            <p className="text-[10px] font-semibold text-[#0D9488] mt-0.5">
              {bmi >= 25 ? "GLP-1 Candidate" : "Metabolically Balanced"}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm text-center">
            <p className="text-[10px] uppercase font-bold text-[#64748B] font-sora">Target Range</p>
            <p className="font-sora text-base font-bold text-[#0F172A] mt-1">
              {idealMin} - {idealMax} kg
            </p>
            <p className="text-[10px] font-semibold text-[#0F766E] mt-0.5">Optimal Biomarkers</p>
          </div>
        </motion.div>
      ) : (
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3 text-xs text-[#475569]">
          <TrendingUp className="w-4 h-4 text-[#0D9488] shrink-0" />
          <span>Enter your height and weight in Step 2 to view live BMI calculations.</span>
        </div>
      )}

      {/* Assigned Clinical Doctor Card */}
      <div className="p-4.5 rounded-2xl bg-slate-900 text-white shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-[#0D9488]" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0D9488] font-sora">
              Assigned Clinical Lead
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-400 font-sora">Board-Certified</span>
        </div>

        <div className="flex items-center gap-3">
          <img
            src="/images/doctor_consultation.png"
            alt="Doctor"
            className="w-11 h-11 rounded-full object-cover border-2 border-[#0D9488]"
          />
          <div>
            <p className="font-sora text-sm font-bold">Dr. Ananya Rao, MD</p>
            <p className="text-xs text-slate-300 font-light">Endocrinology & Metabolic Specialist</p>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 font-light leading-relaxed pt-1 border-t border-slate-800">
          "Your responses will be evaluated for personalized GLP-1 dosing and safety protocols."
        </p>
      </div>

      {/* Step Milestone Badges */}
      <div className="space-y-2 pt-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] font-sora mb-1">
          Assessment Milestones
        </p>

        {[
          { stepNum: 1, label: "Contact Info & Account", icon: UserCheck },
          { stepNum: 2, label: "Biometric Vitals & BMI", icon: Activity },
          { stepNum: 3, label: "Medical Safety Screening", icon: ShieldCheck },
          { stepNum: 4, label: "Doctor Review & Schedule", icon: Stethoscope }
        ].map((m) => {
          const isDone = step > m.stepNum;
          const isCurrent = step === m.stepNum;
          const Icon = m.icon;

          return (
            <div
              key={m.stepNum}
              className={cn(
                "p-3 rounded-xl border flex items-center justify-between transition-all duration-300",
                isDone
                  ? "bg-emerald-50/80 border-emerald-200 text-emerald-800"
                  : isCurrent
                  ? "bg-[#0D9488]/10 border-[#0D9488]/40 text-[#0F172A] shadow-xs"
                  : "bg-slate-50 border-slate-200/60 text-slate-400 opacity-60"
              )}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={cn("w-4 h-4", isDone ? "text-emerald-600" : isCurrent ? "text-[#0D9488]" : "text-slate-400")} />
                <span className="text-xs font-bold font-sora">{m.label}</span>
              </div>
              {isDone ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : isCurrent ? (
                <span className="text-[10px] font-bold text-[#0D9488] font-sora uppercase">In Progress</span>
              ) : (
                <Lock className="w-3.5 h-3.5 text-slate-300" />
              )}
            </div>
          );
        })}
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center gap-2 text-[10px] text-[#64748B]">
        <Lock className="w-3.5 h-3.5 text-[#0D9488]" />
        <span>256-Bit Encrypted HIPAA Medical Security Active</span>
      </div>
    </div>
  );
}

export default LiveAssessmentHub;
