/**
 * Event-Driven WhatsApp Notification Service (Meta Approved Templates)
 *
 * Implements clinical and transactional notification templates using
 * strictly approved Meta WhatsApp Cloud API templates:
 * - 8liv_login_otp: Authentication
 * - membership_receipt: Utility
 * - consultation_payment_confirmation: Utility
 * - consultation_booking_confirmed: Utility
 * - consultation_reminder__30_min: Utility
 * - appointment_cancelled: Utility
 * - lab_doorstep_collection: Utility
 *
 * All outbound notifications route through the durable transactional outbox
 * (`whatsapp_outbox_queue`) for idempotency, retry safety, and zero loss.
 */

import { WHATSAPP_CONFIG } from './whatsappConfig'
import { WhatsAppOutbox } from './whatsappOutbox'
import { normalizePhoneNumber } from '../phone'
import { supabaseAdmin } from '../supabaseServer'

export type AppointmentNotificationData = {
  patientName: string
  doctorName?: string
  date: string
  time: string
  bookingId?: string
  appointmentType?: string
  scheduledStart?: string | Date
  callUrl?: string
}

export type PaymentNotificationData = {
  patientName: string
  amount: number
  paymentId: string
  planOrType?: string
  receiptUrl?: string
}

export type LabCollectionNotificationData = {
  patientName: string
  address: string
  date: string
  startTime: string
  endTime: string
  collectionId?: string
}

export class WhatsAppNotificationService {
  /**
   * Helper: Checks if the recipient has opted out of WhatsApp notifications
   */
  private static async isOptedOut(phone: string): Promise<boolean> {
    try {
      const normalized = normalizePhoneNumber(phone)
      if (!normalized.e164) return false

      const { data } = await supabaseAdmin
        .from('whatsapp_conversations')
        .select('is_opted_out')
        .eq('phone_number', normalized.e164)
        .maybeSingle()

      return Boolean(data?.is_opted_out)
    } catch {
      return false
    }
  }

