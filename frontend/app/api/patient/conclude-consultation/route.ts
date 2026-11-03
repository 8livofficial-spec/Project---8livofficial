import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthenticatedUser } from '@/lib/apiSecurity';
import { updatePatientJourneyState } from '@/lib/patientJourneyServer';
import { invalidatePatientApiDashboardCache } from '@/lib/patientDashboardCache';
import { creditCompletedConsultation } from '@/lib/walletLedger';
import { serverCache } from '@/lib/serverCache';

function sanitizeMatchTarget(target: string): string {
  if (target.startsWith('https://')) {
    try {
      new URL(target);
      return target;
    } catch {
      return '';
    }
  }
  return target.replace(/[^a-zA-Z0-9_-]/g, '');
}

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { patientId, roomUrl, appointmentId, forceStatus } = await req.json();

    if (!patientId) {
      return NextResponse.json({ error: 'patientId is required' }, { status: 400 });
    }
    if (auth.user.id !== patientId && auth.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Clear active booking details in health_assessments immediately so the patient does not see the "Join Call" overlay
    await supabaseAdmin
      .from('health_assessments')
      .update({
        booking_date: null,
        booking_time: null,
        room_url: null,
        updated_at: new Date().toISOString()
      })
      .eq('patient_id', patientId);

    // Now look for active consultation and update its status
    const rawTarget = appointmentId || roomUrl;
    const matchTarget = rawTarget ? sanitizeMatchTarget(String(rawTarget)) : '';

    if (matchTarget) {
      // 1. Search in doctor_consultations
      let docQuery = supabaseAdmin
        .from('doctor_consultations')
        .select('*')
        .eq('patient_id', patientId)
        .in('status', ['scheduled', 'calling', 'attended']);

      if (matchTarget.startsWith('https://')) {
        docQuery = docQuery.or(`room_url.eq.${matchTarget},meeting_url.eq.${matchTarget}`);
      } else {
        docQuery = docQuery.or(`id.eq.${matchTarget},call_id.eq.${matchTarget},meeting_room.eq.${matchTarget}`);
      }

      const { data: docConsult } = await docQuery.maybeSingle();

      if (docConsult) {
        // For doctor consultations: if they actually attended/ended the call, mark attended and completed call times
        const nextStatus = forceStatus || (docConsult.status === 'scheduled' ? 'attended' : docConsult.status);
        const now = new Date().toISOString();
        
        await supabaseAdmin
          .from('doctor_consultations')
          .update({
            status: nextStatus,
            meeting_status: 'COMPLETED',
            call_ended_at: docConsult.call_ended_at || now,
            call_started_at: docConsult.call_started_at || now,
            updated_at: now
          })
          .eq('id', docConsult.id);

        if (docConsult.doctor_id && ['attended', 'completed'].includes(nextStatus)) {
          await creditCompletedConsultation({
            providerId: docConsult.doctor_id,
            patientId: docConsult.patient_id,
            appointmentId: docConsult.id,
            appointmentType: docConsult.appointment_type || 'INITIAL_CONSULTATION',
            createdBy: docConsult.doctor_id,
          }).catch((e) => console.warn('[conclude-consultation] creditCompletedConsultation notice:', e));
          serverCache.invalidate(`wallet:${docConsult.doctor_id}`);
        }

        // Check if patient already has an active membership
        const { data: existingMembership } = await supabaseAdmin
          .from('memberships')
          .select('id, status')
          .eq('patient_id', patientId)
          .eq('status', 'active')
          .maybeSingle();

        const isInitialConsultation = !existingMembership;

        // Advance patient journey state
        await updatePatientJourneyState(patientId, isInitialConsultation ? {
          appointmentStatus: 'COMPLETED',
          consultationStatus: 'COMPLETED',
          membershipStatus: 'NOT_SELECTED',
          dashboardAccess: false,
          firstConsultationCompleted: true,
          bookingId: docConsult.id,
          currentJourneyStep: 'PLAN_SELECTION',
          lastCompletedStep: 'INITIAL_CONSULTATION',
        } : {
          appointmentStatus: 'COMPLETED',
          consultationStatus: 'COMPLETED',
          firstConsultationCompleted: true,
          bookingId: docConsult.id,
          currentJourneyStep: 'DASHBOARD',
          lastCompletedStep: 'FOLLOW_UP_CONSULTATION',
        }).catch((e) => console.warn('[conclude-consultation] updatePatientJourneyState notice:', e));

        invalidatePatientApiDashboardCache(patientId);

        return NextResponse.json({
          success: true,
          isInitialConsultation,
          nextUrl: isInitialConsultation ? '/patient/onboarding/plan' : '/patient'
        });
      }

      // 2. Search in staff_consultations
      let staffQuery = supabaseAdmin
        .from('staff_consultations')
        .select('*')
        .eq('patient_id', patientId)
        .in('status', ['scheduled', 'calling', 'attended']);

      if (matchTarget.startsWith('https://')) {
        staffQuery = staffQuery.or(`room_url.eq.${matchTarget},meeting_url.eq.${matchTarget}`);
      } else {
        staffQuery = staffQuery.or(`id.eq.${matchTarget},call_id.eq.${matchTarget},meeting_room.eq.${matchTarget}`);
      }

      const { data: staffConsult } = await staffQuery.maybeSingle();

      if (staffConsult) {
        // For dietitian consultations: call ending transitions to 'attended' until the nutrition plan is uploaded
        const isDietitian = staffConsult.staff_role === 'dietitian';
        const nextStatus = forceStatus || (isDietitian ? 'attended' : 'completed');
        await supabaseAdmin
          .from('staff_consultations')
          .update({
            status: nextStatus,
            is_completed: nextStatus === 'completed',
            meeting_status: 'ENDED',
            call_ended_at: new Date().toISOString()
          })
          .eq('id', staffConsult.id);

        if (staffConsult.staff_id && ['attended', 'completed'].includes(nextStatus)) {
          await creditCompletedConsultation({
            providerId: staffConsult.staff_id,
            patientId: staffConsult.patient_id,
            appointmentId: staffConsult.id,
            appointmentType: staffConsult.call_type || (isDietitian ? 'DIETITIAN_CONSULTATION' : 'FITNESS_COACH_CONSULTATION'),
            createdBy: staffConsult.staff_id,
          }).catch((e) => console.warn('[conclude-consultation] staff creditCompletedConsultation notice:', e));
          serverCache.invalidate(`wallet:${staffConsult.staff_id}`);
        }

        invalidatePatientApiDashboardCache(patientId);

        return NextResponse.json({
          success: true,
          isInitialConsultation: false,
          nextUrl: '/patient'
        });
      }
    }

    return NextResponse.json({ success: true, nextUrl: '/patient/onboarding/plan' });
  } catch (err: unknown) {
    console.error('Error in POST /api/patient/conclude-consultation:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
