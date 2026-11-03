import { NextResponse } from 'next/server'
import { getCommercialRules } from '@/lib/commercialRulesServer'

export async function GET() {
  try {
    const rules = await getCommercialRules()
    return NextResponse.json({
      success: true,
      consultationFee: rules.consultationFee,
      doctorPayout: rules.doctorPayout,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    })
  } catch (err: any) {
    return NextResponse.json({
      success: true,
      consultationFee: 350,
      doctorPayout: 300,
    })
  }
}
