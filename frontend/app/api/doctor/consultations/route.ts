import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { EmailService } from '@/lib/emailService';
import { loadPatientJourneyState, updatePatientJourneyState } from '@/lib/patientJourneyServer';
import { INITIAL_CONSULTATION, isInitialConsultationType } from '@/lib/providerConsultations';
import { getMembershipValidity } from '@/lib/membershipServer';
import { creditCompletedConsultation } from '@/lib/walletLedger';

type ConsultationRow = {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  booking_date: string | null;
  booking_time: string | null;
  status: string;
  [key: string]: unknown;
};

type PatientProfileRow = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  display_id?: string | null;
  email?: string | null;
  phone_number?: string | null;
};

type HealthAssessmentRow = {
  patient_id: string;
  first_name?: string | null;
  last_name?: string | null;
  phone_number?: string | null;
  dob_month?: string | null;
  dob_day?: string | null;
  dob_year?: string | null;
  age?: number | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  goal_weight_kg?: number | null;
  medical_history?: unknown;
  extra_medical_info?: unknown;
  local_food?: string | null;
  workout_preference?: string | null;
  is_eligible?: boolean | null;
  medication_proof_url?: string | null;
  medication_proof?: string | null;
  [key: string]: unknown;
};

const getErrorMessage = (err: unknown) => {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err) return String((err as { message?: unknown }).message || 'Internal Server Error');
  return 'Internal Server Error';
};

function stringifyList(value: unknown): string | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    const text = value.map((item) => stringifyDisplayValue(item)).filter(Boolean).join(', ');
    return text || null;
  }
  return stringifyDisplayValue(value);
}

function stringifyDisplayValue(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return stringifyList(value);

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const summaryParts = [
      record.eligibility_status ? `Status: ${stringifyDisplayValue(record.eligibility_status)}` : null,
      record.eligibility_reason ? `Reason: ${stringifyDisplayValue(record.eligibility_reason)}` : null,
      record.eligibility_message ? stringifyDisplayValue(record.eligibility_message) : null,
      record.bmi ? `BMI: ${stringifyDisplayValue(record.bmi)}` : null,
      stringifyList(record.comorbidities) ? `Comorbidities: ${stringifyList(record.comorbidities)}` : null,
      stringifyList(record.contraindications) ? `Contraindications: ${stringifyList(record.contraindications)}` : null,
      stringifyList(record.review_conditions) ? `Review: ${stringifyList(record.review_conditions)}` : null,
      stringifyList(record.hard_rejections) ? `Hard stops: ${stringifyList(record.hard_rejections)}` : null,
    ].filter(Boolean);

    if (summaryParts.length > 0) return summaryParts.join(' | ');

    return Object.entries(record)
      .map(([key, entry]) => {
        const text = stringifyDisplayValue(entry);
        return text ? `${key}: ${text}` : null;
      })
      .filter(Boolean)
      .join(' | ') || null;
  }

  return null;
}

function getEligibilityStatus(assessment: HealthAssessmentRow): string {
  if (typeof assessment.is_eligible === 'boolean') {
    return assessment.is_eligible ? 'ELIGIBLE' : 'NOT_ELIGIBLE';
  }
  if (assessment.medical_history && typeof assessment.medical_history === 'object') {
    const status = (assessment.medical_history as Record<string, unknown>).eligibility_status;
    const displayStatus = stringifyDisplayValue(status);
    if (displayStatus) return displayStatus;
  }
  return 'NOT_RECORDED';
}

function getRiskFlags(assessment: HealthAssessmentRow): string | null {
  const medicalHistory = assessment.medical_history;
  if (medicalHistory && typeof medicalHistory === 'object') {
    const record = medicalHistory as Record<string, unknown>;
    const flags = [
      stringifyList(record.hard_rejections),
      stringifyList(record.contraindications),
      stringifyList(record.review_conditions),
      stringifyList(record.comorbidities),
    ].filter(Boolean);
    if (flags.length > 0) return flags.join(' | ');
  }

  return [
    stringifyDisplayValue(assessment.medical_history),
    stringifyDisplayValue(assessment.extra_medical_info)
  ].filter(Boolean).join(' | ') || null;
}

