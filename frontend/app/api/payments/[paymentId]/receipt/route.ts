import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { getAuthenticatedUser } from '@/lib/apiSecurity'
import { generateReceiptPdf, ReceiptData } from '@/lib/receiptPdfService'

type RouteContext = { params: Promise<{ paymentId: string }> }

export async function GET(request: Request, context: RouteContext) {
  try {
    const authUser = await getAuthenticatedUser(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { paymentId } = await context.params
    if (!paymentId) {
      return NextResponse.json({ error: 'Missing paymentId' }, { status: 400 })
    }

    // Lookup payment transaction by id or transaction_id
    const { data: payment, error } = await supabaseAdmin
      .from('payment_transactions')
      .select('*')
      .or(`id.eq.${paymentId},transaction_id.eq.${paymentId}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !payment) {
      return NextResponse.json({ error: 'Payment transaction not found.' }, { status: 404 })
    }

    // Access control: User must own the payment or be admin/doctor
    const isOwner = payment.patient_id === authUser.user.id
    const isAdmin = authUser.role === 'admin'
    const isDoctor = authUser.role === 'doctor'
    if (!isOwner && !isAdmin && !isDoctor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch patient profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, display_id, email, phone_number')
      .eq('id', payment.patient_id)
      .maybeSingle()

    const patientFullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
      || profile?.display_id
      || 'Patient'

    const paymentDateStr = payment.created_at
      ? new Date(payment.created_at).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : new Date().toLocaleDateString('en-IN')

    const meta = payment.metadata || {}
    const receiptPayload: ReceiptData = {
      receiptNumber: `8LIV-INV-${String(payment.id || payment.transaction_id).replace(/-/g, '').slice(0, 8).toUpperCase()}`,
      transactionId: payment.transaction_id || payment.id,
      razorpayPaymentId: meta.razorpay_payment_id || payment.transaction_id || undefined,
      paymentDate: paymentDateStr,
      patientName: patientFullName,
      patientEmail: profile?.email || undefined,
      patientPhone: profile?.phone_number || undefined,
      patientId: payment.patient_id,
      serviceDescription: payment.payment_type === 'membership'
        ? '8LIV Metabolic Healthcare Membership & Protocol Supervision'
        : 'Clinical Telemedicine Consultation & Healthcare Intake',
      sacCode: '999312',
      amount: Number(payment.amount || 0),
      currency: payment.currency || 'INR',
      paymentMethod: payment.payment_method || 'Online Razorpay Gateway',
      paymentStatus: payment.status ? String(payment.status).toUpperCase() : 'PAID',
    }

    const pdfBuffer = await generateReceiptPdf(receiptPayload)

    return new NextResponse(new Uint8Array(pdfBuffer) as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="8LIV-Receipt-${payment.id}.pdf"`,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (err: any) {
    console.error('Error in /api/payments/[paymentId]/receipt:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate payment receipt PDF.' },
      { status: 500 }
    )
  }
}
