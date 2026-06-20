import nodemailer from 'nodemailer'
import { supabaseAdmin } from '@/lib/supabaseServer'

type EmailLogStatus = 'SENT' | 'FAILED'

type EmailRecipient = {
  email: string
  name?: string | null
  patientId?: string | null
}

type AppointmentEmailInput = EmailRecipient & {
  doctorName?: string | null
  specialization?: string | null
  bookingDate: string
  bookingTime: string
  bookingId?: string | null
  meetingType?: string | null
}

type PaymentReceiptInput = EmailRecipient & {
  amount: number
  paymentId: string
  paymentMethod?: string | null
  paymentDate?: string | null
  paymentType?: string | null
}

type ConsultationCompletedInput = EmailRecipient & {
  doctorName?: string | null
  decision?: string | null
  nextStepUrl?: string | null
}

type MembershipActivatedInput = EmailRecipient & {
  planName: string
  amount?: number | null
  paymentId?: string | null
}

type LinkEmailInput = EmailRecipient & {
  link: string
  expiresIn?: string
}

type ProviderInvitationInput = LinkEmailInput & {
  role: string
}

const EMAIL_FROM = process.env.EMAIL_FROM || '8liv <8livofficial@gmail.com>'

function getTransporter() {
  const port = Number(process.env.EMAIL_PORT || 587)

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  })
}

function escapeHtml(value?: string | null) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatInr(amount: number) {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`
}

function baseTemplate(title: string, body: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #1A1F36;">
      <div style="border: 1px solid #E8DED4; border-radius: 18px; overflow: hidden; background: #ffffff;">
        <div style="background: #1A1F36; padding: 24px;">
          <div style="color: #C4622D; font-size: 12px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase;">8liv</div>
          <h1 style="margin: 8px 0 0; color: #ffffff; font-size: 24px;">${escapeHtml(title)}</h1>
        </div>
        <div style="padding: 28px; background: #fff;">
          ${body}
          <p style="margin-top: 28px; color: #6B7A90; font-size: 13px;">This is an automated email from 8liv. Please do not reply to this message.</p>
        </div>
      </div>
    </div>
  `
}

async function logEmail(params: {
  to: string
  subject: string
  template: string
  status: EmailLogStatus
  patientId?: string | null
  errorMessage?: string | null
  providerMessageId?: string | null
}) {
  try {
    await supabaseAdmin
      .from('email_logs')
      .insert({
        patient_id: params.patientId || null,
        recipient_email: params.to,
        subject: params.subject,
        template: params.template,
        status: params.status,
        provider: 'GMAIL_SMTP',
        provider_message_id: params.providerMessageId || null,
        error_message: params.errorMessage || null,
      })
  } catch (error) {
    console.error('Failed to write email log:', error)
  }
}

async function sendEmail(params: {
  to: string
  subject: string
  html: string
  template: string
  patientId?: string | null
}) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    const message = 'Gmail SMTP credentials are missing. Set EMAIL_USER and EMAIL_PASS.'
    await logEmail({ ...params, status: 'FAILED', errorMessage: message })
    throw new Error(message)
  }

  try {
    const info = await getTransporter().sendMail({
      from: EMAIL_FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
    })

    await logEmail({
      ...params,
      status: 'SENT',
      providerMessageId: info.messageId,
    })

    return info
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown email error'
    await logEmail({ ...params, status: 'FAILED', errorMessage: message })
    console.error(`Failed to send ${params.template} email:`, error)
    throw error
  }
}

