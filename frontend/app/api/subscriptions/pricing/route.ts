import { NextResponse } from 'next/server'
import { getActiveTreatmentPlans, computePlanPricing } from '@/lib/subscriptionService'

export async function GET() {
  try {
    const plans = await getActiveTreatmentPlans()
    const tiers = plans.map(p => {
      const calc = computePlanPricing(p.base_price, p.discount_percentage, p.duration_months)
      return {
        id: p.id,
        name: p.name,
        durationMonths: p.duration_months,
        basePrice: calc.basePrice,
        discountPercentage: calc.discountPercentage,
        discountAmount: calc.discountAmount,
        finalPrice: calc.finalPrice,
        monthlyEquivalent: calc.monthlyEquivalent,
        currency: p.currency || 'INR',
        description: p.description,
        features: p.features || [],
        displayOrder: p.display_order,
      }
    })

    return NextResponse.json({
      success: true,
      plans: tiers,
      tiers, // backwards compatibility
      currency: 'INR',
    })
  } catch (err: any) {
    console.error('Error fetching subscription pricing:', err)
    return NextResponse.json({ error: err.message || 'Unable to load subscription pricing' }, { status: 500 })
  }
}
