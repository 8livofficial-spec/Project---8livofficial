import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const { doctorId } = await req.json();

    if (!doctorId) {
      return NextResponse.json({ error: 'doctorId is required' }, { status: 400 });
    }

    // 1. Load doctor's own consultations
    const { data: ownConsultations, error: ownErr } = await supabaseAdmin
      .from('doctor_consultations')
      .select('*')
      .eq('doctor_id', doctorId)
      .order('created_at', { ascending: false });

    if (ownErr) throw ownErr;

    // 2. Load all scheduled patient booking requests
    const { data: allScheduled, error: schedErr } = await supabaseAdmin
      .from('doctor_consultations')
      .select('*')
      .eq('status', 'scheduled')
      .order('created_at', { ascending: true });

    if (schedErr) throw schedErr;

    const availableRequests = (allScheduled || []).filter((c: any) => c.doctor_id !== doctorId);

    // Get all patient IDs to fetch profiles and health assessments
    const allPatientIds = Array.from(new Set([
      ...(ownConsultations || []).map(c => c.patient_id),
      ...(availableRequests || []).map(c => c.patient_id)
    ]));

    // Fetch profiles and assessments using admin client (bypassing RLS)
    const [profilesRes, assessmentsRes] = await Promise.all([
      supabaseAdmin.from('profiles').select('*').in('id', allPatientIds),
      supabaseAdmin.from('health_assessments').select('*').in('patient_id', allPatientIds)
    ]);

    const profiles = profilesRes.data || [];
    const assessments = assessmentsRes.data || [];

    // Helper function to enrich consultation
    const enrich = (c: any) => {
      const prof = profiles.find(p => p.id === c.patient_id) || {};
      const assess = assessments.find(a => a.patient_id === c.patient_id) || {};
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
        patient_history: assess.medical_history || null,
        patient_extra_info: assess.extra_medical_info || null,
        patient_local_food: assess.local_food || null,
        patient_workout_pref: assess.workout_preference || null,
      };
    };

    return NextResponse.json({
      consultations: (ownConsultations || []).map(enrich),
      availableRequests: (availableRequests || []).map(enrich)
    });
  } catch (err: any) {
    console.error('Error in POST /api/doctor/consultations:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