function getSlotTimestamp(slotDate: string | null, slotTime: string | null): number | null {
  if (!slotDate || !slotTime) return null;
  const parsed = new Date(`${slotDate} ${slotTime}`).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

async function hasPaidConsultationPayment(patientId: string, appointmentId: string): Promise<boolean> {
  const paidStatuses = ['success', 'paid', 'PAID', 'SUCCESS'];

  const { data: matchedPayment, error: matchedError } = await supabaseAdmin
    .from('payment_transactions')
    .select('id, status')
    .eq('patient_id', patientId)
    .eq('payment_type', 'consultation')
    .contains('metadata', { consultation_id: appointmentId })
    .in('status', paidStatuses)
    .limit(1)
    .maybeSingle();

  if (matchedError) throw matchedError;
  if (matchedPayment?.id) return true;

  const { data: fallbackPayment, error: fallbackError } = await supabaseAdmin
    .from('payment_transactions')
    .select('id, status')
    .eq('patient_id', patientId)
    .eq('payment_type', 'consultation')
    .in('status', paidStatuses)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fallbackError) throw fallbackError;
  return Boolean(fallbackPayment?.id);
}

async function creditDoctorWalletOnce(doctorId: string, patientId: string, appointmentId: string, appointmentType?: string | null) {
  const result = await creditCompletedConsultation({
    providerId: doctorId,
    patientId,
    appointmentId,
    appointmentType,
    createdBy: doctorId,
  });
  return { credited: result.credited, reason: result.duplicate ? 'duplicate' : result.credited ? 'credited' : 'pending_review', amount: Number(result.amount || 0) };
}

