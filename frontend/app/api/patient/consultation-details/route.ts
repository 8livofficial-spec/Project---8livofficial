import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { appointmentTypeForRole, labelForRole, normalizeProviderRole } from '@/lib/providerConsultations';

export async function POST(req: Request) {
  try {
    const { roomUrl, queryId } = await req.json();

    if (!roomUrl && !queryId) {
      return NextResponse.json({ error: 'roomUrl or queryId is required' }, { status: 400 });
    }

    // Target search term: look for matches in stored meeting URLs
    const searchTarget = roomUrl || queryId;

    // 1. Search in doctor_consultations
    let docQuery = supabaseAdmin
      .from('doctor_consultations')
      .select('*, doctor_profiles(full_name, specialty)');

    if (searchTarget.startsWith('https://')) {
      docQuery = docQuery.or(`room_url.eq.${searchTarget},meeting_url.eq.${searchTarget}`);
    } else {
      docQuery = docQuery.or(`room_url.eq.${searchTarget},meeting_url.eq.${searchTarget},meeting_room.eq.${searchTarget},room_url.ilike.%${searchTarget}%,meeting_url.ilike.%${searchTarget}%,meeting_room.ilike.%${searchTarget}%`);
    }

    const { data: docConsult, error: docErr } = await docQuery.maybeSingle();

    if (docErr) throw docErr;

    if (docConsult) {
      // Find patient profile too to make sure it's the right patient
      const { data: patientProfile } = await supabaseAdmin
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', docConsult.patient_id)
        .maybeSingle();

      return NextResponse.json({
        success: true,
        type: 'doctor',
        consultationId: docConsult.id,
        patientId: docConsult.patient_id,
        patientName: patientProfile ? `${patientProfile.first_name || ''} ${patientProfile.last_name || ''}`.trim() : 'Patient',
        providerId: docConsult.doctor_id,
        providerName: 'Assigned Doctor',
        providerRole: docConsult.doctor_profiles?.specialty || 'Physician Specialist',
        status: docConsult.status
      });
    }

    // 2. Search in staff_consultations
    let staffQuery = supabaseAdmin
      .from('staff_consultations')
      .select('*');

    if (searchTarget.startsWith('https://')) {
      staffQuery = staffQuery.or(`room_url.eq.${searchTarget},meeting_url.eq.${searchTarget}`);
    } else {
      staffQuery = staffQuery.or(`room_url.eq.${searchTarget},meeting_url.eq.${searchTarget},meeting_room.eq.${searchTarget},room_url.ilike.%${searchTarget}%,meeting_url.ilike.%${searchTarget}%,meeting_room.ilike.%${searchTarget}%`);
    }

    const { data: staffConsult, error: staffErr } = await staffQuery.maybeSingle();

    if (staffErr) throw staffErr;

    if (staffConsult) {
      // Fetch staff details from profiles
      const { data: staffProfile } = await supabaseAdmin
        .from('profiles')
        .select('first_name, last_name, role')
        .eq('id', staffConsult.staff_id)
        .maybeSingle();

      // Fetch patient details from profiles
      const { data: patientProfile } = await supabaseAdmin
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', staffConsult.patient_id)
        .maybeSingle();

      const roleLabel = labelForRole(normalizeProviderRole(staffConsult.staff_role));
      const providerName = staffProfile 
        ? `${staffProfile.first_name || ''} ${staffProfile.last_name || ''}`.trim()
        : `${roleLabel} Specialist`;

      return NextResponse.json({
        success: true,
        type: 'staff',
        appointmentType: staffConsult.appointment_type || appointmentTypeForRole(staffConsult.staff_role),
        consultationId: staffConsult.id,
        patientId: staffConsult.patient_id,
        patientName: patientProfile ? `${patientProfile.first_name || ''} ${patientProfile.last_name || ''}`.trim() : 'Patient',
        providerId: staffConsult.staff_id,
        providerName: providerName,
        providerRole: `${roleLabel} Specialist`,
        meetingProvider: staffConsult.meeting_provider || 'JITSI',
        meetingRoom: staffConsult.meeting_room || null,
        meetingUrl: staffConsult.meeting_url || staffConsult.room_url || null,
        status: staffConsult.status
      });
    }

    return NextResponse.json({ error: 'Consultation not found' }, { status: 404 });

  } catch (err: unknown) {
    console.error('Error in POST /api/patient/consultation-details:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
