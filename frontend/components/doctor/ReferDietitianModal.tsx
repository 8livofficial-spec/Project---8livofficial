'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Apple, X, AlertCircle, CheckCircle2, Clock, ShieldAlert, Sparkles, Send } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export interface ReferDietitianModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: any;
  onSuccess?: () => void;
}

const PRESET_REASONS = [
  'GLP-1 Metabolic Nutrition Support',
  'Weight Loss Plateau',
  'Pre-diabetes & Insulin Resistance',
  'GI Side-Effect Management (Nausea/Reflux)',
  'PCOS & Metabolic Health',
  'Dyslipidemia / Cholesterol Management',
  'Custom Reason',
];

export default function ReferDietitianModal({
  isOpen,
  onClose,
  patient,
  onSuccess,
}: ReferDietitianModalProps) {
  const [selectedReason, setSelectedReason] = useState(PRESET_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [priority, setPriority] = useState<'ROUTINE' | 'URGENT'>('ROUTINE');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen || !patient) return null;

  const patientName =
    patient.name ||
    `${patient.first_name || ''} ${patient.last_name || ''}`.trim() ||
    patient.full_name ||
    patient.display_id ||
    'Patient';

  const patientId = patient.id || patient.patient_id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const finalReason = selectedReason === 'Custom Reason' ? customReason.trim() : selectedReason;
    if (!finalReason) {
      setError('Please specify a reason for the clinical nutrition referral.');
      return;
    }

    if (!patientId) {
      setError('Missing patient identifier. Please select a valid patient.');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch('/api/dietitian/referrals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patient_id: patientId,
          reason: finalReason,
          priority,
          clinical_notes: clinicalNotes.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to submit clinical referral');
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Error creating referral');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 bg-[#0D9488] text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
              <Apple className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-teal-100">Interdisciplinary Care Team</p>
              <h3 className="text-lg font-black text-white">Refer to Clinical Dietitian</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Patient Summary Strip */}
        <div className="px-6 py-3 bg-[#FAF8F5] border-b border-[#E8DED4] flex items-center justify-between text-xs">
          <div>
            <span className="font-bold text-[#1A1F36]">{patientName}</span>
            <span className="text-slate-400 ml-2">
              {patient.gender ? `${patient.gender} • ` : ''}
              {patient.age ? `${patient.age} yrs` : ''}
            </span>
          </div>
          {patient.weight_kg && (
            <span className="px-2 py-0.5 rounded-md bg-white border border-[#E8DED4] font-bold text-slate-600 text-[11px]">
              {patient.weight_kg} kg
            </span>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Referral transmitted to the Dietitian Care Portal!</span>
            </div>
          )}

          {/* Reason for Referral */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-2">
              Clinical Reason for Nutrition Therapy
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {PRESET_REASONS.map((reason) => (
                <button
                  type="button"
                  key={reason}
                  onClick={() => setSelectedReason(reason)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    selectedReason === reason
                      ? 'bg-[#0D9488] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>

            {selectedReason === 'Custom Reason' && (
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Enter specific clinical justification..."
                className="w-full mt-2 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/10 outline-none"
                autoFocus
              />
            )}
          </div>

          {/* Priority Level */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-2">
              Referral Priority Level
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPriority('ROUTINE')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  priority === 'ROUTINE'
                    ? 'border-[#0D9488] bg-teal-50/50 text-[#0F766E] ring-2 ring-[#0D9488]/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <Clock className="w-4 h-4 mt-0.5 text-[#0D9488]" />
                <div>
                  <p className="text-xs font-bold">Routine Priority</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Standard onboarding within 48h</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPriority('URGENT')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  priority === 'URGENT'
                    ? 'border-rose-500 bg-rose-50/50 text-rose-800 ring-2 ring-rose-500/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <ShieldAlert className="w-4 h-4 mt-0.5 text-rose-600" />
                <div>
                  <p className="text-xs font-bold">Urgent Priority</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">High clinical concern / Acute</p>
                </div>
              </button>
            </div>
          </div>

          {/* Confidential Doctor's Clinical Notes */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1.5">
              Doctor's Clinical Notes & Guidance for Dietitian
            </label>
            <textarea
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              rows={3}
              placeholder="e.g. Patient recently titrated on semaglutide 0.5mg; complaints of mild post-prandial fullness; needs high-protein small frequent meals with 2.5L hydration target."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/10 outline-none resize-none"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              These notes will appear directly on the dietitian's triage screen when reviewing this referral.
            </p>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || success}
              className="px-6 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Transmitting...' : 'Send Digital Referral'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
