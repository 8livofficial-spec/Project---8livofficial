import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertAdmin, errorResponse } from '@/lib/fulfilmentAuth'
import { audit } from '@/lib/prescriptionService'

export async function GET(request: Request) {
  try {
    await assertAdmin(request)

    const { data: pharmacies, error } = await supabaseAdmin
      .from('partner_pharmacies')
      .select('*, partner_pharmacy_users(id, user_id, role, status)')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ pharmacies: pharmacies || [] })
  } catch (err) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}

export async function POST(request: Request) {
  try {
    const admin = await assertAdmin(request)
    const body = await request.json()

    const name = String(body.name || '').trim()
    const drugLicenseNumber = String(body.drug_license_number || body.drugLicenseNumber || '').trim()
    if (!name || !drugLicenseNumber) {
      return NextResponse.json(
        { error: 'Pharmacy name and drug license number are required.' },
        { status: 400 }
      )
    }

    // Dynamic drug license type as supplied by the partner (NEVER hardcoded)
    const drugLicenseType = body.drug_license_type || body.drugLicenseType || null

    const { data: pharmacy, error } = await supabaseAdmin
      .from('partner_pharmacies')
      .insert({
        tenant_id: '8liv',
        name,
        legal_entity_name: body.legal_entity_name || body.legalEntityName || null,
        drug_license_number: drugLicenseNumber,
        drug_license_type: drugLicenseType,
        drug_license_expiry: body.drug_license_expiry || body.drugLicenseExpiry || null,
        pharmacist_name: body.pharmacist_name || body.pharmacistName || null,
        pharmacist_registration_number: body.pharmacist_registration_number || body.pharmacistRegistrationNumber || null,
        email: body.email || null,
        phone: body.phone || null,
        address: body.address || null,
        // Mandatory defaults per business rule:
        verification_status: 'PENDING',
        status: 'INACTIVE',
      })
      .select('*')
      .single()

    if (error) throw error

    await audit({
      actorId: admin.user.id,
      actorRole: 'admin',
      action: 'PARTNER_PHARMACY_APPLICATION_CREATED',
      newValues: { pharmacyId: pharmacy.id, name, verification_status: 'PENDING', status: 'INACTIVE' },
      request,
    })

    return NextResponse.json({ success: true, pharmacy }, { status: 201 })
  } catch (err) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await assertAdmin(request)
    const body = await request.json()

    const pharmacyId = body.id || body.pharmacyId
    if (!pharmacyId) {
      return NextResponse.json({ error: 'Pharmacy ID is required.' }, { status: 400 })
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (body.verification_status) {
      const vs = String(body.verification_status).toUpperCase()
      if (!['PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED', 'SUSPENDED'].includes(vs)) {
        return NextResponse.json({ error: 'Invalid verification status.' }, { status: 400 })
      }
      updates.verification_status = vs
      if (vs === 'VERIFIED') {
        updates.verified_at = new Date().toISOString()
        updates.verified_by = admin.user.id
      }
    }

    if (body.status) {
      const s = String(body.status).toUpperCase()
      if (!['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(s)) {
        return NextResponse.json({ error: 'Invalid operational status.' }, { status: 400 })
      }
      updates.status = s
    }

    if (body.drug_license_type !== undefined) {
      updates.drug_license_type = body.drug_license_type
    }
    if (body.drug_license_expiry !== undefined) {
      updates.drug_license_expiry = body.drug_license_expiry
    }

    const { data: updated, error } = await supabaseAdmin
      .from('partner_pharmacies')
      .update(updates)
      .eq('id', pharmacyId)
      .select('*')
      .single()

    if (error) throw error

    await audit({
      actorId: admin.user.id,
      actorRole: 'admin',
      action: 'PARTNER_PHARMACY_STATUS_UPDATED',
      newValues: updates,
      request,
    })

    return NextResponse.json({ success: true, pharmacy: updated })
  } catch (err) {
    const failure = errorResponse(err instanceof Error ? err.message : 'Internal Server Error')
    return NextResponse.json({ error: failure.error }, { status: failure.status })
  }
}
