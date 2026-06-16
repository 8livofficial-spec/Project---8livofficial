import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const adminId = searchParams.get('adminId')
    const format = searchParams.get('format') || 'json'

    if (!adminId) {
      return NextResponse.json({ error: 'Missing adminId' }, { status: 400 })
    }

    // 1. Verify admin role claim
    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', adminId)
      .maybeSingle()

    if (!adminProfile || adminProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 })
    }

    // 2. Query patient assessments
    const { data: assessments, error: fetchErr } = await supabaseAdmin
      .from('health_assessments')
      .select('*')
      .order('created_at', { ascending: false })

    if (fetchErr) throw fetchErr

    // 3. Query progress weight logs
    const { data: logs } = await supabaseAdmin
      .from('progress_logs')
      .select('*')

    // 4. Query consultations for doctor mappings
    const { data: consultations } = await supabaseAdmin
      .from('doctor_consultations')
      .select('*, doctor_profiles(full_name)')

    // 5. Query user profile names
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, phone_number')

    const profileMap = (profiles || []).reduce((acc: any, p: any) => {
      acc[p.id] = p
      return acc
    }, {})

    // 6. Aggregate patient metrics
    const reportData = (assessments || []).map(assess => {
      const patientId = assess.patient_id
      const startWeight = assess.weight_kg || 0
      const goalWeight = assess.goal_weight_kg || 0

      // Find last weight logged
      const patientLogs = (logs || [])
        .filter(l => l.user_id === patientId)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

      const currentWeight = patientLogs.length > 0 
        ? parseFloat(patientLogs[patientLogs.length - 1].weight_kg as any)
        : startWeight

      const weightLost = startWeight > 0 && currentWeight > 0 ? Math.max(0, startWeight - currentWeight) : 0

      // Find consultation status
      const patientConsult = (consultations || []).find(c => c.patient_id === patientId)
      const medicationStatus = patientConsult?.status || 'Pending Assessment'
      const doctorName = patientConsult?.doctor_profiles?.full_name || 'Not Assigned'

      const pProfile = profileMap[patientId] || {}
      const fullName = assess.full_name || `${assess.first_name || pProfile.first_name || ''} ${assess.last_name || pProfile.last_name || ''}`.trim() || 'Patient Member'

      return {
        id: patientId,
        name: fullName,
        phone: assess.phone_number || pProfile.phone_number || '-',
        plan: assess.membership_tier || 'No Plan Chosen',
        startingWeight: startWeight,
        currentWeight: currentWeight,
        goalWeight: goalWeight,
        weightLost: parseFloat(weightLost.toFixed(1)),
        medicationStatus,
        doctorName,
        bookingDate: assess.booking_date || '-',
        bookingTime: assess.booking_time || '-'
      }
    })

    // 7. Render report formatting (CSV vs JSON)
    if (format === 'csv') {
      const headers = ['Patient ID', 'Name', 'Phone', 'Active Plan', 'Starting Weight (kg)', 'Current Weight (kg)', 'Goal Weight (kg)', 'Weight Lost (kg)', 'Medication Status', 'Assigned Doctor', 'Booking Date', 'Booking Time']
      const rows = reportData.map(item => [
        item.id,
        `"${item.name.replace(/"/g, '""')}"`,
        item.phone,
        item.plan,
        item.startingWeight,
        item.currentWeight,
        item.goalWeight,
        item.weightLost,
        item.medicationStatus,
        `"${item.doctorName.replace(/"/g, '""')}"`,
        item.bookingDate,
        item.bookingTime
      ])

      const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
      
      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename=8liv_patients_report.csv'
        }
      })
    }

    return NextResponse.json({ reports: reportData })
  } catch (err: any) {
    console.error('API Error in /api/admin/reports:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
