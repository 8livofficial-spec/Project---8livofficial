import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertPharmacyStaff } from '@/lib/pharmacySecurity'
import { errorResponse } from '@/lib/fulfilmentAuth'

export async function GET(request: Request) {
  try {
    const ctx = await assertPharmacyStaff(request)
    const { searchParams } = new URL(request.url)
    const windowParam = searchParams.get('window') || '7'
    const days = [7, 14, 30].includes(Number(windowParam)) ? Number(windowParam) : 7

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const windowEndDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000)
    const windowEndStr = windowEndDate.toISOString().split('T')[0]

    // 1. Fetch valid, authorized/issued prescriptions
    // Exclude REVOKED, CANCELLED, EXPIRED, DRAFT
    const { data: prescriptions, error: rxError } = await supabaseAdmin
      .from('prescriptions')
      .select(`
        id,
        prescription_number,
        status,
        issued_at,
        created_at,
        valid_until,
        canonical_data,
        prescription_items (
          id,
          medicine_name,
          generic_name,
          brand_name,
          strength,
          dosage_form,
          route,
          dose,
          frequency,
          quantity,
          duration_value,
          duration_unit
        ),
        pharmacy_orders (
          id,
          pharmacy_id,
          status,
          created_at
        )
      `)
      .in('status', ['ISSUED', 'SIGNED'])
      .gte('valid_until', todayStr)
      .order('created_at', { ascending: false })

    if (rxError) throw rxError

    const rxList = prescriptions || []

    // 2. Server-side Aggregation Map
    const aggregateMap = new Map<
      string,
      {
        medicine_name: string
        strength: string
        dosage_form: string
        route: string
        expected_quantity: number
        prescriptions_count: number
        forecasted_quantity: number
        committed_quantity: number
        actual_order_quantity: number
        prescription_numbers: Set<string>
      }
    >()

    const upcomingFulfillments: Array<{
      id: string
      prescription_number: string
      medicine_summary: string
      quantity: number
      expected_fulfillment_date: string
      stage: 'FORECASTED' | 'COMMITTED' | 'ACTUAL_ORDER'
      status: string
    }> = []

    let totalPrescriptions = 0
    let totalUnits = 0

    for (const rx of rxList) {
      // Determine expected fulfillment date
      let expDateStr: string = rx.canonical_data?.expected_fulfillment_date || ''
      if (!expDateStr) {
        const baseDate = new Date(rx.issued_at || rx.created_at)
        baseDate.setDate(baseDate.getDate() + 2) // Default +2 days from issuance
        expDateStr = baseDate.toISOString().split('T')[0]
      }

      // Filter by forecast window (within today to windowEnd)
      if (expDateStr > windowEndStr) {
        continue
      }

      const orders = Array.isArray(rx.pharmacy_orders) ? rx.pharmacy_orders : []
      const activeOrder = orders.find((o: any) => !['CANCELLED', 'UNABLE_TO_FULFILL'].includes(o.status))

      // Stage classification
      let stage: 'FORECASTED' | 'COMMITTED' | 'ACTUAL_ORDER' = 'FORECASTED'
      if (activeOrder) {
        if (activeOrder.pharmacy_id) {
          stage = 'ACTUAL_ORDER'
        } else {
          stage = 'COMMITTED'
        }
      }

      const items = Array.isArray(rx.prescription_items) ? rx.prescription_items : []
      if (!items.length) continue

      totalPrescriptions++

      const itemSummaries: string[] = []
      let rxTotalUnits = 0

      for (const it of items) {
        const key = `${it.medicine_name.trim().toLowerCase()}::${it.strength.trim().toLowerCase()}::${it.dosage_form.trim().toLowerCase()}`
        const qty = Number(it.quantity) || 0
        rxTotalUnits += qty
        totalUnits += qty

        itemSummaries.push(`${it.medicine_name} ${it.strength} (${qty} units)`)

        if (!aggregateMap.has(key)) {
          aggregateMap.set(key, {
            medicine_name: it.medicine_name,
            strength: it.strength,
            dosage_form: it.dosage_form,
            route: it.route || 'Oral',
            expected_quantity: 0,
            prescriptions_count: 0,
            forecasted_quantity: 0,
            committed_quantity: 0,
            actual_order_quantity: 0,
            prescription_numbers: new Set(),
          })
        }

        const entry = aggregateMap.get(key)!
        entry.expected_quantity += qty
        entry.prescription_numbers.add(rx.prescription_number)

        if (stage === 'ACTUAL_ORDER') entry.actual_order_quantity += qty
        else if (stage === 'COMMITTED') entry.committed_quantity += qty
        else entry.forecasted_quantity += qty
      }

      upcomingFulfillments.push({
        id: rx.id,
        prescription_number: rx.prescription_number,
        medicine_summary: itemSummaries.join(', '),
        quantity: rxTotalUnits,
        expected_fulfillment_date: expDateStr,
        stage,
        status: activeOrder?.status || rx.status,
      })
    }

    const aggregateList = Array.from(aggregateMap.values()).map((item) => ({
      medicine_name: item.medicine_name,
      strength: item.strength,
      dosage_form: item.dosage_form,
      route: item.route,
      expected_quantity: item.expected_quantity,
      prescriptions_count: item.prescription_numbers.size,
      forecasted_quantity: item.forecasted_quantity,
      committed_quantity: item.committed_quantity,
      actual_order_quantity: item.actual_order_quantity,
    }))

    aggregateList.sort((a, b) => b.expected_quantity - a.expected_quantity)

    // Sort fulfillments chronologically
    upcomingFulfillments.sort((a, b) => a.expected_fulfillment_date.localeCompare(b.expected_fulfillment_date))

    return NextResponse.json({
      success: true,
      windowDays: days,
      windowEnd: windowEndStr,
      pharmacy: {
        id: ctx.pharmacy.id,
        name: ctx.pharmacy.name,
      },
      aggregateDemand: aggregateList,
      upcomingFulfillments,
      totalPrescriptions,
      totalUnits,
      disclaimer: 'Upcoming demand is an informational projection based on authorized clinical prescriptions. 8LIV does not manage pharmacy procurement or stock levels.',
    })
  } catch (err: any) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}
