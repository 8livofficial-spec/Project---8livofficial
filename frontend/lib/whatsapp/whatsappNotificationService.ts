/**
 * Event-Driven WhatsApp Notification Service
 *
 * Implements clinical and transactional notification templates for:
 * - Patient appointment booking, rescheduling, cancellation, and reminders
 * - Payment receipts and treatment plan activations
 * - Pharmacy orders, in-house delivery OTPs, and delivery milestones
 * - Doctor clinical assignments
 *
 * All dispatches are non-blocking and privacy-preserving.
 */

import { WhatsAppClient } from './whatsappClient'
import { WHATSAPP_CONFIG } from './whatsappConfig'
import { normalizePhoneNumber } from '../phone'
import { supabaseAdmin } from '../supabaseServer'

export type AppointmentNotificationData = {
  patientName: string
  doctorName?: string
  date: string
  time: string
  bookingId?: string
  callUrl?: string
}

export type PaymentNotificationData = {
  patientName: string
  amount: number
  paymentId: string
  planOrType?: string
  receiptUrl?: string
}

export type DeliveryNotificationData = {
  patientName: string
  orderReference: string
  otpCode: string
  driverName?: string
  driverPhone?: string
  deliverySlot?: string
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
   * 1. Patient Registration Confirmation
   */
  public static async sendRegistrationConfirmation(phone: string, name: string): Promise<void> {
    try {
      if (await this.isOptedOut(phone)) return

      const normalized = normalizePhoneNumber(phone)
      if (!normalized.whatsapp) return

      await WhatsAppClient.sendText({
        to: normalized.whatsapp,
        text: `Hello ${name || 'there'},\n\nWelcome to *8LIV* — Doctor-Led & Coach-Supervised Metabolic Healthcare.\n\nYour account is now ready. You can sign in anytime at https://8liv.in to take your health assessment, book doctor consultations, and track your care plan.\n\nReply STOP anytime to unsubscribe from notifications.`,
      })
    } catch (err: any) {
      console.warn('[WhatsAppNotification] sendRegistrationConfirmation notice:', err.message)
    }
  }

  /**
   * 2. Appointment Booking Confirmation
   */
  public static async sendAppointmentConfirmation(
    phone: string,
    data: AppointmentNotificationData
  ): Promise<void> {
    try {
      if (await this.isOptedOut(phone)) return

      const normalized = normalizePhoneNumber(phone)
      if (!normalized.whatsapp) return

      const doctorStr = data.doctorName ? `with *${data.doctorName}*` : 'with your assigned physician specialist'
      const joinStr = data.callUrl ? `\n\n*Join Video Call:* ${data.callUrl}` : ''

      await WhatsAppClient.sendText({
        to: normalized.whatsapp,
        text: `*Consultation Confirmed — 8LIV*\n\nHello ${data.patientName || 'Patient'},\nYour medical consultation ${doctorStr} has been confirmed.\n\n📅 *Date:* ${data.date}\n⏰ *Time:* ${data.time}${joinStr}\n\nPlease join 5 minutes before your scheduled slot. For clinical privacy, your video room is encrypted end-to-end.\n\nManage appointment: https://8liv.in/patient/appointments`,
      })
    } catch (err: any) {
      console.warn('[WhatsAppNotification] sendAppointmentConfirmation notice:', err.message)
    }
  }

  /**
   * 3. Appointment Rescheduled Notification
   */
  public static async sendAppointmentRescheduled(
    phone: string,
    data: AppointmentNotificationData
  ): Promise<void> {
    try {
      if (await this.isOptedOut(phone)) return

      const normalized = normalizePhoneNumber(phone)
      if (!normalized.whatsapp) return

      await WhatsAppClient.sendText({
        to: normalized.whatsapp,
        text: `*Consultation Rescheduled — 8LIV*\n\nHello ${data.patientName || 'Patient'},\nYour consultation has been rescheduled to:\n\n📅 *New Date:* ${data.date}\n⏰ *New Time:* ${data.time}\n\nView details: https://8liv.in/patient/appointments`,
      })
    } catch (err: any) {
      console.warn('[WhatsAppNotification] sendAppointmentRescheduled notice:', err.message)
    }
  }

  /**
   * 4. Appointment Cancelled Notification
   */
  public static async sendAppointmentCancelled(
    phone: string,
    data: { patientName: string; reason?: string }
  ): Promise<void> {
    try {
      if (await this.isOptedOut(phone)) return

      const normalized = normalizePhoneNumber(phone)
      if (!normalized.whatsapp) return

      await WhatsAppClient.sendText({
        to: normalized.whatsapp,
        text: `*Consultation Cancelled — 8LIV*\n\nHello ${data.patientName || 'Patient'},\nYour consultation has been cancelled${data.reason ? ` (${data.reason})` : ''}.\n\nYou can book a new slot at your convenience: https://8liv.in/patient/appointments`,
      })
    } catch (err: any) {
      console.warn('[WhatsAppNotification] sendAppointmentCancelled notice:', err.message)
    }
  }

  /**
   * 5. Consultation Reminder (15-30 minutes prior)
   */
  public static async sendConsultationReminder(
    phone: string,
    data: AppointmentNotificationData
  ): Promise<void> {
    try {
      if (await this.isOptedOut(phone)) return

      const normalized = normalizePhoneNumber(phone)
      if (!normalized.whatsapp) return

      await WhatsAppClient.sendText({
        to: normalized.whatsapp,
        text: `*Starting Soon: Your 8LIV Consultation*\n\nHello ${data.patientName || 'Patient'},\nYour consultation with ${data.doctorName || 'your doctor'} begins in a few minutes at *${data.time}*.\n\n👉 *Tap to join video call:* ${data.callUrl || 'https://8liv.in/patient/consultation/room'}`,
      })
    } catch (err: any) {
      console.warn('[WhatsAppNotification] sendConsultationReminder notice:', err.message)
    }
  }

  /**
   * 6. Payment Receipt & Subscription Activation
   */
  public static async sendPaymentReceipt(
    phone: string,
    data: PaymentNotificationData
  ): Promise<void> {
    try {
      if (await this.isOptedOut(phone)) return

      const normalized = normalizePhoneNumber(phone)
      if (!normalized.whatsapp) return

      await WhatsAppClient.sendText({
        to: normalized.whatsapp,
        text: `*Payment Receipt — 8LIV*\n\nHello ${data.patientName || 'Valued Member'},\nWe have successfully received your payment of *INR ${data.amount.toLocaleString('en-IN')}* for your ${data.planOrType || '8LIV Treatment Program'}.\n\n🧾 *Transaction ID:* ${data.paymentId}\n\nYour clinical care team has been notified. Access your portal: https://8liv.in/patient`,
      })
    } catch (err: any) {
      console.warn('[WhatsAppNotification] sendPaymentReceipt notice:', err.message)
    }
  }

  /**
   * 7. In-House Pharmacy Delivery OTP (Dispatched to patient)
   */
  public static async sendDeliveryOutForDeliveryOtp(
    phone: string,
    data: DeliveryNotificationData
  ): Promise<void> {
    try {
      if (await this.isOptedOut(phone)) return

      const normalized = normalizePhoneNumber(phone)
      if (!normalized.whatsapp) return

      await WhatsAppClient.sendText({
        to: normalized.whatsapp,
        text: `*Package Out for Delivery — 8LIV Pharmacy*\n\nHello ${data.patientName || 'Patient'},\nYour prescribed medication package (*${data.orderReference}*) is out for delivery with our rider *${data.driverName || '8LIV Rider'}*.\n\n🔑 *Your 6-Digit Delivery OTP:* *${data.otpCode}*\n\nPlease provide this OTP to the delivery partner at your doorstep to verify receipt. Never share this code prior to package handover.\n\nDriver Contact: ${data.driverPhone || '8LIV Support'}`,
      })
    } catch (err: any) {
      console.warn('[WhatsAppNotification] sendDeliveryOutForDeliveryOtp notice:', err.message)
    }
  }

  /**
   * 8. Delivery Completed Confirmation
   */
  public static async sendDeliveryCompleted(
    phone: string,
    data: { patientName: string; orderReference: string }
  ): Promise<void> {
    try {
      if (await this.isOptedOut(phone)) return

      const normalized = normalizePhoneNumber(phone)
      if (!normalized.whatsapp) return

      await WhatsAppClient.sendText({
        to: normalized.whatsapp,
        text: `*Delivery Confirmed — 8LIV Pharmacy*\n\nHello ${data.patientName || 'Patient'},\nYour order *${data.orderReference}* has been successfully delivered and verified via doorstep OTP.\n\nPlease follow the clinical dosage instructions in your prescription: https://8liv.in/patient/prescriptions`,
      })
    } catch (err: any) {
      console.warn('[WhatsAppNotification] sendDeliveryCompleted notice:', err.message)
    }
  }

  /**
   * 9. Doctor Notification: New Appointment Assigned
   */
  public static async sendDoctorAppointmentAssigned(
    phone: string,
    data: { doctorName: string; patientName: string; date: string; time: string; appointmentId?: string }
  ): Promise<void> {
    try {
      const normalized = normalizePhoneNumber(phone)
      if (!normalized.whatsapp) return

      await WhatsAppClient.sendText({
        to: normalized.whatsapp,
        text: `*New Consultation Assigned — 8LIV Doctor Portal*\n\nDr. ${data.doctorName || 'Doctor'},\nA new patient consultation has been scheduled with *${data.patientName || 'Patient'}*.\n\n📅 *Date:* ${data.date}\n⏰ *Time:* ${data.time}\n\nReview medical questionnaire and join: https://8liv.in/doctor/dashboard`,
      })
    } catch (err: any) {
      console.warn('[WhatsAppNotification] sendDoctorAppointmentAssigned notice:', err.message)
    }
  }
}
