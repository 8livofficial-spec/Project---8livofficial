import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const { patientId, roomUrl, forceStatus } = await req.json();

    if (!patientId) {
      return NextResponse.json({ error: 'patientId is required' }, { status: 400 });
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
    let matchTarget = roomUrl;
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
        docQuery = docQuery.or(`room_url.eq.${matchTarget},meeting_url.eq.${matchTarget},meeting_room.eq.${matchTarget},room_url.ilike.%${matchTarget}%,meeting_url.ilike.%${matchTarget}%,meeting_room.ilike.%${matchTarget}%`);
      }

      const { data: docConsult } = await docQuery.maybeSingle();

      if (docConsult) {
        // For doctor consultations: if they actually attended, set status to 'attended' (so doctor can prescribe)
        // unless a forceStatus (like 'completed' or 'missed') is specified.
        const nextStatus = forceStatus || (docConsult.status === 'scheduled' ? 'attended' : docConsult.status);
        
        await supabaseAdmin
          .from('doctor_consultations')
          .update({
            status: nextStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', docConsult.id);
      }

      // 2. Search in staff_consultations
      let staffQuery = supabaseAdmin
        .from('staff_consultations')
        .select('*')
        .eq('patient_id', patientId)
        .in('status', ['scheduled', 'attended']);

      if (matchTarget.startsWith('https://')) {
        staffQuery = staffQuery.or(`room_url.eq.${matchTarget},meeting_url.eq.${matchTarget}`);
      } else {
        staffQuery = staffQuery.or(`room_url.eq.${matchTarget},meeting_url.eq.${matchTarget},meeting_room.eq.${matchTarget},room_url.ilike.%${matchTarget}%,meeting_url.ilike.%${matchTarget}%,meeting_room.ilike.%${matchTarget}%`);
      }

      const { data: staffConsult } = await staffQuery.maybeSingle();

      if (staffConsult) {
        // For staff consultations (dietitian/trainer): set status to 'completed'
        const nextStatus = forceStatus || 'completed';
        await supabaseAdmin
          .from('staff_consultations')
          .update({
            status: nextStatus,
            is_completed: nextStatus === 'completed',
            completed_at: nextStatus === 'completed' ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', staffConsult.id);
      }
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('Error in POST /api/patient/conclude-consultation:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
