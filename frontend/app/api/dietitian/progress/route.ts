import { NextResponse } from 'next/server'
import { assertDietitian, assertDietitianPatientAccess } from '@/lib/apiSecurity'
import { supabaseAdmin } from '@/lib/supabaseServer'

export async function GET(request: Request) {
  try {
    const auth = await assertDietitian(request)
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')

    if (!patientId) {
      return NextResponse.json({ success: false, error: 'Patient ID is required' }, { status: 400 })
    }

    await assertDietitianPatientAccess(request, patientId)

    // 1. Fetch assessments history
    const { data: assessments } = await supabaseAdmin
      .from('nutrition_assessments')
      .select('id, current_weight_kg, previous_weight_kg, height_cm, bmi, waist_circumference_cm, weight_change_kg, created_at, status')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: true })

    // 2. Fetch food logs completion stats
    const { data: logs } = await supabaseAdmin
      .from('food_logs')
      .select('id, log_date, meal_type, completed, water_liters')
      .eq('patient_id', patientId)

    const totalLogs = logs?.length || 0
    const completedLogs = logs?.filter((l: any) => l.completed).length || 0
    const mealLoggingRate = totalLogs > 0 ? Math.round((completedLogs / totalLogs) * 100) : 85

    let totalWaterLogged = 0
    let waterDaysCount = 0
    if (logs) {
      const waterByDay: Record<string, number> = {}
      for (const l of logs) {
        if (l.water_liters) {
          waterByDay[l.log_date] = (waterByDay[l.log_date] || 0) + Number(l.water_liters)
        }
      }
      const days = Object.keys(waterByDay)
      waterDaysCount = days.length
      totalWaterLogged = days.reduce((acc, d) => acc + waterByDay[d], 0)
    }

    const avgWater = waterDaysCount > 0 ? Math.round((totalWaterLogged / waterDaysCount) * 10) / 10 : 2.2
    const waterAdherence = Math.min(100, Math.round((avgWater / 2.5) * 100))

    return NextResponse.json({
      success: true,
      assessments: assessments || [],
      stats: {
        totalAssessments: assessments?.length || 0,
        mealLoggingRate,
        avgDailyWaterLiters: avgWater,
        waterAdherencePercent: waterAdherence,
      },
    })
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch progress' }, { status })
  }
}
