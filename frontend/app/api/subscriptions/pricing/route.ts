import { NextResponse } from 'next/server'
import { getActiveTreatmentPlans, computePlanPricing, isFirstTimeSubscriber } from '@/lib/subscriptionService'
import { getAuthenticatedPatient } from '@/lib/appointmentAvailability'
import { supabaseAdmin } from '@/lib/supabaseServer'

export async function GET(request: Request) {
  try {
    let isFirstTime = true
    let patientId: string | undefined
    try {
      const patient = await getAuthenticatedPatient(request)
      if (!('error' in patient) && patient?.user?.id) {
        patientId = patient.user.id
        isFirstTime = await isFirstTimeSubscriber(patient.user.id)
      }
    } catch (_) {
      isFirstTime = true
    }

    const plans = await getActiveTreatmentPlans()
    const requestedCoachingPack = new URL(request.url).searchParams.get('includeIneligiblePack') === 'true'
    const visiblePlans = plans.filter((plan) => !plan.metadata?.is_ineligible_patient_pack || requestedCoachingPack)
    const tiers = visiblePlans.map(p => {
      const calc = computePlanPricing(
        p.base_price,
        p.discount_percentage,
        p.duration_months,
        isFirstTime,
        p.final_price
      )
      const meta = (p.metadata || {}) as Record<string, any>
      const duration = p.duration_months || 1
      const maxConsultations = meta.max_consultations || {
        doctor: duration === 1 ? 1 : duration,
        dietitian: duration === 1 ? 1 : duration,
        fitness_coach: duration === 1 ? 1 : duration,
      }
      const totalConsultations = meta.total_consultations || (maxConsultations.doctor + maxConsultations.dietitian + maxConsultations.fitness_coach)

      return {
        id: p.id,
        name: p.name,
        durationMonths: p.duration_months,
        durationDays: Number(meta.duration_days) || undefined,
        isIneligiblePatientPack: Boolean(meta.is_ineligible_patient_pack),
        basePrice: calc.basePrice,
        renewalPrice: calc.renewalPrice,
        firstTimePrice: calc.firstTimePrice,
        originalPrice: calc.basePrice,
        discountPercentage: calc.discountPercentage,
        discountAmount: calc.discountAmount,
        finalPrice: calc.finalPrice,
        monthlyEquivalent: calc.monthlyEquivalent,
        currency: p.currency || 'INR',
        description: p.description,
        features: p.features || [],
        displayOrder: p.display_order,
        maxConsultations,
        totalConsultations,
        isFirstTimeOffer: calc.isFirstTimeOffer,
      }
    })

    const payload = {
      success: true,
      isFirstTime,
      plans: tiers,
      tiers, // backwards compatibility
      currency: 'INR',
    }

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': requestedCoachingPack ? 'private, no-store, max-age=0' : isFirstTime ? 'public, s-maxage=60, stale-while-revalidate=120' : 'no-store, max-age=0',
      }
    })
  } catch (err: any) {
    console.error('Error fetching subscription pricing:', err)
    return NextResponse.json({ error: err.message || 'Unable to load subscription pricing' }, { status: 500 })
  }
}