export async function POST(req: Request) {
  try {
    const { doctorId, page = 1, limit = 25, search = '', status = '' } = await req.json();

    if (!doctorId) {
      return NextResponse.json({ error: 'doctorId is required' }, { status: 400 });
    }

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

    // 1. Load doctor's own consultations
    let query = supabaseAdmin
      .from('doctor_consultations')
      .select('id, doctor_id, patient_id, booking_date, booking_time, status, room_url, is_completed, consultation_notes, prescription_type, created_at, call_started_at, call_ended_at, prescription_text, prescription_notes, updated_at, appointment_type, meeting_provider, meeting_room, meeting_url, completed_at', { count: 'exact' })
      .eq('doctor_id', doctorId);

    if (status) {
      query = query.eq('status', status);
    }

    if (search.trim()) {
      if (matchingPatientIds.length > 0) {
        query = query.in('patient_id', matchingPatientIds);
      } else {
        return NextResponse.json({ consultations: [], totalCount: 0, totalPages: 0, availableRequests: [] });
      }
    }

    const from = (page - 1) * limit;
    const to = page * limit - 1;

    const { data: ownConsultations, error: ownErr, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (ownErr) throw ownErr;

    // Doctors must only see consultations assigned to them. Unassigned/other-doctor
    // scheduled requests are handled by admin auto-assignment, not exposed here.
    const availableRequests: ConsultationRow[] = [];

    // Get patient IDs to fetch profiles and health assessments
    const allPatientIds = Array.from(new Set([
      ...(ownConsultations || []).map(c => c.patient_id),
    ]));

    // Fetch profiles and assessments using admin client (bypassing RLS)
    const [profilesRes, assessmentsRes] = await Promise.all([
      supabaseAdmin.from('profiles').select('id, first_name, last_name, display_id, email, phone_number').in('id', allPatientIds),
      supabaseAdmin.from('health_assessments').select('patient_id, first_name, last_name, phone_number, dob_month, dob_day, dob_year, age, height_cm, weight_kg, goal_weight_kg, medical_history, extra_medical_info, local_food, workout_preference, is_eligible, medication_proof_url, medication_proof').in('patient_id', allPatientIds)
    ]);

    const profiles = (profilesRes.data || []) as PatientProfileRow[];
    const assessments = (assessmentsRes.data || []) as HealthAssessmentRow[];

    // Helper function to enrich consultation
    const enrich = (c: ConsultationRow) => {
      const prof: PatientProfileRow = profiles.find(p => p.id === c.patient_id) || { id: c.patient_id };
      const assess: HealthAssessmentRow = assessments.find(a => a.patient_id === c.patient_id) || { patient_id: c.patient_id };
      const firstName = assess.first_name || prof.first_name || prof.display_id || 'Patient';
      const lastName = assess.last_name || prof.last_name || '';
      const fullName = `${firstName} ${lastName}`.trim();

      return {
        ...c,
        patient_name: fullName,
        patient_phone: assess.phone_number || prof.phone_number || 'No Phone',
        patient_email: prof.email || '',
        patient_gender: 'Unknown',
        patient_dob: assess.dob_month && assess.dob_day && assess.dob_year ? `${assess.dob_month} ${assess.dob_day}, ${assess.dob_year}` : 'Not Stated',
        patient_age: assess.age || null,
        patient_height: assess.height_cm || null,
        patient_weight: assess.weight_kg || null,
        patient_goal_weight: assess.goal_weight_kg || null,
        patient_bmi: assess.height_cm && assess.weight_kg
          ? Number((assess.weight_kg / Math.pow(assess.height_cm / 100, 2)).toFixed(1))
          : null,
        patient_history: stringifyDisplayValue(assess.medical_history),
        patient_extra_info: stringifyDisplayValue(assess.extra_medical_info),
        patient_local_food: assess.local_food || null,
        patient_workout_pref: assess.workout_preference || null,
        patient_eligibility_status: getEligibilityStatus(assess),
        patient_medical_risk_flags: getRiskFlags(assess),
        patient_medication_proof_url: assess.medication_proof_url || assess.medication_proof || null,
      };
    };

    return NextResponse.json({
      consultations: ((ownConsultations || []) as ConsultationRow[]).map(enrich),
      totalCount: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
      availableRequests: (availableRequests || []).map(enrich)
    });
  } catch (err: unknown) {
    console.error('Error in POST /api/doctor/consultations:', err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const {
      doctorId,
      consultationId,
      action = 'cancel_by_doctor',
      actorRole,
      decision,
      notes,
      diagnosisSummary,
      recommendedMedicationType,
      prescriptionText,
      followUpInstruction
    } = await req.json();
    const isAdminAction = actorRole === 'admin';

    if ((!doctorId && !isAdminAction) || !consultationId) {
      return NextResponse.json({ error: 'doctorId and consultationId are required' }, { status: 400 });
    }

    let lookupQuery = supabaseAdmin
      .from('doctor_consultations')
      .select('id, doctor_id, patient_id, booking_date, booking_time, status, call_started_at, call_ended_at, appointment_type, is_completed')
      .eq('id', consultationId);

    if (!isAdminAction) {
      lookupQuery = lookupQuery.eq('doctor_id', doctorId);
    }

    const { data: consultation, error: lookupErr } = await lookupQuery.maybeSingle();

    if (lookupErr) throw lookupErr;
    if (!consultation) {
      return NextResponse.json({ error: 'Scheduled consultation not found for this doctor.' }, { status: 404 });
    }

    if (action === 'start_call') {
      const currentStatus = String(consultation.status || '').trim().toLowerCase();
      if (!['scheduled', 'calling', 'attended'].includes(currentStatus)) {
        return NextResponse.json({ error: 'This consultation can no longer be joined.' }, { status: 409 });
      }
      const now = new Date().toISOString();
      const { data: started, error: startError } = await supabaseAdmin
        .from('doctor_consultations')
        .update({
          status: currentStatus === 'attended' ? 'attended' : 'calling',
          call_started_at: consultation.call_started_at || now,
          updated_at: now,
        })
        .eq('id', consultationId)
        .eq('doctor_id', doctorId)
        .select('*')
        .single();
      if (startError) throw startError;
      return NextResponse.json({ consultation: started });
    }

    if (action === 'end_call') {
      const currentStatus = String(consultation.status || '').trim().toLowerCase();
      if (!['calling', 'attended'].includes(currentStatus)) {
        return NextResponse.json({ error: 'The consultation must be joined before it can be ended.' }, { status: 409 });
      }
      const now = new Date().toISOString();
      const { data: attended, error: endError } = await supabaseAdmin
        .from('doctor_consultations')
        .update({
          status: 'attended',
          call_started_at: consultation.call_started_at || now,
          call_ended_at: consultation.call_ended_at || now,
          updated_at: now,
        })
        .eq('id', consultationId)
        .eq('doctor_id', doctorId)
        .select('*')
        .single();
      if (endError) throw endError;
      return NextResponse.json({ consultation: attended });
    }

    if (action === 'complete_consultation') {
      let appointmentType = String(consultation.appointment_type || '').toUpperCase();
      if (!appointmentType && consultation.patient_id) {
        const [persistedJourney, { data: assessments }, membershipValidity] = await Promise.all([
          loadPatientJourneyState(consultation.patient_id),
          supabaseAdmin
            .from('health_assessments')
            .select('first_consultation_completed')
            .eq('patient_id', consultation.patient_id)
            .order('created_at', { ascending: false })
            .limit(1),
          getMembershipValidity(consultation.patient_id),
        ]);
        const assessment = assessments?.[0] || null;
        const membershipActive = membershipValidity.active;
        const firstConsultationCompleted = persistedJourney?.first_consultation_completed === true || assessment?.first_consultation_completed === true;
        appointmentType = membershipActive && firstConsultationCompleted ? 'FOLLOW_UP_CONSULTATION' : INITIAL_CONSULTATION;
      }
      if (!appointmentType) appointmentType = INITIAL_CONSULTATION;
      const isInitialConsultation = isInitialConsultationType(appointmentType);
      const nextPatientRoute = isInitialConsultation ? '/plans' : '/patient/appointments';
      const currentStatus = String(consultation.status || '').trim().toLowerCase();
      const terminalStatuses = new Set([
        'cancelled',
        'cancelled_by_doctor',
        'cancelled_by_patient',
        'missed',
        'missed_by_patient',
        'not_attended',
      ]);

      if (terminalStatuses.has(currentStatus)) {
        return NextResponse.json({ error: `A ${currentStatus.replaceAll('_', ' ')} consultation cannot be completed.` }, { status: 409 });
      }

      // A Jitsi iframe cannot reliably report whether both participants joined.
      // The server-side start/end timestamps are therefore the durable attendance
      // evidence. `completed` is also accepted because legacy conclude endpoints
      // used it before the doctor submitted the clinical decision.
      const hasAttendanceEvidence = Boolean(
        consultation.call_started_at
        || consultation.call_ended_at
        || ['calling', 'attended', 'completed'].includes(currentStatus)
      );

      if (!hasAttendanceEvidence) {
        return NextResponse.json({
          error: `Consultation attendance was not recorded (current status: ${currentStatus || 'unknown'}). Rejoin the call and use End Session before completing it.`,
        }, { status: 409 });
      }
      if (!consultation.doctor_id) {
        return NextResponse.json({ error: 'Doctor must be assigned before consultation payout.' }, { status: 409 });
      }
      if (!consultation.patient_id) {
        return NextResponse.json({ error: 'Patient must be linked before consultation completion.' }, { status: 409 });
      }

      const paymentPaid = isInitialConsultation ? await hasPaidConsultationPayment(consultation.patient_id, consultation.id) : true;
      if (!paymentPaid) {
        return NextResponse.json({ error: 'Consultation payment must be PAID before completion payout.' }, { status: 402 });
      }

      const normalizedDecision = String(decision || '').trim().toLowerCase();
      if (!['approved', 'rejected'].includes(normalizedDecision)) {
        return NextResponse.json({ error: 'Completion decision must be approved or rejected.' }, { status: 400 });
      }

      if (consultation.is_completed && ['approved', 'rejected'].includes(currentStatus)) {
        let retryPayout = { credited: false, reason: isAdminAction ? 'admin_action' : 'pending_review' };
        if (!isAdminAction) {
          try {
            retryPayout = await creditDoctorWalletOnce(consultation.doctor_id, consultation.patient_id, consultation.id, appointmentType);
          } catch (payoutError) {
            console.error('Completed consultation payout retry requires review:', payoutError);
          }
        }
        return NextResponse.json({
          success: true,
          alreadyCompleted: true,
          consultationStatus: 'COMPLETED',
          appointmentStatus: 'COMPLETED',
          membershipStatus: isInitialConsultation ? 'NOT_SELECTED' : 'ACTIVE',
          dashboardAccess: !isInitialConsultation,
          payoutStatus: retryPayout.credited ? 'PENDING' : 'SKIPPED',
          payoutReason: retryPayout.reason,
          nextPatientRoute,
        });
      }
      const normalizedMedicationType = String(recommendedMedicationType || '').toUpperCase();
      const finalMedicationType = normalizedDecision === 'approved'
        ? (normalizedMedicationType === 'NONE' || normalizedMedicationType === 'NO_PRESCRIPTION'
          ? 'none'
          : normalizedMedicationType)
        : null;

      if (normalizedDecision === 'approved' && finalMedicationType !== 'none' && finalMedicationType !== 'INJECTABLE') {
        return NextResponse.json({ error: 'Only injectable medication can be prescribed in this workflow.' }, { status: 400 });
      }

      const now = new Date().toISOString();
      const completionNotes = [
        notes ? `Notes: ${notes}` : null,
        diagnosisSummary ? `Diagnosis summary: ${diagnosisSummary}` : null,
        followUpInstruction ? `Follow-up: ${followUpInstruction}` : null,
      ].filter(Boolean).join('\n\n') || null;

      const { error: completeErr } = await supabaseAdmin
        .from('doctor_consultations')
        .update({
          status: normalizedDecision,
          prescription_type: finalMedicationType,
          prescription_text: normalizedDecision === 'approved' ? (prescriptionText || null) : null,
          prescription_notes: completionNotes,
          is_completed: true,
          call_started_at: consultation.call_started_at || now,
          call_ended_at: consultation.call_ended_at || now,
          updated_at: now
        })
        .eq('id', consultationId);

      if (completeErr) throw completeErr;

      if (consultation.patient_id) {
        const assessmentUpdate: Record<string, unknown> = {
          prescription_type: finalMedicationType,
          booking_date: null,
          booking_time: null,
          room_url: null,
          updated_at: now
        };
        if (isInitialConsultation) {
          assessmentUpdate.first_consultation_completed = true;
          assessmentUpdate.onboarding_completed = false;
          assessmentUpdate.current_journey_step = 'PLAN_SELECTION';
        }

        let assessmentUpdateResult = await supabaseAdmin
          .from('health_assessments')
          .update(assessmentUpdate)
          .eq('patient_id', consultation.patient_id);

        if (assessmentUpdateResult.error && String(assessmentUpdateResult.error.message || '').toLowerCase().includes('column')) {
          delete assessmentUpdate.first_consultation_completed;
          delete assessmentUpdate.onboarding_completed;
          delete assessmentUpdate.current_journey_step;
          assessmentUpdateResult = await supabaseAdmin
            .from('health_assessments')
            .update(assessmentUpdate)
            .eq('patient_id', consultation.patient_id);
        }

        if (assessmentUpdateResult.error) throw assessmentUpdateResult.error;

        await supabaseAdmin
          .from('patient_notifications')
          .insert({
            patient_id: consultation.patient_id,
            type: 'consultation_completed',
            title: 'Consultation Completed',
            message: isInitialConsultation
              ? (normalizedDecision === 'approved'
                ? 'Your endocrinologist has completed your consultation and approved your case. Choose a Gold or Silver plan to continue your treatment journey.'
                : 'Your endocrinologist has completed your consultation. Please review the appointment notes and choose the next recommended step.')
              : 'Your doctor has completed your follow-up consultation. You can review the appointment notes from your dashboard.',
            is_read: false
          });

        try {
          const [{ data: userData }, { data: profile }, { data: doctorProfile }] = await Promise.all([
            supabaseAdmin.auth.admin.getUserById(consultation.patient_id),
            supabaseAdmin
              .from('profiles')
              .select('first_name, last_name, display_id')
              .eq('id', consultation.patient_id)
              .maybeSingle(),
            supabaseAdmin
              .from('doctor_profiles')
              .select('full_name')
              .eq('id', consultation.doctor_id)
              .maybeSingle()
          ]);

          const patientEmail = userData?.user?.email;
          const patientName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
            || profile?.display_id
            || patientEmail?.split('@')[0]
            || 'there';

          if (patientEmail) {
            await EmailService.sendConsultationCompleted({
              email: patientEmail,
              name: patientName,
              patientId: consultation.patient_id,
              doctorName: doctorProfile?.full_name || 'your doctor',
              decision: normalizedDecision,
              nextStepUrl: nextPatientRoute,
            });
          }
        } catch (emailError) {
          console.error('Failed to send consultation completed email:', emailError);
        }

        await updatePatientJourneyState(consultation.patient_id, isInitialConsultation ? {
          appointmentStatus: 'COMPLETED',
          consultationStatus: 'COMPLETED',
          membershipStatus: 'NOT_SELECTED',
          dashboardAccess: false,
          firstConsultationCompleted: true,
          onboardingCompleted: false,
          appointmentType,
          bookingId: consultation.id,
          currentJourneyStep: 'PLAN_SELECTION',
          lastCompletedStep: 'CONSULTATION_COMPLETED',
        } : {
          appointmentStatus: 'COMPLETED',
          consultationStatus: 'COMPLETED',
          membershipStatus: 'ACTIVE',
          dashboardAccess: true,
          firstConsultationCompleted: true,
          onboardingCompleted: true,
          appointmentType,
          bookingId: consultation.id,
          currentJourneyStep: 'DASHBOARD',
          lastCompletedStep: 'FOLLOW_UP_CONSULTATION_COMPLETED',
        });
      }

      let payout = { credited: false, reason: isAdminAction ? 'admin_action' : 'pending_review', amount: 0 };
      if (!isAdminAction) {
        try {
          payout = await creditDoctorWalletOnce(consultation.doctor_id, consultation.patient_id, consultation.id, appointmentType);
        } catch (payoutError) {
          // Clinical completion is already durable at this point. A wallet schema
          // or payout failure must be reconciled separately, not reported as a
          // failed consultation to the doctor.
          console.error('Consultation completed but doctor payout requires review:', payoutError);
        }
      }

      return NextResponse.json({
        success: true,
        appointmentType,
        consultationStatus: 'COMPLETED',
        appointmentStatus: 'COMPLETED',
        membershipStatus: isInitialConsultation ? 'NOT_SELECTED' : 'ACTIVE',
        dashboardAccess: !isInitialConsultation,
        doctorPayout: payout.amount || 0,
        payoutStatus: payout.credited ? 'PENDING' : 'SKIPPED',
        payoutReason: payout.reason,
        nextPatientRoute
      });
    }

    if (!['scheduled', 'calling'].includes(consultation.status)) {
      return NextResponse.json({ error: 'Only scheduled consultations can be updated.' }, { status: 409 });
    }

    const now = new Date().toISOString();
    const updatePayload: { status: string; updated_at: string } = {
      status: 'cancelled_by_doctor',
      updated_at: now
    };

    if (action === 'mark_missed_by_patient') {
      const startMs = getSlotTimestamp(consultation.booking_date, consultation.booking_time);
      if (!startMs) {
        return NextResponse.json({ error: 'Appointment time is unavailable.' }, { status: 400 });
      }
      if (Date.now() < startMs + 10 * 60 * 1000) {
        return NextResponse.json({ error: 'Patient can only be marked missed 10 minutes after appointment start.' }, { status: 409 });
      }
      updatePayload.status = 'missed_by_patient';
    } else if (action !== 'cancel_by_doctor') {
      return NextResponse.json({ error: 'Unsupported appointment action.' }, { status: 400 });
    }

    const { error: updateErr } = await supabaseAdmin
      .from('doctor_consultations')
      .update(updatePayload)
      .eq('id', consultationId);

    if (updateErr) throw updateErr;

    if (action === 'cancel_by_doctor') {
      await supabaseAdmin
        .from('provider_availability')
        .update({ status: 'AVAILABLE', is_available: true, updated_at: new Date().toISOString() })
        .eq('provider_id', consultation.doctor_id)
        .eq('provider_role', 'doctor')
        .eq('available_date', consultation.booking_date)
        .eq('start_time', consultation.booking_time);
    }

    if (consultation.patient_id) {
      if (action === 'cancel_by_doctor') {
        await supabaseAdmin
          .from('health_assessments')
          .update({
            booking_date: null,
            booking_time: null,
            room_url: null,
            updated_at: now
          })
          .eq('patient_id', consultation.patient_id);
      }
      if (action === 'mark_missed_by_patient') {
        await supabaseAdmin
          .from('health_assessments')
          .update({
            booking_date: null,
            booking_time: null,
            room_url: null,
            updated_at: now
          })
          .eq('patient_id', consultation.patient_id);
      }

      await supabaseAdmin
        .from('patient_notifications')
        .insert({
          patient_id: consultation.patient_id,
          type: action === 'mark_missed_by_patient' ? 'consultation_missed' : 'booking_cancelled_by_doctor',
          title: action === 'mark_missed_by_patient' ? 'Consultation Missed' : 'Appointment Cancelled',
          message: action === 'mark_missed_by_patient'
            ? `Your consultation on ${consultation.booking_date} at ${consultation.booking_time} was marked missed. You have one free reschedule option.`
            : `Your doctor has cancelled the appointment on ${consultation.booking_date} at ${consultation.booking_time}. Please select a new time slot at no additional charge.`,
          is_read: false
        });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Error in PATCH /api/doctor/consultations:', err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
