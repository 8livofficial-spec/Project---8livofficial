import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function seed() {
  console.log('Seeding pharmacy fulfillment orders for verified Demo_pharmacy...')

  // 1. Get Demo_pharmacy
  const { data: pharmacy, error: pharmError } = await supabase
    .from('partner_pharmacies')
    .select('*')
    .eq('id', '76e16b26-56c2-4cfc-a272-91c0b1a6a271')
    .single()

  if (pharmError || !pharmacy) {
    console.error('Demo_pharmacy not found:', pharmError)
    process.exit(1)
  }
  console.log(`Found partner pharmacy: ${pharmacy.name} (${pharmacy.id}), Status: ${pharmacy.status}, Verification: ${pharmacy.verification_status}`)

  // 2. Fetch existing authorized prescriptions
  const { data: prescriptions, error: rxErr } = await supabase
    .from('prescriptions')
    .select('*, prescription_items(*)')
    .in('status', ['ISSUED', 'SIGNED'])

  if (rxErr || !prescriptions || prescriptions.length === 0) {
    console.error('No issued prescriptions found:', rxErr)
    process.exit(1)
  }

  console.log(`Found ${prescriptions.length} issued prescriptions. Setting up subscriptions, cycles & fulfillment orders...`)

  for (let i = 0; i < prescriptions.length; i++) {
    const rx = prescriptions[i]
    console.log(`\nProcessing Prescription #${rx.prescription_number} (${rx.id})...`)

    // A. Subscriptions & Treatment Cycles
    let { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('patient_id', rx.patient_id)
      .eq('status', 'ACTIVE')
      .maybeSingle()

    const now = new Date()
    const startDate = now.toISOString().split('T')[0]
    const endDate = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate()).toISOString().split('T')[0]

    if (!sub) {
      const { data: newSub, error: subErr } = await supabase
        .from('subscriptions')
        .insert({
          tenant_id: rx.tenant_id || '8liv',
          patient_id: rx.patient_id,
          duration_months: 3,
          program_name: 'Medical Weight Management Program',
          base_monthly_price: 4999,
          original_price: 14997,
          final_price: 14997,
          start_date: startDate,
          end_date: endDate,
          status: 'ACTIVE',
          payment_status: 'PAID',
        })
        .select('*')
        .single()

      if (subErr) {
        console.error('Error creating subscription:', subErr)
        continue
      }
      sub = newSub
      console.log(`Created active subscription: ${sub.id}`)
    }

    let { data: cycle } = await supabase
      .from('treatment_cycles')
      .select('*')
      .eq('subscription_id', sub.id)
      .eq('cycle_number', 1)
      .maybeSingle()

    if (!cycle) {
      const cycleEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).toISOString().split('T')[0]
      const { data: newCycle, error: cErr } = await supabase
        .from('treatment_cycles')
        .insert({
          tenant_id: rx.tenant_id || '8liv',
          subscription_id: sub.id,
          patient_id: rx.patient_id,
          doctor_id: rx.doctor_id,
          cycle_number: 1,
          start_date: startDate,
          end_date: cycleEnd,
          status: 'ACTIVE',
        })
        .select('*')
        .single()

      if (cErr) {
        console.error('Error creating cycle:', cErr)
        continue
      }
      cycle = newCycle
      console.log(`Created treatment cycle 1: ${cycle.id}`)
    }

    // Bind cycle to prescription
    await supabase
      .from('prescriptions')
      .update({ treatment_cycle_id: cycle.id })
      .eq('id', rx.id)

    // B. Delivery Address
    let { data: addr } = await supabase
      .from('patient_delivery_addresses')
      .select('*')
      .eq('patient_id', rx.patient_id)
      .maybeSingle()

    if (!addr) {
      const defaultAddrs = [
        {
          recipient_name: 'Rohit Sharma',
          phone: '+91 98765 43210',
          line1: 'Flat 402, Green Glen Heights',
          line2: 'Outer Ring Road, Bellandur',
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560103',
          is_default: true,
        },
        {
          recipient_name: 'Ananya Deshmukh',
          phone: '+91 98112 34567',
          line1: 'B-12, Palm Meadows, Whitefield',
          line2: 'Near Forum Shantiniketan',
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560066',
          is_default: true,
        }
      ]

      const addrData = defaultAddrs[i % defaultAddrs.length]
      const { data: newAddr, error: addrErr } = await supabase
        .from('patient_delivery_addresses')
        .insert({
          tenant_id: rx.tenant_id || '8liv',
          patient_id: rx.patient_id,
          ...addrData,
        })
        .select('*')
        .single()

      if (addrErr) {
        console.error('Error inserting delivery address:', addrErr)
      } else {
        addr = newAddr
      }
    }

    const addressSnapshot = addr ? {
      recipient_name: addr.recipient_name,
      phone: addr.phone,
      line1: addr.line1,
      line2: addr.line2 || '',
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      snapshot_taken_at: new Date().toISOString(),
      address_id: addr.id,
    } : {
      recipient_name: 'Verified Patient',
      phone: '+91 98765 43210',
      line1: '12th Cross, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560038',
      snapshot_taken_at: new Date().toISOString(),
    }

    // C. Create or update Pharmacy Order
    const { data: existingOrder } = await supabase
      .from('pharmacy_orders')
      .select('*')
      .eq('prescription_id', rx.id)
      .maybeSingle()

    const targetStatus = i === 0 ? 'RECEIVED' : 'ACKNOWLEDGED'

    if (!existingOrder) {
      const { data: createdOrder, error: orderErr } = await supabase
        .from('pharmacy_orders')
        .insert({
          tenant_id: rx.tenant_id || '8liv',
          prescription_id: rx.id,
          patient_id: rx.patient_id,
          pharmacy_id: pharmacy.id,
          status: targetStatus,
          delivery_address_snapshot: addressSnapshot,
          patient_phone_snapshot: addressSnapshot.phone,
          idempotency_key: `seed:order:${rx.id}`,
          version: 1,
        })
        .select('*')
        .single()

      if (orderErr) {
        console.error('Error creating pharmacy order:', orderErr)
        continue
      }

      console.log(`Created pharmacy order ${createdOrder.id} with status: ${targetStatus}`)

      // Status history
      await supabase.from('pharmacy_order_status_history').insert([
        {
          pharmacy_order_id: createdOrder.id,
          previous_status: null,
          new_status: 'PENDING_ASSIGNMENT',
          changed_by: rx.patient_id,
          reason: 'Patient confirmed delivery details',
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          pharmacy_order_id: createdOrder.id,
          previous_status: 'PENDING_ASSIGNMENT',
          new_status: 'RECEIVED',
          changed_by: pharmacy.user_id || 'system',
          reason: `Assigned to partner pharmacy: ${pharmacy.name}`,
          created_at: new Date(Date.now() - 1800000).toISOString(),
        },
        ...(targetStatus === 'ACKNOWLEDGED' ? [{
          pharmacy_order_id: createdOrder.id,
          previous_status: 'RECEIVED',
          new_status: 'ACKNOWLEDGED',
          changed_by: pharmacy.user_id || 'system',
          reason: 'Order acknowledged by partner pharmacy staff',
          created_at: new Date().toISOString(),
        }] : [])
      ])
    } else {
      // Update existing order with pharmacy_id and target status
      await supabase
        .from('pharmacy_orders')
        .update({
          pharmacy_id: pharmacy.id,
          status: targetStatus,
          delivery_address_snapshot: addressSnapshot,
          patient_phone_snapshot: addressSnapshot.phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingOrder.id)
      console.log(`Updated existing order ${existingOrder.id} to pharmacy ${pharmacy.name} with status ${targetStatus}`)
    }
  }

  // Verify final count
  const { data: finalOrders } = await supabase
    .from('pharmacy_orders')
    .select('id, status, pharmacy_id, prescriptions(prescription_number, prescription_items(*))')
    .eq('pharmacy_id', pharmacy.id)

  console.log(`\nVerification successful! ${finalOrders?.length || 0} fulfillment orders now assigned to ${pharmacy.name}:`)
  for (const o of finalOrders || []) {
    const rx = o.prescriptions
    const items = rx?.prescription_items || []
    console.log(`- Order: 8LIV-PO-${o.id.slice(0, 8).toUpperCase()} | Status: ${o.status} | Rx: ${rx?.prescription_number} | Items: ${items.map(it => `${it.medicine_name} (Qty: ${it.quantity})`).join(', ')}`)
  }
}

seed().catch(err => {
  console.error('Unhandled seed error:', err)
  process.exit(1)
})