export const EmailService = {
  async sendWelcomeEmail(input: EmailRecipient) {
    const name = input.name || 'there'
    return sendEmail({
      to: input.email,
      patientId: input.patientId,
      template: 'WELCOME',
      subject: 'Welcome to 8liv',
      html: baseTemplate('Welcome to 8liv', `
        <p style="font-size: 16px; line-height: 1.6;">Hello ${escapeHtml(name)},</p>
        <p style="font-size: 16px; line-height: 1.6;">Your 8liv account is ready. Complete your assessment to begin your guided care journey.</p>
      `),
    })
  },

  async sendAppointmentConfirmation(input: AppointmentEmailInput) {
    return sendEmail({
      to: input.email,
      patientId: input.patientId,
      template: 'APPOINTMENT_CONFIRMATION',
      subject: 'Your 8liv consultation is confirmed',
      html: baseTemplate('Appointment Confirmed', `
        <p style="font-size: 16px; line-height: 1.6;">Hello ${escapeHtml(input.name || 'there')},</p>
        <p style="font-size: 16px; line-height: 1.6;">Your consultation has been scheduled.</p>
        <div style="background: #F5F0EB; border-radius: 14px; padding: 18px; margin-top: 18px;">
          <p><strong>Date:</strong> ${escapeHtml(input.bookingDate)}</p>
          <p><strong>Time:</strong> ${escapeHtml(input.bookingTime)}</p>
          <p><strong>Healthcare professional:</strong> ${escapeHtml(input.doctorName || 'Automatically assigned')}</p>
          <p><strong>Specialization:</strong> ${escapeHtml(input.specialization || 'Endocrinology')}</p>
          <p><strong>Booking ID:</strong> ${escapeHtml(input.bookingId || 'Not available')}</p>
          <p><strong>Meeting type:</strong> ${escapeHtml(input.meetingType || 'Video consultation')}</p>
        </div>
      `),
    })
  },

  async sendPaymentReceipt(input: PaymentReceiptInput) {
    return sendEmail({
      to: input.email,
      patientId: input.patientId,
      template: 'PAYMENT_RECEIPT',
      subject: 'Your 8liv payment receipt',
      html: baseTemplate('Payment Receipt', `
        <p style="font-size: 16px; line-height: 1.6;">Hello ${escapeHtml(input.name || 'there')},</p>
        <div style="background: #F5F0EB; border-radius: 14px; padding: 18px; margin-top: 18px;">
          <p><strong>Amount paid:</strong> ${formatInr(input.amount)}</p>
          <p><strong>Payment ID:</strong> ${escapeHtml(input.paymentId)}</p>
          <p><strong>Payment method:</strong> ${escapeHtml(input.paymentMethod || 'Razorpay')}</p>
          <p><strong>Payment type:</strong> ${escapeHtml(input.paymentType || 'Payment')}</p>
          <p><strong>Paid at:</strong> ${escapeHtml(input.paymentDate || new Date().toLocaleString('en-IN'))}</p>
        </div>
      `),
    })
  },

  async sendConsultationReminder(input: AppointmentEmailInput) {
    return sendEmail({
      to: input.email,
      patientId: input.patientId,
      template: 'CONSULTATION_REMINDER',
      subject: 'Reminder: your 8liv consultation is coming up',
      html: baseTemplate('Consultation Reminder', `
        <p style="font-size: 16px; line-height: 1.6;">Hello ${escapeHtml(input.name || 'there')},</p>
        <p style="font-size: 16px; line-height: 1.6;">Your consultation is scheduled soon. The join button will be available 15 minutes before the appointment.</p>
        <div style="background: #F5F0EB; border-radius: 14px; padding: 18px; margin-top: 18px;">
          <p><strong>Date:</strong> ${escapeHtml(input.bookingDate)}</p>
          <p><strong>Time:</strong> ${escapeHtml(input.bookingTime)}</p>
          <p><strong>Booking ID:</strong> ${escapeHtml(input.bookingId || 'Not available')}</p>
        </div>
      `),
    })
  },

  async sendConsultationCompleted(input: ConsultationCompletedInput) {
    return sendEmail({
      to: input.email,
      patientId: input.patientId,
      template: 'CONSULTATION_COMPLETED',
      subject: 'Your 8liv consultation is completed',
      html: baseTemplate('Consultation Completed', `
        <p style="font-size: 16px; line-height: 1.6;">Hello ${escapeHtml(input.name || 'there')},</p>
        <p style="font-size: 16px; line-height: 1.6;">Your consultation with ${escapeHtml(input.doctorName || 'your doctor')} is completed.</p>
        <p style="font-size: 16px; line-height: 1.6;">Choose a Gold or Silver membership plan to continue your treatment journey.</p>
      `),
    })
  },

  async sendMembershipActivated(input: MembershipActivatedInput) {
    return sendEmail({
      to: input.email,
      patientId: input.patientId,
      template: 'MEMBERSHIP_ACTIVATED',
      subject: 'Your 8liv membership is active',
      html: baseTemplate('Membership Activated', `
        <p style="font-size: 16px; line-height: 1.6;">Hello ${escapeHtml(input.name || 'there')},</p>
        <p style="font-size: 16px; line-height: 1.6;">Your ${escapeHtml(input.planName)} membership is now active.</p>
        <div style="background: #F5F0EB; border-radius: 14px; padding: 18px; margin-top: 18px;">
          ${input.amount ? `<p><strong>Amount:</strong> ${formatInr(input.amount)}</p>` : ''}
          ${input.paymentId ? `<p><strong>Payment ID:</strong> ${escapeHtml(input.paymentId)}</p>` : ''}
        </div>
      `),
    })
  },

  async sendEmailVerification(input: LinkEmailInput) {
    return sendEmail({
      to: input.email,
      patientId: input.patientId,
      template: 'EMAIL_VERIFICATION',
      subject: 'Verify your 8liv email address',
      html: baseTemplate('Verify Your Email', `
        <p style="font-size: 16px; line-height: 1.6;">Hello ${escapeHtml(input.name || 'there')},</p>
        <p style="font-size: 16px; line-height: 1.6;">Please verify your email address to activate your 8liv account.</p>
        <p style="margin: 26px 0;"><a href="${escapeHtml(input.link)}" style="background: #1A1F36; color: #ffffff; padding: 14px 22px; border-radius: 12px; text-decoration: none; font-weight: 700;">Verify email</a></p>
        <p style="font-size: 13px; color: #6B7A90;">This link expires in ${escapeHtml(input.expiresIn || '24 hours')}.</p>
      `),
    })
  },

  async sendForgotPassword(input: LinkEmailInput) {
    return sendEmail({
      to: input.email,
      patientId: input.patientId,
      template: 'FORGOT_PASSWORD',
      subject: 'Reset your 8liv password',
      html: baseTemplate('Reset Your Password', `
        <p style="font-size: 16px; line-height: 1.6;">Hello ${escapeHtml(input.name || 'there')},</p>
        <p style="font-size: 16px; line-height: 1.6;">Use the secure link below to set a new password.</p>
        <p style="margin: 26px 0;"><a href="${escapeHtml(input.link)}" style="background: #1A1F36; color: #ffffff; padding: 14px 22px; border-radius: 12px; text-decoration: none; font-weight: 700;">Reset password</a></p>
        <p style="font-size: 13px; color: #6B7A90;">This link expires in ${escapeHtml(input.expiresIn || '30 minutes')}.</p>
      `),
    })
  },

  async sendProviderInvitation(input: ProviderInvitationInput) {
    return sendEmail({
      to: input.email,
      patientId: input.patientId,
      template: 'PROVIDER_INVITATION',
      subject: 'You have been invited to join 8liv',
      html: baseTemplate('Provider Invitation', `
        <p style="font-size: 16px; line-height: 1.6;">Hello ${escapeHtml(input.name || 'there')},</p>
        <p style="font-size: 16px; line-height: 1.6;">You have been invited to join 8liv as a ${escapeHtml(input.role)}.</p>
        <p style="font-size: 16px; line-height: 1.6;">Verify your email and set your password using the secure link below.</p>
        <p style="margin: 26px 0;"><a href="${escapeHtml(input.link)}" style="background: #1A1F36; color: #ffffff; padding: 14px 22px; border-radius: 12px; text-decoration: none; font-weight: 700;">Accept invitation</a></p>
        <p style="font-size: 13px; color: #6B7A90;">This link expires in ${escapeHtml(input.expiresIn || '7 days')}.</p>
      `),
    })
  },

  async sendPasswordResetOtp(input: EmailRecipient & { otpCode: string }) {
    return sendEmail({
      to: input.email,
      patientId: input.patientId,
      template: 'PASSWORD_RESET_OTP',
      subject: 'Password Reset Verification Code - 8liv',
      html: baseTemplate('Password Reset', `
        <p style="font-size: 16px; line-height: 1.6;">Hello ${escapeHtml(input.name || 'there')},</p>
        <p style="font-size: 16px; line-height: 1.6;">Use the verification code below to reset your password. This code is valid for 10 minutes.</p>
        <div style="background: #F5F0EB; padding: 20px; border-radius: 14px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #C4622D;">${escapeHtml(input.otpCode)}</span>
        </div>
      `),
    })
  },
}
