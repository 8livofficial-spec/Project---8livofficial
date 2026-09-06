import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { normalizeProviderRole } from '@/lib/providerConsultations';
import { getAuthenticatedUser } from '@/lib/apiSecurity';
import { patientSearchOrFilter } from '@/lib/queryFilters';

function getAssessmentField(assessment: any, key: string) {
  if (assessment?.[key] !== undefined && assessment?.[key] !== null) return assessment[key];
  if (assessment?.medical_history && typeof assessment.medical_history === 'object') {
    return assessment.medical_history[key];
  }
  return null;
}

const riskFieldLabels: Record<string, string> = {
  has_mtc_men2: 'MTC or MEN 2 history',
  has_pancreatitis: 'Pancreatitis history',
  has_active_cancer: 'Active cancer treatment',
  has_severe_gi_disease: 'Severe gastrointestinal disease',
  is_pregnant_nursing: 'Pregnant, planning pregnancy, or breastfeeding',
  recent_opiate_use: 'Recent opiate medication use',
  has_severe_conditions: 'Severe condition flagged',
  high_priority_candidate: 'High priority candidate',
};

function isNegativeRiskValue(value: unknown): boolean {
  const normalized = String(value || '').trim().toLowerCase();
  return !normalized || ['no', 'false', 'none', 'none of above', 'none of the above', 'n/a'].includes(normalized);
}

function riskItems(value: unknown): string[] {
  if (value === null || value === undefined || value === '') return [];
  if (typeof value === 'boolean') return value ? ['Flagged'] : [];
  if (typeof value === 'number') return [String(value)];
  if (typeof value === 'string') return isNegativeRiskValue(value) ? [] : [value];
  if (Array.isArray(value)) return value.flatMap(riskItems);

  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) => {
      if (riskFieldLabels[key]) {
        return isNegativeRiskValue(entry) ? [] : [riskFieldLabels[key]];
      }
      return riskItems(entry);
    });
  }

  return [];
}

function getRiskFlags(assessment: any) {
  const flags = [
    getAssessmentField(assessment, 'hard_rejections'),
    getAssessmentField(assessment, 'contraindications'),
    getAssessmentField(assessment, 'review_conditions'),
    getAssessmentField(assessment, 'comorbidities'),
    ...Object.keys(riskFieldLabels).map(key => {
      const value = getAssessmentField(assessment, key);
      return value === true || String(value).toLowerCase() === 'yes' ? riskFieldLabels[key] : null;
    }),
  ]
    .flatMap(riskItems)
    .filter(Boolean);

  return Array.from(new Set(flags)).join(' | ') || null;
}

function getLatestConsultation(consultations: any[]) {
  return [...consultations].sort((a, b) => {
    const aTime = new Date(`${a.booking_date || a.created_at || ''} ${a.booking_time || ''}`).getTime() || new Date(a.created_at || 0).getTime();
    const bTime = new Date(`${b.booking_date || b.created_at || ''} ${b.booking_time || ''}`).getTime() || new Date(b.created_at || 0).getTime();
    return bTime - aTime;
  })[0] || null;
}

function getNextAppointment(consultations: any[]) {
  const now = Date.now();
  return consultations
    .filter((consultation) => ['scheduled', 'calling', 'attended'].includes(String(consultation.status || '').toLowerCase()))
    .map((consultation) => ({
      ...consultation,
      timestamp: new Date(`${consultation.booking_date || ''} ${consultation.booking_time || ''}`).getTime(),
    }))
    .filter((consultation) => Number.isFinite(consultation.timestamp) && consultation.timestamp >= now)
    .sort((a, b) => a.timestamp - b.timestamp)[0] || null;
}

