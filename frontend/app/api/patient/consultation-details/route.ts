import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthenticatedUser } from '@/lib/apiSecurity';
import { appointmentTypeForRole, labelForRole, normalizeProviderRole } from '@/lib/providerConsultations';

// Sanitize query to avoid PostgREST filter injection
function sanitizeQueryTarget(target: string): string {
  if (target.startsWith('https://')) {
    try {
      new URL(target);
      return target;
    } catch {
      return '';
    }
  }
  // Only allow alphanumeric, hyphens, and underscores for call IDs and UUIDs
  return target.replace(/[^a-zA-Z0-9_-]/g, '');
}

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { roomUrl, queryId } = await req.json().catch(() => ({}));

    if (!roomUrl && !queryId) {
      return NextResponse.json({ error: 'roomUrl or queryId is required' }, { status: 400 });
    }

    const rawTarget = String(roomUrl || queryId || '').trim();
    const searchTarget = sanitizeQueryTarget(rawTarget);
    if (!searchTarget) {
      return NextResponse.json({ error: 'Invalid search identifier' }, { status: 400 });
    }

    // 1. Search in doctor_consultations
    let docQuery = supabaseAdmin
      .from('doctor_consultations')
      .select('*, doctor_profiles(full_name, specialty)');

    if (searchTarget.startsWith('https://')) {
      docQuery = docQuery.or(`room_url.eq.${searchTarget},meeting_url.eq.${searchTarget}`);
    } else {
      docQuery = docQuery.or(`id.eq.${searchTarget},call_id.eq.${searchTarget},meeting_room.eq.${searchTarget}`);
    }

    const { data: docConsult, error: docErr } = await docQuery.maybeSingle();
    if (docErr) throw docErr;

    if (docConsult) {
      // Authorization Check: Must be patient, assigned doctor, or admin
      const isAuthorized =
        auth.role === 'admin' ||
        auth.user.id === docConsult.patient_id ||
        auth.user.id === docConsult.doctor_id;

      if (!isAuthorized) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Find patient profile
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
        meetingProvider: docConsult.meeting_provider || 'STREAM',
        callId: docConsult.call_id || null,
        callType: docConsult.call_type || null,
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
      staffQuery = staffQuery.or(`id.eq.${searchTarget},call_id.eq.${searchTarget},meeting_room.eq.${searchTarget}`);
    }

    const { data: staffConsult, error: staffErr } = await staffQuery.maybeSingle();
    if (staffErr) throw staffErr;

    if (staffConsult) {
      // Authorization Check: Must be patient, assigned staff, or admin
      const isAuthorized =
        auth.role === 'admin' ||
        auth.user.id === staffConsult.patient_id ||
        auth.user.id === staffConsult.staff_id;

      if (!isAuthorized) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const { data: staffProfile } = await supabaseAdmin
        .from('profiles')
        .select('first_name, last_name, role')
        .eq('id', staffConsult.staff_id)
        .maybeSingle();

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
        meetingProvider: staffConsult.meeting_provider || 'STREAM',
        meetingRoom: staffConsult.meeting_room || null,
        meetingUrl: null,
        callId: staffConsult.call_id || null,
        callType: staffConsult.call_type || null,
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
