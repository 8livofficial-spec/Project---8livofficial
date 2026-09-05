import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { assertPharmacyOnboardingAccess } from '@/lib/pharmacySecurity'
import { audit } from '@/lib/prescriptionService'

export async function GET(request: Request) {
  try {
    const context = await assertPharmacyOnboardingAccess(request)
    const { pharmacy } = context

    return NextResponse.json({
      pharmacy: {
        id: pharmacy.id,
        name: pharmacy.name,
        legal_entity_name: pharmacy.legal_entity_name,
        drug_license_number: pharmacy.drug_license_number,
        drug_license_type: pharmacy.drug_license_type,
        drug_license_expiry: pharmacy.drug_license_expiry,
        pharmacist_name: pharmacy.pharmacist_name,
        pharmacist_registration_number: pharmacy.pharmacist_registration_number,
        email: pharmacy.email,
        phone: pharmacy.phone,
        address: pharmacy.address,
        verification_status: pharmacy.verification_status,
        status: pharmacy.status,
      },
    })
  } catch (err: any) {
    const status = err.status || 500
    return NextResponse.json({ error: err.message || 'Failed to fetch onboarding details' }, { status })
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await assertPharmacyOnboardingAccess(request)
    const { pharmacy, user, role } = context
    const body = await request.json().catch(() => ({}))

    const legalEntityName = String(body.legal_entity_name || body.legalEntityName || '').trim()
    const drugLicenseNumber = String(body.drug_license_number || body.drugLicenseNumber || '').trim()
    const drugLicenseType = String(body.drug_license_type || body.drugLicenseType || '').trim()
    const drugLicenseExpiry = body.drug_license_expiry || body.drugLicenseExpiry
    const pharmacistName = String(body.pharmacist_name || body.pharmacistName || '').trim()
    const pharmacistRegistrationNumber = String(
      body.pharmacist_registration_number || body.pharmacistRegistrationNumber || ''
    ).trim()
    const phone = String(body.phone || '').trim()
    const address = body.address || null

    if (!legalEntityName) {
      return NextResponse.json({ error: 'Legal entity name is required.' }, { status: 400 })
    }
    if (!drugLicenseNumber || drugLicenseNumber.startsWith('PENDING-')) {
      return NextResponse.json({ error: 'Valid drug license number is required.' }, { status: 400 })
    }
    if (!drugLicenseType) {
      return NextResponse.json({ error: 'Drug license type (e.g. Form 20B/21B) is required.' }, { status: 400 })
    }
    if (!drugLicenseExpiry) {
      return NextResponse.json({ error: 'Drug license expiry date is required.' }, { status: 400 })
    }
    if (!pharmacistName) {
      return NextResponse.json({ error: 'Registered pharmacist name is required.' }, { status: 400 })
    }
    if (!pharmacistRegistrationNumber || pharmacistRegistrationNumber === 'PENDING') {
      return NextResponse.json({ error: 'Pharmacist registration number is required.' }, { status: 400 })
    }

    const updates = {
      legal_entity_name: legalEntityName,
      drug_license_number: drugLicenseNumber,
      drug_license_type: drugLicenseType,
      drug_license_expiry: drugLicenseExpiry,
      pharmacist_name: pharmacistName,
      pharmacist_registration_number: pharmacistRegistrationNumber,
      phone: phone || pharmacy.phone,
      address: address || pharmacy.address,
      verification_status: 'UNDER_REVIEW',
      updated_at: new Date().toISOString(),
    }

    const { data: updated, error } = await supabaseAdmin
      .from('partner_pharmacies')
      .update(updates)
      .eq('id', pharmacy.id)
      .select('*')
      .single()

    if (error) throw error

    await audit({
      actorId: user.id,
      actorRole: role,
      action: 'PHARMACY_ONBOARDING_SUBMITTED',
      newValues: {
        pharmacy_id: pharmacy.id,
        drug_license_number: drugLicenseNumber,
        pharmacist_registration_number: pharmacistRegistrationNumber,
        verification_status: 'UNDER_REVIEW',
      },
      request,
    })

    return NextResponse.json({
      success: true,
      message: 'Onboarding details submitted successfully. Your pharmacy verification is now UNDER_REVIEW.',
      pharmacy: updated,
    })
  } catch (err: any) {
    const status = err.status || 500
    return NextResponse.json({ error: err.message || 'Failed to submit onboarding details' }, { status })
  }
}
