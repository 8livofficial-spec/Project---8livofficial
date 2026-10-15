'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  Users, Search, Filter, Download, Upload, Eye, MoreVertical,
  Stethoscope, Pill, Apple, User, ShieldCheck, AlertCircle,
  CheckCircle2, X, Printer, Calendar, Scale, Activity, ArrowUpDown,
  RefreshCw, FileText, ChevronRight, Phone, Mail, ExternalLink
} from 'lucide-react';
import {
  generateSinglePatientPdfReport,
  generatePatientRosterPdfReport,
  downloadPdfBlob
} from '@/lib/patientReportPdfService';

interface Patient {
  id: string;
  patient_id?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  display_id?: string;
  email?: string;
  phone?: string;
  phone_number?: string;
  age?: number | null;
  gender?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  goal_weight_kg?: number | null;
  bmi?: number | null;
  status_label?: string;
  status_color?: string;
  eligibility_status?: string | null;
  eligibility_reason?: string | null;
  medical_risk_flags?: any;
  assessment_summary?: string | null;
  medical_history?: any;
  current_medications?: any;
  medication_history?: any;
  latest_consultation?: any;
  next_appointment?: any;
  prescription_history?: any[];
  weight_logs?: any[];
  [key: string]: any;
}

interface DoctorPatientTableViewProps {
  patients: Patient[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  searchQuery: string;
  onSearchChange: (search: string) => void;
  onPageChange: (page: number) => void;
  onViewProfile: (patient: Patient) => void;
  onIssueRx: (patient: Patient) => void;
  onViewRx?: (rx: any) => void;
  onReferDietitian: (patient: Patient) => void;
  doctorPrescriptions?: any[];
  onRefresh?: () => void;
}

function getPatientDisplayName(p: Patient): string {
  const byName = `${p?.first_name || ''} ${p?.last_name || ''}`.trim();
  if (byName) return byName;
  if (p?.name && p.name !== 'Patient' && !p.name.includes('@')) return p.name;
  if (p?.full_name) return p.full_name;
  if (p?.display_id) return p.display_id;
  return p?.email || 'Patient';
}

function getPatientBmi(p: Patient): string {
  if (p?.bmi) return Number(p.bmi).toFixed(1);
  if (p?.weight_kg && p?.height_cm) {
    return (Number(p.weight_kg) / Math.pow(Number(p.height_cm) / 100, 2)).toFixed(1);
  }
  return '—';
}

function getBmiBadge(bmiStr: string) {
  const bmi = parseFloat(bmiStr);
  if (isNaN(bmi)) return { text: 'N/A', cls: 'bg-slate-100 text-slate-600' };
  if (bmi < 18.5) return { text: 'Underweight', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
  if (bmi < 25) return { text: 'Healthy', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (bmi < 30) return { text: 'Overweight', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { text: 'Obese', cls: 'bg-rose-50 text-rose-700 border-rose-200' };
}

export default function DoctorPatientTableView({
  patients,
  totalCount,
  totalPages,
  currentPage,
  searchQuery,
  onSearchChange,
  onPageChange,
  onViewProfile,
  onIssueRx,
  onViewRx,
  onReferDietitian,
  doctorPrescriptions = [],
  onRefresh
}: DoctorPatientTableViewProps) {
  const [activeMenuPatientId, setActiveMenuPatientId] = useState<string | null>(null);
  const [detailModalPatient, setDetailModalPatient] = useState<Patient | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStatusMsg, setImportStatusMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Export Full Roster PDF Report
  const handleExportRosterPdf = async () => {
    if (!patients.length) {
      alert('No patient data to export.');
      return;
    }
    try {
      setIsExportingPdf(true);
      const pdfBytes = await generatePatientRosterPdfReport(patients, 'Attending Physician');
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadPdfBlob(pdfBytes, `8liv_patients_roster_${dateStr}.pdf`);
    } catch (err) {
      console.error('Failed to generate roster PDF:', err);
      alert('Failed to generate PDF report.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Export Single Patient PDF Report
  const handleExportPatientPdf = async (patient: Patient) => {
    try {
      setIsExportingPdf(true);
      const pdfBytes = await generateSinglePatientPdfReport(patient, 'Attending Physician');
      const cleanName = getPatientDisplayName(patient).toLowerCase().replace(/[^a-z0-9]/g, '_');
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadPdfBlob(pdfBytes, `8liv_patient_report_${cleanName}_${dateStr}.pdf`);
    } catch (err) {
      console.error('Failed to generate single patient PDF:', err);
      alert('Failed to generate patient PDF report.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Filter patients by status
  const filteredPatients = useMemo(() => {
    if (statusFilter === 'ALL') return patients;
    return patients.filter((p) => {
      const label = (p.status_label || '').toLowerCase();
      if (statusFilter === 'COMPLETE') return label.includes('complete');
      if (statusFilter === 'PENDING') return label.includes('pending');
      return true;
    });
  }, [patients, statusFilter]);

  // Export Patients to CSV
  const handleExportCsv = () => {
    if (!patients.length) {
      alert('No patient data to export.');
      return;
    }

    const headers = [
      'Patient ID',
      'Full Name',
      'Display ID',
      'Email',
      'Phone',
      'Age',
      'Gender',
      'Height (cm)',
      'Current Weight (kg)',
      'Goal Weight (kg)',
      'BMI',
      'Clinical Status',
      'Eligibility Status',
      'Next Appointment'
    ];

    const rows = patients.map((p) => {
      const nextAppt = p.next_appointment?.booking_date
        ? `${p.next_appointment.booking_date} ${p.next_appointment.booking_time || ''}`.trim()
        : 'Not scheduled';

      return [
        `"${p.id || p.patient_id || ''}"`,
        `"${getPatientDisplayName(p).replace(/"/g, '""')}"`,
        `"${p.display_id || ''}"`,
        `"${p.email || ''}"`,
        `"${p.phone || p.phone_number || ''}"`,
        p.age || '',
        `"${p.gender || ''}"`,
        p.height_cm || '',
        p.weight_kg || '',
        p.goal_weight_kg || '',
        getPatientBmi(p),
        `"${p.status_label || 'Active'}"`,
        `"${p.eligibility_status || 'NOT_RECORDED'}"`,
        `"${nextAppt}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `8liv_patients_roster_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export Single Patient Record
  const handleExportSinglePatient = (patient: Patient) => {
    const jsonStr = JSON.stringify(patient, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `patient_${patient.id || 'record'}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Print clinical summary
  const handlePrintPatientSummary = (patient: Patient) => {
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      alert('Please allow popups to print/export patient summary.');
      return;
    }

    const name = getPatientDisplayName(patient);
    const bmi = getPatientBmi(patient);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Clinical Summary - ${name}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; padding: 40px; line-height: 1.5; }
            .header { border-bottom: 2px solid #0f766e; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
            .logo { font-size: 22px; font-weight: 900; color: #0f766e; }
            .badge { font-size: 11px; font-weight: 700; background: #f0fdf4; color: #166534; padding: 4px 10px; border-radius: 9999px; border: 1px solid #bbf7d0; text-transform: uppercase; }
            .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; text-align: center; }
            .card-title { font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
            .card-value { font-size: 18px; font-weight: 800; color: #0f172a; }
            .section { margin-bottom: 24px; }
            .section-title { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #0f766e; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 10px; }
            .section-content { font-size: 13px; color: #334155; line-height: 1.6; }
            .footer { font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 40px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">8Liv Health • Endocrinology Clinical Case</div>
              <h1 style="margin: 6px 0 0; font-size: 20px; font-weight: 800;">${name}</h1>
              <p style="margin: 2px 0 0; font-size: 12px; color: #64748b;">ID: ${patient.display_id || patient.id} • ${patient.email || ''} • ${patient.phone || patient.phone_number || ''}</p>
            </div>
            <div>
              <span class="badge">${patient.status_label || 'Clinical Active'}</span>
            </div>
          </div>

          <div class="grid">
            <div class="card">
              <div class="card-title">Height</div>
              <div class="card-value">${patient.height_cm ? `${patient.height_cm} cm` : '—'}</div>
            </div>
            <div class="card">
              <div class="card-title">Current Weight</div>
              <div class="card-value">${patient.weight_kg ? `${patient.weight_kg} kg` : '—'}</div>
            </div>
            <div class="card">
              <div class="card-title">Goal Weight</div>
              <div class="card-value">${patient.goal_weight_kg ? `${patient.goal_weight_kg} kg` : '—'}</div>
            </div>
            <div class="card">
              <div class="card-title">BMI</div>
              <div class="card-value">${bmi}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Assessment Summary</div>
            <div class="section-content">${patient.assessment_summary || 'Baseline metabolic assessment completed.'}</div>
          </div>

          <div class="section">
            <div class="section-title">Medical Risk Flags & Contraindications</div>
            <div class="section-content">${patient.medical_risk_flags || 'No high-risk contraindications recorded.'}</div>
          </div>

          <div class="section">
            <div class="section-title">Eligibility & Clinical Status</div>
            <div class="section-content">
              Status: <strong>${patient.eligibility_status || 'ELIGIBLE'}</strong><br/>
              Clinical Review: <strong>${patient.status_label || 'Complete'}</strong>
            </div>
          </div>

          <div class="footer">
            Confidential Medical Record • Generated from 8Liv Doctor Portal on ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Handle CSV file upload preview
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = String(event.target?.result || '');
        const lines = text.split('\n').filter((l) => l.trim().length > 0);
        if (lines.length <= 1) {
          setImportStatusMsg('File appears empty or missing rows.');
          return;
        }
        setImportStatusMsg(`Loaded ${lines.length - 1} records from "${file.name}". Ready to sync.`);
      } catch (err: any) {
        setImportStatusMsg(`Error reading file: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col flex-1 min-w-0 bg-white rounded-[24px] border border-slate-200/80 shadow-xs overflow-hidden">
      
      {/* ── Top Header Toolbar ── */}
      <div className="p-5 sm:p-6 border-b border-slate-200/80 bg-gradient-to-r from-slate-50/50 via-white to-slate-50/30">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                <Users className="w-5 h-5 text-teal-600" />
                Assigned Patients Roster
              </h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200/60">
                {totalCount} {totalCount === 1 ? 'Patient' : 'Patients'}
              </span>
            </div>
            <p className="text-xs font-medium text-slate-500 mt-1">
              Review patient records, vitals, eligibility, and take immediate clinical actions.
            </p>
          </div>

          {/* Action buttons: Export / Import / Refresh */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
                title="Refresh patient list"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                <span>Refresh</span>
              </button>
            )}

            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
              title="Import or upload patient records"
            >
              <Upload className="w-3.5 h-3.5 text-teal-600" />
              <span>Import</span>
            </button>

            <button
              onClick={handleExportRosterPdf}
              disabled={isExportingPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-black rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
              title="Export complete patient roster to official PDF report"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{isExportingPdf ? 'Generating PDF...' : 'Export PDF Report'}</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
              title="Export patient roster to CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Search & Status Filter Row */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, email, phone, or patient ID..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                All ({patients.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('COMPLETE')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${statusFilter === 'COMPLETE' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Reviewed
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('PENDING')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${statusFilter === 'PENDING' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Pending
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Patient Row Table ── */}
      <div className="flex-1 overflow-x-auto">
        {filteredPatients.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <Users className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-base font-black text-slate-800">No patients found</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              {searchQuery ? `No matching records found for "${searchQuery}".` : 'No patients have been assigned to your panel yet.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/75 text-[11px] font-black uppercase tracking-wider text-slate-500 select-none">
                <th className="py-3.5 pl-6 pr-4">Patient</th>
                <th className="py-3.5 px-4">Clinical Status</th>
                <th className="py-3.5 px-4">Vitals & Metrics</th>
                <th className="py-3.5 px-4">Eligibility</th>
                <th className="py-3.5 px-4">Next Appointment</th>
                <th className="py-3.5 pl-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredPatients.map((p) => {
                const name = getPatientDisplayName(p);
                const bmi = getPatientBmi(p);
                const bmiBadge = getBmiBadge(bmi);
                const matchingRx = (p as any)?.prescription || doctorPrescriptions.find(
                  (rx) => rx.patient_id === p.id && !['DRAFT', 'REVOKED', 'CANCELLED', 'REPLACED'].includes(rx.status)
                );

                const nextAppt = p.next_appointment?.booking_date
                  ? `${p.next_appointment.booking_date} ${p.next_appointment.booking_time ? `at ${p.next_appointment.booking_time}` : ''}`
                  : null;

                const initials = name
                  .split(' ')
                  .map((n) => n[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join('')
                  .toUpperCase() || 'PT';

                const isMenuOpen = activeMenuPatientId === p.id;

                return (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => setDetailModalPatient(p)}
                  >
                    {/* 1. Patient Column */}
                    <td className="py-4 pl-6 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 group-hover:text-teal-700 transition-colors truncate">
                              {name}
                            </span>
                            {p.display_id && (
                              <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                {p.display_id}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            {p.email && <span className="truncate max-w-[160px]">{p.email}</span>}
                            {p.phone && p.phone !== 'No Phone' && <span>• {p.phone}</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 2. Clinical Status Column */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${p.status_color || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                        {p.status_label || 'Active'}
                      </span>
                    </td>

                    {/* 3. Vitals Column */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">
                            {p.weight_kg ? `${p.weight_kg} kg` : '—'}
                          </span>
                          {p.goal_weight_kg && (
                            <span className="text-[11px] text-slate-400 font-medium">
                              ➔ Goal: {p.goal_weight_kg} kg
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500 font-medium">
                            {p.height_cm ? `${p.height_cm} cm` : '—'}
                          </span>
                          {bmi !== '—' && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${bmiBadge.cls}`}>
                              BMI {bmi}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 4. Eligibility Column */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                        p.eligibility_status === 'ELIGIBLE'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : p.eligibility_status === 'REVIEW_REQUIRED'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {p.eligibility_status || 'RECORDED'}
                      </span>
                    </td>

                    {/* 5. Next Appointment Column */}
                    <td className="py-4 px-4 whitespace-nowrap text-slate-600 font-medium">
                      {nextAppt ? (
                        <div className="flex items-center gap-1.5 text-slate-800">
                          <Calendar className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span>{nextAppt}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Not scheduled</span>
                      )}
                    </td>

                    {/* 6. Action Column */}
                    <td
                      className="py-4 pl-4 pr-6 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-2">
                        {/* Primary VIEW button */}
                        <button
                          onClick={() => setDetailModalPatient(p)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition-colors shadow-2xs cursor-pointer"
                          title="View clinical details"
                        >
                          <Eye className="w-3.5 h-3.5 text-teal-600" />
                          <span>View</span>
                        </button>

                        {/* Three Dots Menu Container */}
                        <div className="relative">
                          <button
                            onClick={() => setActiveMenuPatientId(isMenuOpen ? null : p.id)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="More actions"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {/* Action Dropdown Menu */}
                          {isMenuOpen && (
                            <>
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setActiveMenuPatientId(null)}
                              />
                              <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-1.5 z-50 text-left animate-in fade-in zoom-in-95 duration-100">
                                <button
                                  onClick={() => {
                                    setActiveMenuPatientId(null);
                                    setDetailModalPatient(p);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5 text-teal-600" />
                                  <span>View Clinical Record</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setActiveMenuPatientId(null);
                                    onViewProfile(p);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                                >
                                  <User className="w-3.5 h-3.5 text-teal-600" />
                                  <span>Patient Profile</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setActiveMenuPatientId(null);
                                    onIssueRx(p);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                                >
                                  <Pill className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>Issue Prescription</span>
                                </button>

                                {matchingRx && onViewRx && (
                                  <button
                                    onClick={() => {
                                      setActiveMenuPatientId(null);
                                      onViewRx(matchingRx);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition-colors"
                                  >
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>View Issued Rx</span>
                                  </button>
                                )}

                                <button
                                  onClick={() => {
                                    setActiveMenuPatientId(null);
                                    onReferDietitian(p);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                                >
                                  <Apple className="w-3.5 h-3.5 text-teal-600" />
                                  <span>Refer to Dietitian</span>
                                </button>

                                <div className="border-t border-slate-100 my-1" />

                                <button
                                  onClick={() => {
                                    setActiveMenuPatientId(null);
                                    handleExportPatientPdf(p);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-teal-800 hover:bg-teal-50 transition-colors"
                                >
                                  <FileText className="w-3.5 h-3.5 text-teal-600" />
                                  <span>Export PDF Report</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setActiveMenuPatientId(null);
                                    handleExportSinglePatient(p);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                                >
                                  <Download className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Export Record (JSON)</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setActiveMenuPatientId(null);
                                    handlePrintPatientSummary(p);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                                >
                                  <Printer className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Print Clinical Sheet</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Table Footer Pagination ── */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-slate-200/80 bg-slate-50/50 flex items-center justify-between">
          <p className="text-xs text-slate-500 font-semibold">
            Showing Page <strong className="text-slate-800">{currentPage}</strong> of <strong className="text-slate-800">{totalPages}</strong> ({totalCount} total)
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ── CLINICAL CASE FILE "VIEW" MODAL ── */}
      {/* ========================================================================= */}
      {detailModalPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-[28px] max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-teal-50/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                    {getPatientDisplayName(detailModalPatient)}
                  </h3>
                  {detailModalPatient.display_id && (
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                      ID: {detailModalPatient.display_id}
                    </span>
                  )}
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${detailModalPatient.status_color || 'bg-slate-100 text-slate-700'}`}>
                    {detailModalPatient.status_label || 'Active'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                  <span className="font-bold text-teal-700 flex items-center gap-1">
                    <Stethoscope className="w-3.5 h-3.5" /> Endocrinology Case File
                  </span>
                  {detailModalPatient.email && <span>• {detailModalPatient.email}</span>}
                  {detailModalPatient.phone && <span>• {detailModalPatient.phone}</span>}
                </div>
              </div>

              {/* Header Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleExportPatientPdf(detailModalPatient)}
                  disabled={isExportingPdf}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                  title="Download official PDF report for this patient"
                >
                  <FileText className="w-3.5 h-3.5 text-teal-600" />
                  <span>{isExportingPdf ? 'Generating PDF...' : 'Export PDF'}</span>
                </button>

                <button
                  onClick={() => handlePrintPatientSummary(detailModalPatient)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
                  title="Print clinical summary"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  <span>Print</span>
                </button>

                <button
                  onClick={() => handleExportSinglePatient(detailModalPatient)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
                  title="Export record to JSON"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Export</span>
                </button>

                <button
                  onClick={() => {
                    const p = detailModalPatient;
                    setDetailModalPatient(null);
                    onIssueRx(p);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-colors cursor-pointer"
                >
                  <Pill className="w-3.5 h-3.5" />
                  <span>Issue Rx</span>
                </button>

                <button
                  onClick={() => setDetailModalPatient(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors ml-2 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* 1. Vitals & Key Metrics Card Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Height</p>
                  <p className="text-xl font-black text-slate-900">
                    {detailModalPatient.height_cm ? `${detailModalPatient.height_cm} cm` : '—'}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Current Weight</p>
                  <p className="text-xl font-black text-slate-900">
                    {detailModalPatient.weight_kg ? `${detailModalPatient.weight_kg} kg` : '—'}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Goal Weight</p>
                  <p className="text-xl font-black text-teal-600">
                    {detailModalPatient.goal_weight_kg ? `${detailModalPatient.goal_weight_kg} kg` : '—'}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">BMI</p>
                  <div className="flex items-center justify-center gap-1.5">
                    <p className="text-xl font-black text-slate-900">{getPatientBmi(detailModalPatient)}</p>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getBmiBadge(getPatientBmi(detailModalPatient)).cls}`}>
                      {getBmiBadge(getPatientBmi(detailModalPatient)).text}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Assessment Summary & Medical Risk Flags */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-teal-600" />
                    Clinical Assessment Summary
                  </h4>
                  <p className="text-xs leading-relaxed text-slate-600 font-medium">
                    {detailModalPatient.assessment_summary || detailModalPatient.extra_medical_info || 'Patient assessment completed without recorded secondary contraindications.'}
                  </p>
                  {detailModalPatient.local_food && (
                    <div className="pt-2 text-[11px] text-slate-500">
                      <strong>Food Preference:</strong> {detailModalPatient.local_food}
                    </div>
                  )}
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    Medical Risk Flags
                  </h4>
                  {detailModalPatient.medical_risk_flags ? (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800">
                      {String(detailModalPatient.medical_risk_flags)}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 font-medium">
                      No critical medical risk flags or adverse history recorded.
                    </p>
                  )}
                </div>
              </div>

              {/* 3. Eligibility & Referrals Row */}
              <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Eligibility Status</p>
                  <p className="text-sm font-black text-slate-900 mt-0.5">
                    {detailModalPatient.eligibility_status || 'ELIGIBLE'}
                  </p>
                  {detailModalPatient.eligibility_reason && (
                    <p className="text-xs text-slate-500 mt-0.5">{detailModalPatient.eligibility_reason}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const p = detailModalPatient;
                      setDetailModalPatient(null);
                      onReferDietitian(p);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-teal-300 bg-teal-50 hover:bg-teal-100 text-teal-800 transition-colors cursor-pointer"
                  >
                    <Apple className="w-3.5 h-3.5 text-teal-600" />
                    <span>Refer to Dietitian</span>
                  </button>

                  <button
                    onClick={() => {
                      const p = detailModalPatient;
                      setDetailModalPatient(null);
                      onViewProfile(p);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 transition-colors cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>Full Profile Drawer</span>
                  </button>
                </div>
              </div>

              {/* 4. Consultation History preview */}
              {Array.isArray(detailModalPatient.consultations) && detailModalPatient.consultations.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-teal-600" />
                    Recent Consultations
                  </h4>
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                    {detailModalPatient.consultations.slice(0, 3).map((c: any) => (
                      <div key={c.id} className="p-3.5 bg-white flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-slate-900">
                            {c.booking_date} {c.booking_time ? `• ${c.booking_time}` : ''}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Status: <span className="font-semibold">{c.status}</span>
                            {c.prescription_type && ` • ${c.prescription_type}`}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {c.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-400 font-semibold">
                8Liv Health Provider Case Management
              </span>
              <button
                onClick={() => setDetailModalPatient(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ── IMPORT MODAL ── */}
      {/* ========================================================================= */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Upload className="w-4 h-4 text-teal-600" />
                Import / Sync Patient Records
              </h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportStatusMsg(null);
                }}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Upload a <strong>.CSV</strong> or <strong>.JSON</strong> file exported from your clinical registry to import and sync patient metadata.
            </p>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-8 border-2 border-dashed border-slate-200 hover:border-teal-500 rounded-2xl text-center bg-slate-50/50 hover:bg-teal-50/20 transition-all cursor-pointer"
            >
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">Click to choose CSV or JSON file</p>
              <p className="text-[11px] text-slate-400 mt-1">Files up to 10 MB supported</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,application/json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {importStatusMsg && (
              <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs font-bold text-teal-800">
                {importStatusMsg}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportStatusMsg(null);
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onRefresh) onRefresh();
                  setShowImportModal(false);
                  setImportStatusMsg(null);
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white cursor-pointer"
              >
                Sync with Database
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
