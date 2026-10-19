/**
 * Centralized Meta WhatsApp Cloud API Configuration
 *
 * All Meta API communication must happen server-side.
 * Never expose access tokens, app secrets, or verify tokens to client code.
 */

export const WHATSAPP_CONFIG = {
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
  appSecret: process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET || '',
  webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '8liv_whatsapp_webhook_verify_secure_2026',
  apiVersion: process.env.WHATSAPP_API_VERSION || 'v21.0',
  graphApiBaseUrl: 'https://graph.facebook.com',

  // Network & Resiliency Timeouts
  requestTimeoutMs: 12000,
  maxRetries: 3,
  initialRetryDelayMs: 600,
  maxRetryDelayMs: 4000,

  // Rate Limits & Security
  otpTtlSeconds: 300, // 5 minutes
  maxOtpFailedAttempts: 5,
  resendCooldownSeconds: 60,
  customerServiceWindowHours: 24,

  // Meta Approved Message Templates for 8LIV Health
  templates: {
    otpAuth: {
      name: process.env.WHATSAPP_TEMPLATE_OTP || '8liv_login_otp',
      language: 'en_US',
    },
    membershipReceipt: {
      name: process.env.WHATSAPP_TEMPLATE_MEMBERSHIP_RECEIPT || 'membership_receipt',
      language: 'en_US',
    },
    consultationPayment: {
      name: process.env.WHATSAPP_TEMPLATE_CONSULT_PAYMENT || 'consultation_payment_confirmation',
      language: 'en_US',
    },
    consultationBooking: {
      name: process.env.WHATSAPP_TEMPLATE_CONSULT_BOOKING || 'consultation_booking_confirmed',
      language: 'en_US',
    },
    consultationReminder30m: {
      name: process.env.WHATSAPP_TEMPLATE_CONSULT_REMINDER || 'consultation_reminder__30_min',
      language: 'en_US',
    },
    appointmentCancel: {
      name: process.env.WHATSAPP_TEMPLATE_APPT_CANCELLED || 'appointment_cancelled',
      language: 'en_US',
    },
    labDoorstepCollection: {
      name: process.env.WHATSAPP_TEMPLATE_LAB_DOORSTEP || 'lab_doorstep_collection',
      language: 'en_US',
    },
  },

  isConfigured(): boolean {
    return Boolean(
      this.phoneNumberId &&
      this.accessToken &&
      this.accessToken !== 'placeholder'
    )
  },

  isMockEnabled(): boolean {
    return process.env.WHATSAPP_ENABLE_MOCK === 'true' && process.env.NODE_ENV !== 'production'
  },
} as const
