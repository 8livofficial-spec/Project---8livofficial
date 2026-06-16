import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const { roomUrl, queryId } = await req.json();

    if (!roomUrl && !queryId) {
      return NextResponse.json({ error: 'roomUrl or queryId is required' }, { status: 400 });
    }

    // Target search term: look for matches in room_url
    const searchTarget = roomUrl || queryId;

    // 1. Search in doctor_consultations
    let docQuery = supabaseAdmin
      .from('doctor_consultations')
      .select('*, doctor_profiles(full_name, specialty)');

    if (searchTarget.startsWith('https://')) {
      docQuery = docQuery.eq('room_url', searchTarget);
    } else {
      docQuery = docQuery.or(`room_url.eq.${searchTarget},room_url.ilike.%${searchTarget}%`);
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
        providerName: docConsult.doctor_profiles?.full_name || 'Dr. Priya Sharma',
        providerRole: docConsult.doctor_profiles?.specialty || 'Physician Specialist',
        status: docConsult.status
      });
    }

    // 2. Search in staff_consultations
    let staffQuery = supabaseAdmin
      .from('staff_consultations')
      .select('*');

    if (searchTarget.startsWith('https://')) {
      staffQuery = staffQuery.eq('room_url', searchTarget);
    } else {
      staffQuery = staffQuery.or(`room_url.eq.${searchTarget},room_url.ilike.%${searchTarget}%`);
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

      const roleCapitalized = staffConsult.staff_role.charAt(0).toUpperCase() + staffConsult.staff_role.slice(1);
      const providerName = staffProfile 
        ? `${staffProfile.first_name || ''} ${staffProfile.last_name || ''}`.trim()
        : `${roleCapitalized} Specialist`;

      return NextResponse.json({
        success: true,
        type: 'staff',
        consultationId: staffConsult.id,
        patientId: staffConsult.patient_id,
        patientName: patientProfile ? `${patientProfile.first_name || ''} ${patientProfile.last_name || ''}`.trim() : 'Patient',
        providerId: staffConsult.staff_id,
        providerName: providerName,
        providerRole: `${roleCapitalized} Specialist`,
        status: staffConsult.status
      });
    }

    return NextResponse.json({ error: 'Consultation not found' }, { status: 404 });

  } catch (err: any) {
    console.error('Error in POST /api/patient/consultation-details:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
