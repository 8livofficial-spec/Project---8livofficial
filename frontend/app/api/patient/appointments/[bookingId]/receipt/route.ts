import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseServer'
import { getAuthenticatedUser } from '@/lib/apiSecurity'
import { generateReceiptPdf, ReceiptData } from '@/lib/receiptPdfService'

type RouteContext = { params: Promise<{ bookingId: string }> }

export async function GET(request: Request, context: RouteContext) {
  try {
    const authUser = await getAuthenticatedUser(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { bookingId } = await context.params
    if (!bookingId) {
      return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 })
    }

    // 1. Fetch consultation record
    const { data: appointment, error: apptError } = await supabaseAdmin
      .from('doctor_consultations')
      .select('id, patient_id, doctor_id, booking_date, booking_time, status, appointment_type, created_at')
      .eq('id', bookingId)
      .maybeSingle()

    if (apptError || !appointment) {
      return NextResponse.json({ error: 'Appointment consultation record not found.' }, { status: 404 })
    }

    // Ensure authorization (patient must own appointment, or be admin or assigned doctor)
    const isOwner = appointment.patient_id === authUser.user.id
    const isAdmin = authUser.role === 'admin'
    const isDoctor = authUser.user.id === appointment.doctor_id
    if (!isOwner && !isAdmin && !isDoctor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 2. Fetch patient profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, display_id, email, phone_number')
      .eq('id', appointment.patient_id)
      .maybeSingle()

    // 3. Fetch doctor profile
    let doctorName = '8LIV Medical Specialist'
    let doctorSpecialty = 'Consultant Physician & Endocrinologist'
    if (appointment.doctor_id) {
      const { data: doc } = await supabaseAdmin
        .from('doctor_profiles')
        .select('full_name, specialty')
        .eq('id', appointment.doctor_id)
        .maybeSingle()
      if (doc) {
        doctorName = doc.full_name?.startsWith('Dr.') ? doc.full_name : `Dr. ${doc.full_name || 'Medical Officer'}`
        doctorSpecialty = doc.specialty || doctorSpecialty
      }
    }

    // 4. Fetch payment transaction
    const { data: matchedPayment } = await supabaseAdmin
      .from('payment_transactions')
      .select('id, transaction_id, amount, status, payment_method, payment_provider, created_at, metadata')
      .eq('patient_id', appointment.patient_id)
      .eq('payment_type', 'consultation')
      .contains('metadata', { consultation_id: bookingId })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let payment = matchedPayment

    if (!payment) {
      const { data: fallbackPayment } = await supabaseAdmin
        .from('payment_transactions')
        .select('id, transaction_id, amount, status, payment_method, payment_provider, created_at, metadata')
        .eq('patient_id', appointment.patient_id)
        .eq('payment_type', 'consultation')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      payment = fallbackPayment
    }

    const patientFullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
      || profile?.display_id
      || 'Patient'

    const paymentDateStr = payment?.created_at
      ? new Date(payment.created_at).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : new Date(appointment.created_at || Date.now()).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })

    const receiptPayload: ReceiptData = {
      receiptNumber: `8LIV-REC-${appointment.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`,
      transactionId: payment?.transaction_id || payment?.id || `TXN-${appointment.id.slice(0, 8)}`,
      razorpayPaymentId: (payment?.metadata as any)?.razorpay_payment_id || payment?.transaction_id || undefined,
      paymentDate: paymentDateStr,
      patientName: patientFullName,
      patientEmail: profile?.email || undefined,
      patientPhone: profile?.phone_number || undefined,
      patientId: appointment.patient_id,
      doctorName,
      doctorSpecialty,
      appointmentDate: appointment.booking_date || 'Scheduled Date',
      appointmentTime: appointment.booking_time || 'Scheduled Slot',
      serviceDescription: 'Telemedicine Consultation & Clinical Metabolic Intake',
      sacCode: '999312',
      amount: Number(payment?.amount || 499),
      currency: 'INR',
      paymentMethod: payment?.payment_method || 'Online (Razorpay / UPI)',
      paymentStatus: payment?.status ? String(payment.status).toUpperCase() : 'PAID',
    }

    const pdfBuffer = await generateReceiptPdf(receiptPayload)

    return new NextResponse(new Uint8Array(pdfBuffer) as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="8LIV-Receipt-${appointment.id.slice(0, 8)}.pdf"`,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (err: any) {
    console.error('Error in /api/patient/appointments/[bookingId]/receipt:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate receipt PDF.' },
      { status: 500 }
    )
  }
}
