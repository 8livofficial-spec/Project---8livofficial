import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const { staffId, role } = await req.json();

    if (!staffId || !role) {
      return NextResponse.json({ error: 'Missing staffId or role' }, { status: 400 });
    }

    if (role !== 'trainer' && role !== 'dietitian' && role !== 'doctor') {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // 1. Fetch care team assignments for this staff member
    let assignmentsQuery = supabaseAdmin.from('care_team_assignments').select('*');
    if (role === 'trainer') {
      assignmentsQuery = assignmentsQuery.eq('trainer_id', staffId);
    } else if (role === 'dietitian') {
      assignmentsQuery = assignmentsQuery.eq('dietitian_id', staffId);
    } else if (role === 'doctor') {
      assignmentsQuery = assignmentsQuery.eq('doctor_id', staffId);
    }

    const { data: assignments, error: assignErr } = await assignmentsQuery;
    if (assignErr) throw assignErr;

    if (!assignments || assignments.length === 0) {
      return NextResponse.json({ patients: [] });
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

      // Trainer status calculation
      const isPaymentDue = !assess.consultation_fee_paid && !assess.membership_tier;
      const hasWeightLogs = pLogs.some(l => {
        const diffDays = (new Date().getTime() - new Date(l.created_at).getTime()) / (1000 * 3600 * 24);
        return diffDays <= 7;
      });
      const isCheckInDue = pLogs.length > 0 && !hasWeightLogs;
      const isGuidelinesDue = !assign.trainer_notes;
      
      let statusLabel = 'Active';
      let statusColor = 'bg-green-50 text-green-700';

      if (isPaymentDue) {
        statusLabel = 'Awaiting Payment';
        statusColor = 'bg-red-50 text-red-700';
      } else if (isCheckInDue || pLogs.length === 0) {
        statusLabel = 'Awaiting Check-in';
        statusColor = 'bg-amber-50 text-amber-700';
      } else if (isGuidelinesDue) {
        statusLabel = 'Awaiting Guidelines';
        statusColor = 'bg-amber-50 text-amber-700';
      } else {
        statusLabel = 'Guidelines Set';
        statusColor = 'bg-blue-50 text-blue-700';
      }

      return {
        id: assign.patient_id,
        first_name: assess.first_name || prof.first_name || (prof.email ? prof.email.split('@')[0] : null) || prof.display_id || 'Member',
        last_name: assess.last_name || prof.last_name || '',
        phone_number: assess.phone_number || prof.phone_number || null,
        height_cm: assess.height_cm ? parseFloat(assess.height_cm) : null,
        weight_kg: assess.weight_kg ? parseFloat(assess.weight_kg) : null,
        goal_weight_kg: assess.goal_weight_kg ? parseFloat(assess.goal_weight_kg) : null,
        extra_medical_info: assess.extra_medical_info || null,
        local_food: assess.local_food || null,
        medical_history: assess.medical_history || null,
        trainer_notes: assign.trainer_notes || null,
        dietitian_notes: assign.dietitian_notes || null,
        status_label: statusLabel,
        status_color: statusColor,
        weight_logs: pLogs.map(l => ({
          date: new Date(l.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
          weight: parseFloat(l.weight_kg)
        })),
        consultations: pConsults
      };
    });

    return NextResponse.json({ patients: enrichedPatients });
  } catch (err: any) {
    console.error('Error in POST /api/staff/patients:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