export async function POST(req: Request) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { staffId, role: rawRole, page = 1, limit = 25, search = '' } = body;

    const isAdminAction = authUser.role === 'admin';
    const resolvedRole = isAdminAction ? normalizeProviderRole(String(rawRole || '')) : authUser.role;

    if (!['doctor', 'dietitian', 'nutritionist', 'fitness_coach', 'trainer'].includes(resolvedRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const role = (resolvedRole === 'trainer' ? 'fitness_coach' : resolvedRole) as 'doctor' | 'dietitian' | 'nutritionist' | 'fitness_coach';
    const targetStaffId = isAdminAction ? (staffId || authUser.user.id) : authUser.user.id;

    let matchingPatientIds: string[] = [];
    if (search.trim()) {
      const [matchedProfiles, matchedAssess] = await Promise.all([
        supabaseAdmin.from('profiles').select('id').or(patientSearchOrFilter(search)),
        supabaseAdmin.from('health_assessments').select('patient_id').or(patientSearchOrFilter(search, false))
      ]);
      const ids = new Set([
        ...(matchedProfiles.data || []).map((p: any) => p.id),
        ...(matchedAssess.data || []).map((a: any) => a.patient_id)
      ]);
      matchingPatientIds = Array.from(ids);
    }

    // For doctors: auto-sync any patients who had consultations with this doctor into care_team_assignments
    if (role === 'doctor') {
      try {
        const { data: doctorConsults } = await supabaseAdmin
          .from('doctor_consultations')
          .select('patient_id')
          .eq('doctor_id', targetStaffId);

        if (doctorConsults && doctorConsults.length > 0) {
          const consultPatientIds = Array.from(new Set(doctorConsults.map((c: any) => c.patient_id).filter(Boolean)));
          const { data: existingCta } = await supabaseAdmin
            .from('care_team_assignments')
            .select('patient_id, doctor_id')
            .in('patient_id', consultPatientIds);
          const existingMap = new Map((existingCta || []).map((c: any) => [c.patient_id, c.doctor_id]));

          const toUpsert = consultPatientIds
            .filter((pid: any) => existingMap.get(pid) !== targetStaffId)
            .map((pid: any) => ({
              patient_id: pid,
              doctor_id: targetStaffId,
              status: 'ACTIVE',
              updated_at: new Date().toISOString(),
            }));

          if (toUpsert.length > 0) {
            await supabaseAdmin
              .from('care_team_assignments')
              .upsert(toUpsert, { onConflict: 'patient_id' });
          }
        }
      } catch (syncErr) {
        console.warn('Non-blocking care team sync for doctor consultations:', syncErr);
      }
    }

    // 1. Fetch care team assignments for this staff member
    let assignmentsQuery = supabaseAdmin.from('care_team_assignments').select('*', { count: 'exact' });
    if (role === 'fitness_coach') {
      assignmentsQuery = assignmentsQuery.or(`fitness_coach_id.eq.${targetStaffId},trainer_id.eq.${targetStaffId}`);
    } else if (role === 'dietitian') {
      assignmentsQuery = assignmentsQuery.eq('dietitian_id', targetStaffId);
    } else if (role === 'nutritionist') {
      assignmentsQuery = assignmentsQuery.eq('nutritionist_id', targetStaffId);
    } else if (role === 'doctor') {
      assignmentsQuery = assignmentsQuery.eq('doctor_id', targetStaffId);
    }

    if (search.trim()) {
      if (matchingPatientIds.length > 0) {
        assignmentsQuery = assignmentsQuery.in('patient_id', matchingPatientIds);
      } else {
        return NextResponse.json({ patients: [], totalCount: 0, totalPages: 0 });
      }
    }

    const from = (page - 1) * limit;
    const to = page * limit - 1;

    const { data: assignments, error: assignErr, count } = await assignmentsQuery
      .range(from, to);

    if (assignErr) throw assignErr;

    if (!assignments || assignments.length === 0) {
      return NextResponse.json({ patients: [], totalCount: 0, totalPages: 0 });
    }

    const patientIds = assignments.map(a => a.patient_id);

    // Concurrently fetch profiles, assessments, logs, consultations, and prescriptions (5 parallel queries)
    const [profilesRes, assessmentsRes, logsRes, consultsRes, rxRes] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('id, first_name, last_name, full_name, email, phone_number, display_id, role, created_at')
        .in('id', patientIds),
      supabaseAdmin
        .from('health_assessments')
        .select('*')
        .in('patient_id', patientIds),
      supabaseAdmin
        .from('progress_logs')
        .select('user_id, weight_kg, created_at')
        .in('user_id', patientIds)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('doctor_consultations')
        .select('id, patient_id, doctor_id, booking_date, booking_time, status, prescription_text, prescription_type, prescription_notes, created_at, updated_at')
        .in('patient_id', patientIds)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('prescriptions')
        .select('id, patient_id, prescription_number, status, issued_at, created_at, diagnosis, valid_until, prescription_items(medicine_name, strength, dose, frequency, dosage_form)')
        .in('patient_id', patientIds)
        .in('status', ['ISSUED', 'ACTIVE', 'SIGNED', 'COMPLETED', 'REPLACED'])
        .order('created_at', { ascending: false })
    ]);

    if (profilesRes.error) throw profilesRes.error;
    if (assessmentsRes.error) throw assessmentsRes.error;
    if (logsRes.error) throw logsRes.error;
    if (consultsRes.error) throw consultsRes.error;

    const profiles = profilesRes.data || [];
    const assessments = assessmentsRes.data || [];
    const logs = logsRes.data || [];
    const consults = consultsRes.data || [];
    const patientRxs = rxRes.data || [];

    const profilesById = new Map((profiles || []).map((profile: any) => [profile.id, profile]));
    const assessmentsByPatientId = new Map((assessments || []).map((assessment: any) => [assessment.patient_id, assessment]));
    const logsByPatientId = new Map<string, any[]>();
    for (const log of logs || []) {
      const existing = logsByPatientId.get(log.user_id) || [];
      existing.push(log);
      logsByPatientId.set(log.user_id, existing);
    }
    const consultationsByPatientId = new Map<string, any[]>();
    for (const consultation of consults || []) {
      const existing = consultationsByPatientId.get(consultation.patient_id) || [];
      existing.push(consultation);
      consultationsByPatientId.set(consultation.patient_id, existing);
    }

    const rxsByPatientId = new Map<string, any[]>();
    for (const rx of patientRxs) {
      const existing = rxsByPatientId.get(rx.patient_id) || [];
      const primary = (rx.prescription_items || [])[0];
      const itemsSummary = (rx.prescription_items || [])
        .map((i: any) => `${i.medicine_name} (${i.strength}) - ${i.dose} ${i.frequency}`)
        .join(', ');
      existing.push({
        id: rx.id,
        booking_date: rx.issued_at ? new Date(rx.issued_at).toLocaleDateString('en-IN') : new Date(rx.created_at).toLocaleDateString('en-IN'),
        booking_time: rx.prescription_number,
        prescription_type: primary?.dosage_form || 'E-Prescription',
        prescription_text: itemsSummary || rx.diagnosis || 'Active E-Prescription',
        prescription_notes: rx.diagnosis,
        is_real_rx: true,
        prescription_number: rx.prescription_number,
        status: rx.status,
      });
      rxsByPatientId.set(rx.patient_id, existing);
    }

    // Assemble the data
    const enrichedPatients = assignments.map(assign => {
      const prof = profilesById.get(assign.patient_id) || {};
      const assess = assessmentsByPatientId.get(assign.patient_id) || {};
      const pLogs = logsByPatientId.get(assign.patient_id) || [];
      const pConsults = consultationsByPatientId.get(assign.patient_id) || [];

      // Provider status calculation
      const isPaymentDue = !assess.consultation_fee_paid && !assess.membership_tier;
      const hasWeightLogs = pLogs.some(l => {
        const diffDays = (new Date().getTime() - new Date(l.created_at).getTime()) / (1000 * 3600 * 24);
        return diffDays <= 7;
      });
      const isCheckInDue = pLogs.length > 0 && !hasWeightLogs;
      const guidance = role === 'dietitian'
        ? assign.dietitian_notes
        : role === 'nutritionist'
          ? assign.nutritionist_notes
          : assign.trainer_notes;
      const isGuidelinesDue = !guidance;
      
      const latestConsultation = getLatestConsultation(pConsults);
      const nextAppointment = getNextAppointment(pConsults);
      const completedConsultations = pConsults.filter(c => ['approved', 'rejected', 'completed'].includes(String(c.status || '').toLowerCase()));
      const realRxs = rxsByPatientId.get(assign.patient_id) || [];
      const legacyHistory = pConsults.filter(c => c.prescription_text || c.prescription_type || c.prescription_notes);
      const prescriptionHistory = [...realRxs, ...legacyHistory];

      let statusLabel = 'Active';
      let statusColor = 'bg-green-50 text-green-700';

      if (role === 'doctor') {
        if (!latestConsultation) {
          statusLabel = 'Medical Review Pending';
          statusColor = 'bg-amber-50 text-amber-700';
        } else if (['scheduled', 'calling', 'attended'].includes(String(latestConsultation.status || '').toLowerCase())) {
          statusLabel = latestConsultation.status === 'attended' ? 'Medical Review Pending' : 'Follow-up Pending';
          statusColor = 'bg-amber-50 text-amber-700';
        } else if (['approved', 'completed'].includes(String(latestConsultation.status || '').toLowerCase())) {
          statusLabel = 'Clinical Review Complete';
          statusColor = 'bg-green-50 text-green-700';
        } else if (String(latestConsultation.status || '').toLowerCase() === 'rejected') {
          statusLabel = 'Not Approved';
          statusColor = 'bg-red-50 text-red-700';
        } else {
          statusLabel = 'Medical Review Pending';
          statusColor = 'bg-amber-50 text-amber-700';
        }
      } else if (isPaymentDue) {
        statusLabel = 'Awaiting Payment';
        statusColor = 'bg-red-50 text-red-700';
      } else if (isCheckInDue || pLogs.length === 0) {
        statusLabel = 'Awaiting Check-in';
        statusColor = 'bg-amber-50 text-amber-700';
      } else if (isGuidelinesDue) {
        statusLabel = 'Pending Guidelines';
        statusColor = 'bg-amber-50 text-amber-700';
      }

      const membershipTier = assess.membership_tier || assess.membership_status || 'Not selected';

      const firstName = prof.first_name || assess.first_name || '';
      const lastName = prof.last_name || assess.last_name || '';
      const fullName = `${firstName} ${lastName}`.trim() || prof.full_name || prof.display_id || prof.email || 'Patient';
      const email = prof.email || '';
      const phone = prof.phone_number || assess.phone_number || 'No Phone';
      const heightCm = assess.height_cm ? Number(assess.height_cm) : null;
      const weightKg = assess.weight_kg ? Number(assess.weight_kg) : (pLogs[0]?.weight_kg ? Number(pLogs[0].weight_kg) : null);
      const goalWeightKg = assess.goal_weight_kg ? Number(assess.goal_weight_kg) : null;
      const age = assess.age ? Number(assess.age) : null;
      const gender = assess.gender || (typeof assess.medical_history === 'object' ? assess.medical_history?.gender : null) || null;
      const calculatedBmi = heightCm && weightKg
        ? Number((weightKg / Math.pow(heightCm / 100, 2)).toFixed(1))
        : (assess.bmi ? Number(parseFloat(assess.bmi).toFixed(1)) : null);

      // Synthesize clean clinical assessment summary if not explicitly provided
      let assessmentSummary = assess.assessment_summary || assess.extra_medical_info || null;
      if (!assessmentSummary && assess.medical_history) {
        const mh = assess.medical_history;
        const details: string[] = [];
        if (age && gender) details.push(`Patient: ${age}-year-old ${gender}`);
        if (heightCm && weightKg) details.push(`Height: ${heightCm} cm, Current Weight: ${weightKg} kg (BMI: ${calculatedBmi || '—'})`);
        if (goalWeightKg && weightKg) {
          const delta = weightKg - goalWeightKg;
          details.push(`Goal Weight: ${goalWeightKg} kg (${delta > 0 ? `Target reduction: -${delta} kg` : `Target delta: ${delta} kg`})`);
        }
        if (mh.vitals?.bp) details.push(`Blood Pressure: ${mh.vitals.bp}, HR: ${mh.vitals.hr || 'Normal'}`);
        if (mh.eligibility_reason && mh.eligibility_reason !== 'None of the above') {
          details.push(`Clinical Note: ${mh.eligibility_reason}`);
        }
        if (mh.medication_history?.type) details.push(`Medication history: ${mh.medication_history.type}`);
        if (details.length > 0) {
          assessmentSummary = details.join(' • ');
        }
      }

      return {
        id: assign.id,
        patient_id: assign.patient_id,
        name: fullName,
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        email,
        phone,
        phone_number: phone,
        display_id: prof.display_id || null,
        age,
        gender,
        address: assess.address || null,
        membershipTier,
        membership_tier: membershipTier,
        onboardingCompleted: Boolean(assess.membership_tier),
        height_cm: heightCm,
        weight_kg: weightKg,
        goal_weight_kg: goalWeightKg,
        bmi: calculatedBmi,
        assessment_summary: assessmentSummary,
        medical_history: assess.medical_history || null,
        extra_medical_info: assess.extra_medical_info || null,
        eligibility_status: assess.eligibility_status || getAssessmentField(assess, 'eligibility_status') || (typeof assess.is_eligible === 'boolean' ? (assess.is_eligible ? 'ELIGIBLE' : 'NOT_ELIGIBLE') : null),
        eligibility_reason: assess.eligibility_reason || getAssessmentField(assess, 'eligibility_reason') || getAssessmentField(assess, 'eligibility_message') || null,
        medical_risk_flags: getRiskFlags(assess),
        current_medications: assess.current_medications || assess.medications || getAssessmentField(assess, 'medication_history') || null,
        medication_history: assess.medication_history || getAssessmentField(assess, 'medication_history') || null,
        medication_proof_url: getAssessmentField(assess, 'medication_proof_url') || getAssessmentField(assess, 'medication_proof') || assess.medication_proof_url || assess.medication_proof || null,
        local_food: assess.local_food || null,
        workout_preference: assess.workout_preference || null,
        diagnosis_summary: assess.diagnosis_summary || completedConsultations[0]?.prescription_notes || null,
        follow_up_notes: assess.follow_up_instruction || assess.follow_up_notes || completedConsultations[0]?.prescription_notes || null,
        latest_consultation_status: latestConsultation?.status || null,
        latest_consultation: latestConsultation,
        next_appointment: nextAppointment,
        previous_consultations: pConsults,
        prescription_history: prescriptionHistory,
        trainer_notes: assign.trainer_notes || null,
        dietitian_notes: assign.dietitian_notes || null,
        nutritionist_notes: assign.nutritionist_notes || null,
        status_label: statusLabel,
        status_color: statusColor,
        weight_logs: pLogs.map(l => ({
          date: new Date(l.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
          weight: parseFloat(l.weight_kg)
        })),
        consultations: pConsults
      };
    });

    return NextResponse.json({
      patients: enrichedPatients,
      totalCount: count || 0,
      totalPages: Math.ceil((count || 0) / limit)
    });
  } catch (err: any) {
    console.error('Error in POST /api/staff/patients:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
