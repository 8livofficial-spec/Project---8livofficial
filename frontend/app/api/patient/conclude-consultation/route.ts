import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthenticatedUser } from '@/lib/apiSecurity';
import { updatePatientJourneyState } from '@/lib/patientJourneyServer';
import { invalidatePatientApiDashboardCache } from '@/lib/patientDashboardCache';

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

        // Advance patient journey state so the patient is not trapped in 'appointment_scheduled'
        await updatePatientJourneyState(patientId, {
          appointmentStatus: 'COMPLETED',
          consultationStatus: 'COMPLETED',
          firstConsultationCompleted: true,
          bookingId: docConsult.id,
          currentJourneyStep: 'MEMBERSHIP_SELECTION',
          lastCompletedStep: 'INITIAL_CONSULTATION',
        }).catch((e) => console.warn('[conclude-consultation] updatePatientJourneyState notice:', e));

        invalidatePatientApiDashboardCache(patientId);
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
        // For staff consultations (dietitian/trainer): set status to 'completed'
        const nextStatus = forceStatus || 'completed';
        await supabaseAdmin
          .from('staff_consultations')
          .update({
            status: nextStatus,
            meeting_status: 'COMPLETED',
            call_ended_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', staffConsult.id);

        invalidatePatientApiDashboardCache(patientId);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Error in POST /api/patient/conclude-consultation:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