  /**
   * 1. Membership Payment Receipt
   * Template: membership_receipt (UTILITY)
   * Body: "Your payment of {{1}} for {{2}} has been processed successfully..."
   * Button: Dynamic URL https://www.8liv.in/patient/billing{{1}}
   */
  public static async sendMembershipReceipt(
    phone: string,
    data: { patientName: string; amount: number; paymentId: string; planName?: string }
  ): Promise<boolean> {
    try {
      if (await this.isOptedOut(phone)) return false

      const normalized = normalizePhoneNumber(phone)
      if (!normalized.e164) return false

      const amountFormatted = `INR ${Number(data.amount || 0).toLocaleString('en-IN')}`
      const planFormatted = data.planName || '8LIV Metabolic Care Membership'

      return await WhatsAppOutbox.enqueue({
        idempotencyKey: `membership_receipt_${data.paymentId}`,
        recipientPhone: normalized.e164,
        payload: {
          type: 'template',
          templateName: WHATSAPP_CONFIG.templates.membershipReceipt.name,
          languageCode: WHATSAPP_CONFIG.templates.membershipReceipt.language,
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: amountFormatted },
                { type: 'text', text: planFormatted },
              ],
            },
            {
              type: 'button',
              sub_type: 'url',
              index: 0,
              parameters: [{ type: 'text', text: '' }],
            },
          ],
          metadata: {
            paymentId: data.paymentId,
            type: 'MEMBERSHIP_RECEIPT',
            amount: data.amount,
          },
        },
      })
    } catch (err: any) {
      console.warn('[WhatsAppNotification] sendMembershipReceipt notice:', err.message)
      return false
    }
  }

  /**
   * 2. Consultation Payment Receipt
   * Template: consultation_payment_confirmation (UTILITY)
   * Body: "Your payment of {{1}} for {{2}} has been processed successfully..."
   * Button: Static URL https://www.8liv.in/patient/billing
   */
  public static async sendConsultationPayment(
    phone: string,
    data: { patientName: string; amount: number; paymentId: string; description?: string }
  ): Promise<boolean> {
    try {
      if (await this.isOptedOut(phone)) return false

      const normalized = normalizePhoneNumber(phone)
      if (!normalized.e164) return false

      const amountFormatted = `INR ${Number(data.amount || 0).toLocaleString('en-IN')}`
      const descFormatted = data.description || 'Doctor Video Consultation'

      return await WhatsAppOutbox.enqueue({
        idempotencyKey: `consultation_payment_${data.paymentId}`,
        recipientPhone: normalized.e164,
        payload: {
          type: 'template',
          templateName: WHATSAPP_CONFIG.templates.consultationPayment.name,
          languageCode: WHATSAPP_CONFIG.templates.consultationPayment.language,
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: amountFormatted },
                { type: 'text', text: descFormatted },
              ],
            },
          ],
          metadata: {
            paymentId: data.paymentId,
            type: 'CONSULTATION_PAYMENT',
            amount: data.amount,
          },
        },
      })
    } catch (err: any) {
      console.warn('[WhatsAppNotification] sendConsultationPayment notice:', err.message)
      return false
    }
  }

  /**
   * 3. Consultation Booking Confirmation & Auto-schedule 30-min Reminder
   * Template: consultation_booking_confirmed (UTILITY)
   * Body: "Hello {{1}}, Thank you for booking with {{2}}. Your appointment for {{3}} on {{4}} at {{5}} is confirmed."
   * Button: Dynamic URL https://www.8liv.in/{{1}} -> "patient/appointments"
   */
  public static async sendAppointmentConfirmation(
    phone: string,
    data: AppointmentNotificationData
  ): Promise<boolean> {
    try {
      if (await this.isOptedOut(phone)) return false

      const normalized = normalizePhoneNumber(phone)
      if (!normalized.e164) return false

      const bookingId = data.bookingId || 'latest'
      const patientName = data.patientName || 'Patient'
      const doctorName = data.doctorName ? `Dr. ${data.doctorName.replace(/^Dr\.\s*/i, '')}` : '8LIV Medical Team'
      const apptType = data.appointmentType || 'Doctor Video Consultation'

      // Enqueue immediate confirmation
      const enqueued = await WhatsAppOutbox.enqueue({
        idempotencyKey: `consultation_booking_${bookingId}`,
        recipientPhone: normalized.e164,
        payload: {
          type: 'template',
          templateName: WHATSAPP_CONFIG.templates.consultationBooking.name,
          languageCode: WHATSAPP_CONFIG.templates.consultationBooking.language,
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: patientName },
                { type: 'text', text: doctorName },
                { type: 'text', text: apptType },
                { type: 'text', text: data.date },
                { type: 'text', text: data.time },
              ],
            },
            {
              type: 'button',
              sub_type: 'url',
              index: 0,
              parameters: [{ type: 'text', text: 'patient/appointments' }],
            },
          ],
          metadata: {
            bookingId,
            type: 'CONSULTATION_BOOKING',
          },
        },
      })

      // Schedule durable 30-minute and 10-minute reminders if scheduled start is available
      if (data.scheduledStart && bookingId !== 'latest') {
        const startTime = new Date(data.scheduledStart).getTime()
        const now = Date.now()

        const reminderTime30m = new Date(startTime - 30 * 60 * 1000)
        if (reminderTime30m.getTime() > now) {
          await this.scheduleConsultationReminder(
            phone,
            {
              ...data,
              bookingId,
              reminderTime: reminderTime30m,
            },
            30
          )
        }

        const reminderTime10m = new Date(startTime - 10 * 60 * 1000)
        if (reminderTime10m.getTime() > now) {
          await this.scheduleConsultationReminder(
            phone,
            {
              ...data,
              bookingId,
              reminderTime: reminderTime10m,
            },
            10
          )
        }
      }

      return enqueued
    } catch (err: any) {
      console.warn('[WhatsAppNotification] sendAppointmentConfirmation notice:', err.message)
      return false
    }
  }

  /**
   * 4. Consultation Reminder (30 Minutes or 10 Minutes Before Slot)
   * Template: consultation_reminder__30_min (UTILITY)
   * Body: "Hello {{1}}, This is a reminder about your upcoming appointment with {{2}} on {{3}} at {{4}}..."
   * Button: Dynamic URL https://www.8liv.in/patient/consultation{{1}}
   */
  public static async scheduleConsultationReminder(
    phone: string,
    data: AppointmentNotificationData & { reminderTime: Date },
    minutesBefore: 30 | 10 = 30
  ): Promise<boolean> {
    try {
      const normalized = normalizePhoneNumber(phone)
      if (!normalized.e164 || !data.bookingId) return false

      const doctorName = data.doctorName ? `Dr. ${data.doctorName.replace(/^Dr\.\s*/i, '')}` : 'your physician specialist'
      const templateConfig = minutesBefore === 10
        ? WHATSAPP_CONFIG.templates.consultationReminder10m
        : WHATSAPP_CONFIG.templates.consultationReminder30m

      return await WhatsAppOutbox.enqueue({
        idempotencyKey: `consultation_reminder_${minutesBefore}m_${data.bookingId}`,
        recipientPhone: normalized.e164,
        nextAttemptAt: data.reminderTime,
        payload: {
          type: 'template',
          templateName: templateConfig.name,
          languageCode: templateConfig.language,
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: data.patientName || 'Patient' },
                { type: 'text', text: doctorName },
                { type: 'text', text: data.date },
                { type: 'text', text: data.time },
              ],
            },
            {
              type: 'button',
              sub_type: 'url',
              index: 0,
              parameters: [{ type: 'text', text: `/${data.bookingId}` }],
            },
          ],
          metadata: {
            consultationId: data.bookingId,
            type: `CONSULTATION_REMINDER_${minutesBefore}M`,
          },
        },
      })
    } catch (err: any) {
      console.warn('[WhatsAppNotification] scheduleConsultationReminder notice:', err.message)
      return false
    }
  }

  /**
   * 5. Appointment Cancelled Notification & Invalidate Pending Reminders
   * Template: appointment_cancelled (UTILITY)
   * Body: "Hello {{1}}, Your upcoming appointment with {{2}} on {{3}} at {{4}} has been canceled..."
   * Button: Dynamic URL https://www.8liv.in/{{1}} -> "patient/appointments"
   */
  public static async sendAppointmentCancelled(
    phone: string,
    data: { patientName: string; doctorName?: string; date?: string; time?: string; bookingId?: string }
  ): Promise<boolean> {
    try {
      // 1. Immediately dead-letter any pending reminder outbox jobs for this appointment
      if (data.bookingId) {
        await WhatsAppOutbox.cancelPendingForConsultation(data.bookingId)
      }

      if (await this.isOptedOut(phone)) return false

      const normalized = normalizePhoneNumber(phone)
      if (!normalized.e164) return false

      const doctorName = data.doctorName ? `Dr. ${data.doctorName.replace(/^Dr\.\s*/i, '')}` : '8LIV Healthcare'
      const apptDate = data.date || 'your scheduled date'
      const apptTime = data.time || 'your scheduled time'

      return await WhatsAppOutbox.enqueue({
        idempotencyKey: `appointment_cancelled_${data.bookingId || Date.now()}`,
        recipientPhone: normalized.e164,
        payload: {
          type: 'template',
          templateName: WHATSAPP_CONFIG.templates.appointmentCancel.name,
          languageCode: WHATSAPP_CONFIG.templates.appointmentCancel.language,
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: data.patientName || 'Patient' },
                { type: 'text', text: doctorName },
                { type: 'text', text: apptDate },
                { type: 'text', text: apptTime },
              ],
            },
            {
              type: 'button',
              sub_type: 'url',
              index: 0,
              parameters: [{ type: 'text', text: 'patient/appointments' }],
            },
          ],
          metadata: {
            bookingId: data.bookingId,
            type: 'APPOINTMENT_CANCELLED',
          },
        },
      })
    } catch (err: any) {
      console.warn('[WhatsAppNotification] sendAppointmentCancelled notice:', err.message)
      return false
    }
  }

  /**
   * 6. Lab Doorstep Sample Collection
   * Template: lab_doorstep_collection (UTILITY)
   * Body: "Hi {{1}}, we're scheduling a technician visit to {{2}} on {{3}} between {{4}} and {{5}}..."
   * Buttons: QUICK_REPLY: Confirm, Reschedule
   */
  public static async sendLabDoorstepCollection(
    phone: string,
    data: LabCollectionNotificationData
  ): Promise<boolean> {
    try {
      if (await this.isOptedOut(phone)) return false

      const normalized = normalizePhoneNumber(phone)
      if (!normalized.e164) return false

      return await WhatsAppOutbox.enqueue({
        idempotencyKey: `lab_doorstep_${data.collectionId || Date.now()}`,
        recipientPhone: normalized.e164,
        payload: {
          type: 'template',
          templateName: WHATSAPP_CONFIG.templates.labDoorstepCollection.name,
          languageCode: WHATSAPP_CONFIG.templates.labDoorstepCollection.language,
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: data.patientName || 'Patient' },
                { type: 'text', text: data.address || 'your registered address' },
                { type: 'text', text: data.date },
                { type: 'text', text: data.startTime },
                { type: 'text', text: data.endTime },
              ],
            },
          ],
          metadata: {
            collectionId: data.collectionId,
            type: 'LAB_DOORSTEP_COLLECTION',
          },
        },
      })
    } catch (err: any) {
      console.warn('[WhatsAppNotification] sendLabDoorstepCollection notice:', err.message)
      return false
    }
  }

  /**
   * Legacy routing adapter for backwards compatibility
   */
  public static async sendPaymentReceipt(
    phone: string,
    data: PaymentNotificationData
  ): Promise<void> {
    const isMembership = /membership|program|plan/i.test(data.planOrType || '')
    if (isMembership) {
      await this.sendMembershipReceipt(phone, {
        patientName: data.patientName,
        amount: data.amount,
        paymentId: data.paymentId,
        planName: data.planOrType,
      })
    } else {
      await this.sendConsultationPayment(phone, {
        patientName: data.patientName,
        amount: data.amount,
        paymentId: data.paymentId,
        description: data.planOrType,
      })
    }
  }

  /**
   * Replaced by sendAppointmentConfirmation with updated times & reminder re-scheduling
   */
  public static async sendAppointmentRescheduled(
    phone: string,
    data: AppointmentNotificationData
  ): Promise<void> {
    if (data.bookingId) {
      await WhatsAppOutbox.cancelPendingForConsultation(data.bookingId)
    }
    await this.sendAppointmentConfirmation(phone, data)
  }
}
