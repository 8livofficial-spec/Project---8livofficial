import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/apiSecurity'
import { getCommercialRules, updateCommercialRules } from '@/lib/commercialRulesServer'

export async function GET(request: Request) {
  try {
    await assertAdmin(request)
    const rules = await getCommercialRules()
    return NextResponse.json({ success: true, rules })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to load commercial rules.'
    const status = message === 'Forbidden' ? 403 : (message === 'Unauthorized' ? 401 : 400)
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PATCH(request: Request) {
  try {
    await assertAdmin(request)
    const body = await request.json().catch(() => ({}))

    const consultationFee = body?.consultationFee !== undefined ? Number(body.consultationFee) : undefined
    const doctorPayout = body?.doctorPayout !== undefined ? Number(body.doctorPayout) : undefined
    const dietitianPayout = body?.dietitianPayout !== undefined ? Number(body.dietitianPayout) : undefined
    const fitnessCoachPayout = body?.fitnessCoachPayout !== undefined ? Number(body.fitnessCoachPayout) : undefined

    if (consultationFee !== undefined && (!Number.isFinite(consultationFee) || consultationFee <= 0)) {
      return NextResponse.json({ error: 'Consultation fee must be a positive number.' }, { status: 400 })
    }

    if (doctorPayout !== undefined && (!Number.isFinite(doctorPayout) || doctorPayout < 0)) {
      return NextResponse.json({ error: 'Doctor payout must be a non-negative number.' }, { status: 400 })
    }

    const rules = await updateCommercialRules({
      consultationFee,
      doctorPayout,
      dietitianPayout,
      fitnessCoachPayout,
    })

    return NextResponse.json({ success: true, rules })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to update commercial rules.'
    const status = message === 'Forbidden' ? 403 : (message === 'Unauthorized' ? 401 : 400)
    return NextResponse.json({ error: message }, { status })
  }
}
