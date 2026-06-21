import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { normalizeProviderRole } from '@/lib/providerConsultations';
import { getAuthenticatedUser } from '@/lib/apiSecurity';

function displayValue(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(displayValue).filter(Boolean).join(', ') || null;
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, entry]) => {
        const text = displayValue(entry);
        return text ? `${key}: ${text}` : null;
      })
      .filter(Boolean)
      .join(' | ') || null;
  }
  return null;
}

function getAssessmentField(assessment: any, key: string) {
  if (assessment?.[key] !== undefined && assessment?.[key] !== null) return assessment[key];
  if (assessment?.medical_history && typeof assessment.medical_history === 'object') {
    return assessment.medical_history[key];
  }
  return null;
}

function getRiskFlags(assessment: any) {
  const flags = [
    getAssessmentField(assessment, 'hard_rejections'),
    getAssessmentField(assessment, 'contraindications'),
    getAssessmentField(assessment, 'review_conditions'),
    getAssessmentField(assessment, 'comorbidities'),
    getAssessmentField(assessment, 'has_severe_conditions') ? 'Severe condition flagged' : null,
    getAssessmentField(assessment, 'high_priority_candidate') ? 'High priority candidate' : null,
  ]
    .map(displayValue)
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
        supabaseAdmin.from('profiles').select('id').or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone_number.ilike.%${search}%`),
        supabaseAdmin.from('health_assessments').select('patient_id').or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone_number.ilike.%${search}%`)
      ]);
      const ids = new Set([
        ...(matchedProfiles.data || []).map((p: any) => p.id),
        ...(matchedAssess.data || []).map((a: any) => a.patient_id)
      ]);
      matchingPatientIds = Array.from(ids);
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

    // 2. Fetch profiles for these patients using admin client (bypassing RLS)
    const { data: profiles, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .in('id', patientIds);
    if (profErr) throw profErr;

    // 3. Fetch health assessments using admin client
    const { data: assessments, error: assessErr } = await supabaseAdmin
      .from('health_assessments')
      .select('*')
      .in('patient_id', patientIds);
    if (assessErr) throw assessErr;

    // 4. Fetch progress logs using admin client
    const { data: logs, error: logsErr } = await supabaseAdmin
      .from('progress_logs')
      .select('*')
      .in('user_id', patientIds)
      .order('created_at', { ascending: true });
    if (logsErr) throw logsErr;

    // 5. Fetch consultations for these patients using admin client
    const { data: consults, error: consultsErr } = await supabaseAdmin
      .from('doctor_consultations')
      .select('*')
      .in('patient_id', patientIds)
      .order('created_at', { ascending: false });
    if (consultsErr) throw consultsErr;

    // Assemble the data
    const enrichedPatients = assignments.map(assign => {
      const prof = profiles?.find(p => p.id === assign.patient_id) || {};
      const assess = assessments?.find(a => a.patient_id === assign.patient_id) || {};
      const pLogs = logs?.filter(l => l.user_id === assign.patient_id) || [];
      const pConsults = consults?.filter(c => c.patient_id === assign.patient_id) || [];

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
      const prescriptionHistory = pConsults.filter(c => c.prescription_text || c.prescription_type || c.prescription_notes);

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

      const membershipTier = assess.membership_tier || assess.membershipStatus || 'Not selected';

      return {
        id: assign.id,
        patient_id: assign.patient_id,
        name: prof.first_name || prof.last_name ? `${prof.first_name || ''} ${prof.last_name || ''}`.trim() : prof.email || 'Patient',
        email: prof.email || '',
        phone: prof.phone_number || 'No Phone',
        membershipTier,
        onboardingCompleted: Boolean(assess.membership_tier),
        eligibility_status: assess.eligibility_status || getAssessmentField(assess, 'eligibility_status') || (typeof assess.is_eligible === 'boolean' ? (assess.is_eligible ? 'ELIGIBLE' : 'NOT_ELIGIBLE') : null),
        eligibility_reason: assess.eligibility_reason || getAssessmentField(assess, 'eligibility_reason') || getAssessmentField(assess, 'eligibility_message') || null,
        medical_risk_flags: getRiskFlags(assess),
        current_medications: assess.current_medications || assess.medications || getAssessmentField(assess, 'medication_history') || null,
        medication_history: assess.medication_history || getAssessmentField(assess, 'medication_history') || null,
        medication_proof_url: assess.medication_proof_url || assess.medication_proof || null,
        bmi: assess.bmi ? parseFloat(assess.bmi) : (assess.height_cm && assess.weight_kg ? Number((Number(assess.weight_kg) / Math.pow(Number(assess.height_cm) / 100, 2)).toFixed(1)) : null),
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
