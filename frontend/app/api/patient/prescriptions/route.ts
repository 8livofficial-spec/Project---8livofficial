import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertPatient, errorResponse } from '@/lib/fulfilmentAuth'

export async function GET(request: Request) {
  try {
    const auth = await assertPatient(request)

    // Fetch patient's authorized prescriptions (exclude drafts)
    let rawPrescriptions: any[] = []
    const { data, error } = await supabaseAdmin
      .from('prescriptions')
      .select('*, prescription_items(*), pharmacy_orders(id, status, vendor, estimated_delivery_at, courier_name, tracking_number, delivery_address_snapshot, created_at)')
      .eq('patient_id', auth.user.id)
      .neq('status', 'DRAFT')
      .order('created_at', { ascending: false })

    if (!error && data) {
      rawPrescriptions = data
    } else {
      console.warn('Nested query on prescriptions failed, attempting fallback query:', error?.message)
      const { data: fallbackData } = await supabaseAdmin
        .from('prescriptions')
        .select('*, prescription_items(*)')
        .eq('patient_id', auth.user.id)
        .neq('status', 'DRAFT')
        .order('created_at', { ascending: false })

      rawPrescriptions = fallbackData || []
    }

    // Enrich with doctor profile information
    const doctorIds = Array.from(new Set(rawPrescriptions.map((rx) => rx.doctor_id).filter(Boolean)))
    let doctorsMap = new Map()

    if (doctorIds.length > 0) {
      try {
        const [{ data: docProfiles }, { data: baseProfiles }] = await Promise.all([
          supabaseAdmin
            .from('doctor_profiles')
            .select('*')
            .in('id', doctorIds),
          supabaseAdmin
            .from('profiles')
            .select('id, first_name, last_name, full_name, email')
            .in('id', doctorIds),
        ])

        const baseMap = new Map((baseProfiles || []).map((p: any) => [p.id, p]))

        for (const doc of docProfiles || []) {
          const base = baseMap.get(doc.id)
          const name = doc.full_name || (base ? `${base.first_name || ''} ${base.last_name || ''}`.trim() || base.full_name : null) || 'Licensed Physician'
          doctorsMap.set(doc.id, {
            id: doc.id,
            name: name.startsWith('Dr.') ? name : `Dr. ${name}`,
            specialty: doc.specialty || 'General Medicine / Metabolic Health',
            qualification: doc.qualification || 'MBBS',
            reg_number: doc.medical_council_reg_number || doc.mci_number || 'Registered Medical Practitioner',
            council: doc.medical_council_name || doc.registration_council || 'Medical Council of India',
          })
        }
      } catch (docErr) {
        console.warn('[patient/prescriptions] Doctor profile lookup warning:', docErr)
      }
    }

    const enriched = rawPrescriptions.map((rx) => {
      const doc = doctorsMap.get(rx.doctor_id) || rx.canonical_data?.doctor || {
        name: 'Authorized 8LIV Doctor',
        specialty: 'Metabolic & Obesity Medicine',
        reg_number: 'RMP',
      }
      return {
        ...rx,
        doctor: doc,
        is_active: !['DRAFT', 'REVOKED', 'CANCELLED', 'REPLACED'].includes(rx.status),
      }
    })

    // Find the primary active prescription
    const activePrescription = enriched.find((rx) => rx.is_active) || null

    return NextResponse.json({
      prescriptions: enriched,
      activePrescription,
    })
  } catch (err) {
    console.error('Error in /api/patient/prescriptions:', err)
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error, prescriptions: [], activePrescription: null }, { status: failure.status })
  }
}
