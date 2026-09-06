'use client';

import React, { useState } from 'react';
import {
  X, User, Mail, Phone, Calendar, Ruler, Scale, Target, Activity,
  AlertTriangle, ShieldCheck, Heart, FileText, Pill, Stethoscope,
  Copy, Check, ExternalLink, Sparkles, MapPin, ChevronRight
} from 'lucide-react';

export interface PatientProfileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  patient: any;
  onIssueRx?: () => void;
  hasIssuedRx?: boolean;
  onViewRx?: () => void;
}

export default function PatientProfileSidebar({
  isOpen,
  onClose,
  patient,
  onIssueRx,
  hasIssuedRx,
  onViewRx,
}: PatientProfileSidebarProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen || !patient) return null;

  const copyToClipboard = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const fullName = patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || patient.full_name || patient.display_id || patient.email || 'Patient';
  const initials = fullName.split(' ').filter(Boolean).map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'PT';
  const age = patient.age || (patient.medical_history && typeof patient.medical_history === 'object' ? patient.medical_history.age : null);
  const gender = patient.gender || (patient.medical_history && typeof patient.medical_history === 'object' ? patient.medical_history.gender : null);
  const heightCm = patient.height_cm ? Number(patient.height_cm) : null;
  const weightKg = patient.weight_kg ? Number(patient.weight_kg) : null;
  const goalWeightKg = patient.goal_weight_kg ? Number(patient.goal_weight_kg) : null;
  
  let bmi = patient.bmi ? Number(patient.bmi) : null;
  if (!bmi && heightCm && weightKg) {
    bmi = Number((weightKg / Math.pow(heightCm / 100, 2)).toFixed(1));
  }

  const getBmiCategory = (val: number | null) => {
    if (!val) return { label: 'Unknown', color: 'text-slate-500 bg-slate-100 border-slate-200' };
    if (val < 18.5) return { label: 'Underweight', color: 'text-sky-700 bg-sky-50 border-sky-200' };
    if (val < 25) return { label: 'Normal weight', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (val < 30) return { label: 'Overweight', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    return { label: 'Obese (Class I+)', color: 'text-rose-700 bg-rose-50 border-rose-200' };
  };

  const bmiCat = getBmiCategory(bmi);
  const weightDelta = weightKg && goalWeightKg ? weightKg - goalWeightKg : null;

  const contraindications = (patient.medical_history && typeof patient.medical_history === 'object' && patient.medical_history.contraindications) || {};
  const vitals = (patient.medical_history && typeof patient.medical_history === 'object' && patient.medical_history.vitals) || {};

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm transition-opacity">
      {/* Click outside backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer */}
      <aside className="relative w-full max-w-xl bg-[#FAF8F5] h-full shadow-2xl flex flex-col border-l border-[#1A1F36]/10 z-10 animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1A1F36]/10 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#C4622D]/10 flex items-center justify-center text-[#C4622D]">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#1A1F36] tracking-tight">Patient Clinical Profile</h3>
              <p className="text-[11px] font-bold text-[#8896A4] uppercase tracking-wider">Comprehensive Medical Dossier</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#8896A4] hover:text-[#1A1F36] hover:bg-[#F5F0EB] transition-colors cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

          {/* Identity Card */}
          <div className="bg-white rounded-2xl p-5 border border-[#1A1F36]/8 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#C4622D] to-[#A8522A] text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-lg font-black text-[#1A1F36] leading-tight truncate">{fullName}</h4>
                  <span className="px-2.5 py-0.5 text-[10px] font-black rounded-full uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active Patient
                  </span>
                </div>
                
                <div className="flex items-center gap-3 mt-1 text-xs text-[#64748B] flex-wrap">
                  {age && <span>{age} years old</span>}
                  {gender && <span>• {gender.charAt(0).toUpperCase() + gender.slice(1)}</span>}
                  {patient.membership_tier && (
                    <span className="font-bold text-[#C4622D]">• {patient.membership_tier}</span>
                  )}
                </div>

                {/* Email with copy */}
                {patient.email && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-[#40516A]">
                    <Mail className="w-3.5 h-3.5 text-[#8896A4] shrink-0" />
                    <span className="truncate font-medium">{patient.email}</span>
                    <button
                      onClick={() => copyToClipboard(patient.email, 'email')}
                      className="p-1 hover:bg-[#F5F0EB] rounded text-[#8896A4] hover:text-[#1A1F36] transition-colors"
                      title="Copy email"
                    >
                      {copiedField === 'email' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                )}

                {/* Phone with direct link */}
                {patient.phone && patient.phone !== 'No Phone' && (
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-[#40516A]">
                    <Phone className="w-3.5 h-3.5 text-[#8896A4] shrink-0" />
                    <a href={`tel:${patient.phone}`} className="font-medium hover:underline text-[#0D9488]">
                      {patient.phone}
                    </a>
                    <button
                      onClick={() => copyToClipboard(patient.phone, 'phone')}
                      className="p-1 hover:bg-[#F5F0EB] rounded text-[#8896A4] hover:text-[#1A1F36] transition-colors"
                      title="Copy phone"
                    >
                      {copiedField === 'phone' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                )}

                {patient.address && (
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-[#64748B]">
                    <MapPin className="w-3.5 h-3.5 text-[#8896A4] shrink-0" />
                    <span className="truncate">{patient.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Vitals & Telemetry */}
          <div className="space-y-3">
            <h5 className="text-xs font-black uppercase tracking-widest text-[#8896A4] flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#C4622D]" /> Clinical Biometrics & Vitals
            </h5>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-[#1A1F36]/8 text-center shadow-xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#8896A4] block">Height</span>
                <span className="text-base font-black text-[#1A1F36] mt-0.5 block">{heightCm ? `${heightCm} cm` : '—'}</span>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-[#1A1F36]/8 text-center shadow-xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#8896A4] block">Weight</span>
                <span className="text-base font-black text-[#1A1F36] mt-0.5 block">{weightKg ? `${weightKg} kg` : '—'}</span>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-[#1A1F36]/8 text-center shadow-xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#8896A4] block">Goal</span>
                <span className="text-base font-black text-[#C4622D] mt-0.5 block">{goalWeightKg ? `${goalWeightKg} kg` : '—'}</span>
                {weightDelta !== null && weightDelta > 0 && (
                  <span className="text-[9px] font-bold text-emerald-600 block mt-0.5">-{weightDelta} kg</span>
                )}
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-[#1A1F36]/8 text-center shadow-xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#8896A4] block">BMI</span>
                <span className="text-base font-black text-[#1A1F36] mt-0.5 block">{bmi || '—'}</span>
                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md mt-1 inline-block border ${bmiCat.color}`}>
                  {bmiCat.label}
                </span>
              </div>
            </div>

            {(vitals.bp || vitals.hr) && (
              <div className="bg-white p-3 rounded-xl border border-[#1A1F36]/8 flex items-center justify-around text-xs">
                {vitals.bp && (
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#8896A4] block">Blood Pressure</span>
                    <span className="font-bold text-[#1A1F36]">{vitals.bp}</span>
                  </div>
                )}
                {vitals.hr && (
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#8896A4] block">Heart Rate</span>
                    <span className="font-bold text-[#1A1F36]">{vitals.hr}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Assessment Summary */}
          <div className="bg-white rounded-2xl p-4 border border-[#1A1F36]/8 shadow-sm space-y-2">
            <h5 className="text-xs font-black uppercase tracking-widest text-[#8896A4] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#C4622D]" /> Medical Assessment Summary
            </h5>
            <p className="text-xs font-medium text-[#40516A] leading-relaxed">
              {patient.assessment_summary || patient.extra_medical_info || 'No assessment summary recorded.'}
            </p>
            {patient.eligibility_reason && (
              <div className="mt-2 rounded-xl bg-amber-50 border border-amber-200/60 p-3 text-xs">
                <p className="font-bold text-amber-900 uppercase text-[10px] tracking-wider">Clinical Eligibility Rationale</p>
                <p className="font-medium text-amber-800 mt-0.5">{patient.eligibility_reason}</p>
              </div>
            )}
          </div>

          {/* Contraindications & Risk Assessment */}
          <div className="bg-white rounded-2xl p-4 border border-[#1A1F36]/8 shadow-sm space-y-3">
            <h5 className="text-xs font-black uppercase tracking-widest text-[#8896A4] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Contraindications & Red Flags
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#FAF8F5]">
                <span className="text-[#40516A] font-medium">MTC / MEN 2</span>
                <span className="font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded text-[10px]">
                  {contraindications.has_mtc_men2 === 'yes' ? 'FLAGGED' : 'Negative'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#FAF8F5]">
                <span className="text-[#40516A] font-medium">Pancreatitis</span>
                <span className="font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded text-[10px]">
                  {contraindications.has_pancreatitis === 'yes' ? 'FLAGGED' : 'Negative'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#FAF8F5]">
                <span className="text-[#40516A] font-medium">Active Cancer</span>
                <span className="font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded text-[10px]">
                  {contraindications.has_active_cancer === 'yes' ? 'FLAGGED' : 'Negative'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#FAF8F5]">
                <span className="text-[#40516A] font-medium">Severe GI Disease</span>
                <span className="font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded text-[10px]">
                  {contraindications.has_severe_gi_disease === 'yes' ? 'FLAGGED' : 'Negative'}
                </span>
              </div>
            </div>

            {patient.medical_risk_flags && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs">
                <span className="font-bold text-rose-900 text-[10px] uppercase tracking-wider block">Flagged Conditions</span>
                <p className="font-medium text-rose-800 mt-1">{patient.medical_risk_flags}</p>
              </div>
            )}
          </div>

          {/* Medication History & Proof */}
          <div className="bg-white rounded-2xl p-4 border border-[#1A1F36]/8 shadow-sm space-y-2">
            <h5 className="text-xs font-black uppercase tracking-widest text-[#8896A4] flex items-center gap-1.5">
              <Pill className="w-3.5 h-3.5 text-[#C4622D]" /> Medication & Treatment History
            </h5>
            <p className="text-xs font-medium text-[#40516A]">
              {patient.current_medications || (patient.medical_history?.medication_history?.type ? `GLP-1 History: ${patient.medical_history.medication_history.type}` : 'No active prescription medication reported.')}
            </p>

            {patient.medication_proof_url && (
              <a
                href={patient.medication_proof_url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFF4EC] text-[#C4622D] text-xs font-bold hover:bg-[#FFE8D9] transition-colors"
              >
                <ExternalLink className="w-3 h-3" /> View Uploaded Medication Proof
              </a>
            )}
          </div>

          {/* Lifestyle Preferences */}
          {(patient.local_food || patient.workout_preference) && (
            <div className="bg-white rounded-2xl p-4 border border-[#1A1F36]/8 shadow-sm space-y-2">
              <h5 className="text-xs font-black uppercase tracking-widest text-[#8896A4] flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-500" /> Lifestyle & Coaching Preferences
              </h5>
              <div className="space-y-1.5 text-xs text-[#40516A]">
                {patient.local_food && (
                  <div>
                    <span className="font-bold text-[#1A1F36]">Diet / Cuisine:</span> {patient.local_food}
                  </div>
                )}
                {patient.workout_preference && (
                  <div>
                    <span className="font-bold text-[#1A1F36]">Activity / Workout:</span> {patient.workout_preference}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Drawer Sticky Footer Actions */}
        <div className="p-4 border-t border-[#1A1F36]/10 bg-white flex items-center gap-3">
          {hasIssuedRx && onViewRx ? (
            <button
              onClick={() => {
                onClose();
                onViewRx();
              }}
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> View Issued Rx
            </button>
          ) : onIssueRx ? (
            <button
              onClick={() => {
                onClose();
                onIssueRx();
              }}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#0D9488] to-[#0F766E] text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:from-[#0B7A6F] hover:to-[#0D625C] shadow-sm transition-all cursor-pointer"
            >
              <Pill className="w-4 h-4" /> Issue E-Prescription
            </button>
          ) : null}

          <button
            onClick={onClose}
            className="py-3 px-5 rounded-xl border border-[#1A1F36]/15 text-[#40516A] font-bold text-xs hover:bg-[#F5F0EB] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </aside>
    </div>
  );
}
