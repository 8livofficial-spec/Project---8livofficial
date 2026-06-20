import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import {
  createRazorpayXContact,
  createRazorpayXFundAccount,
  createRazorpayXPayout,
} from '@/lib/razorpayx'

const DOCTOR_PAYOUT_AMOUNT = 300
const DOCTOR_PAYOUT_AMOUNT_PAISE = DOCTOR_PAYOUT_AMOUNT * 100

type WalletTransaction = {
  id: string
  doctor_id: string
  patient_id?: string | null
  appointment_id?: string | null
  type: string
  amount: number
  status?: string | null
  payout_status?: string | null
  razorpay_contact_id?: string | null
  razorpay_fund_account_id?: string | null
  razorpay_payout_id?: string | null
}

type DoctorPayoutAccount = {
  doctor_id: string
  account_type: 'bank_account' | 'vpa'
  beneficiary_name: string
  account_number?: string | null
  ifsc?: string | null
  vpa?: string | null
  razorpay_contact_id?: string | null
  razorpay_fund_account_id?: string | null
}

type DoctorProfile = {
  id: string
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  phone_number?: string | null
}

const getErrorMessage = (err: unknown) => err instanceof Error ? err.message : 'Internal Server Error'

async function verifyAdmin(adminId: string) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', adminId)
    .maybeSingle()

  if (error) throw error
  return data?.role === 'admin'
}

async function loadPendingTransaction(transactionId: string): Promise<WalletTransaction> {
  const { data, error } = await supabaseAdmin
    .from('doctor_wallet_transactions')
    .select('*')
    .eq('id', transactionId)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('Wallet transaction not found.')

  const tx = data as WalletTransaction
  if (tx.type !== 'CONSULTATION_PAYOUT') {
    throw new Error('Only consultation payout transactions can be sent through RazorpayX.')
  }
  if (Number(tx.amount) !== DOCTOR_PAYOUT_AMOUNT) {
    throw new Error('Unexpected payout amount. Consultation payouts must be ₹300.')
  }
  if (tx.razorpay_payout_id || ['PROCESSING', 'PROCESSED'].includes(String(tx.payout_status || '').toUpperCase())) {
    throw new Error('This appointment payout has already been submitted.')
  }
  if (String(tx.status || '').toUpperCase() !== 'CREDITED') {
    throw new Error('Doctor wallet must be credited before payout can be initiated.')
  }

  return tx
}

async function processTransaction(transactionId: string) {
  const tx = await loadPendingTransaction(transactionId)

  const [{ data: doctorProfile, error: profileError }, { data: payoutAccount, error: accountError }] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, email, phone_number')
      .eq('id', tx.doctor_id)
      .maybeSingle(),
    supabaseAdmin
      .from('doctor_payout_accounts')
      .select('*')
      .eq('doctor_id', tx.doctor_id)
      .maybeSingle(),
  ])

  if (profileError) throw profileError
  if (accountError) throw accountError
  if (!doctorProfile) throw new Error('Doctor profile not found.')
  if (!payoutAccount) throw new Error('Doctor payout bank/UPI account is not configured.')

  const profile = doctorProfile as DoctorProfile
  const account = payoutAccount as DoctorPayoutAccount
  const doctorName = account.beneficiary_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || '8liv Doctor'

  let contactId = account.razorpay_contact_id || tx.razorpay_contact_id || null
  if (!contactId) {
    const contact = await createRazorpayXContact({
      name: doctorName,
      email: profile.email,
      contact: profile.phone_number,
      referenceId: tx.doctor_id,
    })
    contactId = contact.id
  }

  let fundAccountId = account.razorpay_fund_account_id || tx.razorpay_fund_account_id || null
  if (!fundAccountId) {
    const fundAccount = await createRazorpayXFundAccount({
      contactId,
      accountType: account.account_type,
      name: doctorName,
      ifsc: account.ifsc,
      accountNumber: account.account_number,
      vpa: account.vpa,
    })
    fundAccountId = fundAccount.id
  }

  await supabaseAdmin
    .from('doctor_payout_accounts')
    .update({
      razorpay_contact_id: contactId,
      razorpay_fund_account_id: fundAccountId,
      updated_at: new Date().toISOString(),
    })
    .eq('doctor_id', tx.doctor_id)

  const { data: reservedTx, error: reserveError } = await supabaseAdmin
    .from('doctor_wallet_transactions')
    .update({
      payout_status: 'PROCESSING',
      razorpay_contact_id: contactId,
      razorpay_fund_account_id: fundAccountId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', tx.id)
    .eq('payout_status', 'PENDING')
    .is('razorpay_payout_id', null)
    .select('id')
    .maybeSingle()

  if (reserveError) throw reserveError
  if (!reservedTx) throw new Error('This appointment payout has already been submitted.')

  let payout
  try {
    payout = await createRazorpayXPayout({
      fundAccountId,
      amountPaise: DOCTOR_PAYOUT_AMOUNT_PAISE,
      mode: account.account_type === 'vpa' ? 'UPI' : 'IMPS',
      referenceId: tx.id,
      narration: '8liv consultation payout',
      notes: {
        appointmentId: tx.appointment_id || '',
        doctorId: tx.doctor_id,
        patientId: tx.patient_id || '',
        transactionId: tx.id,
      },
    })
  } catch (err) {
    await supabaseAdmin
      .from('doctor_wallet_transactions')
      .update({
        payout_status: 'PENDING',
        updated_at: new Date().toISOString(),
      })
      .eq('id', tx.id)
      .is('razorpay_payout_id', null)
    throw err
  }

  const { error: updateError } = await supabaseAdmin
    .from('doctor_wallet_transactions')
    .update({
      payout_status: 'PROCESSING',
      razorpay_payout_id: payout.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', tx.id)

  if (updateError) throw updateError

  return {
    transactionId: tx.id,
    payoutId: payout.id,
    payoutStatus: 'PROCESSING',
    razorpayStatus: payout.status,
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { adminId, transactionId, processPending, systemKey } = body

    const cronSecret = process.env.PAYOUT_CRON_SECRET
    const isSystemRun = Boolean(processPending && cronSecret && systemKey === cronSecret)

    if (!isSystemRun) {
      if (!adminId) {
        return NextResponse.json({ error: 'adminId is required' }, { status: 400 })
      }
      const isAdmin = await verifyAdmin(adminId)
      if (!isAdmin) {
        return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 })
      }
    }

    if (processPending) {
      const { data, error } = await supabaseAdmin
        .from('doctor_wallet_transactions')
        .select('id')
        .eq('type', 'CONSULTATION_PAYOUT')
        .eq('status', 'CREDITED')
        .eq('payout_status', 'PENDING')
        .is('razorpay_payout_id', null)
        .order('created_at', { ascending: true })
        .limit(50)

      if (error) throw error

      const results = []
      for (const tx of data || []) {
        try {
          results.push({ success: true, ...(await processTransaction(tx.id)) })
        } catch (err) {
          results.push({ success: false, transactionId: tx.id, error: getErrorMessage(err) })
        }
      }

      return NextResponse.json({ success: true, results })
    }

    if (!transactionId) {
      return NextResponse.json({ error: 'transactionId is required' }, { status: 400 })
    }

    const result = await processTransaction(transactionId)
    return NextResponse.json({ success: true, ...result })
  } catch (err: unknown) {
    console.error('Error in POST /api/admin/doctor-payouts:', err)
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 })
  }
}
