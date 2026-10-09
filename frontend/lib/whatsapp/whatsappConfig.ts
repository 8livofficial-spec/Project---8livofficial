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
  appSecret: process.env.WHATSAPP_APP_SECRET || '',
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

  // Meta Message Templates (Standardized mapping for 8LIV)
  templates: {
    otpAuth: {
      name: process.env.WHATSAPP_TEMPLATE_OTP || 'auth_otp_v1',
      fallbackName: 'hello_world', // Built-in default for sandbox test accounts
      language: 'en_US',
    },
    appointmentBooking: {
      name: process.env.WHATSAPP_TEMPLATE_APPT_BOOKED || 'appointment_confirmation_v1',
      fallbackName: 'jaspers_market_order_confirmation_v1',
      language: 'en_US',
    },
    appointmentReschedule: {
      name: process.env.WHATSAPP_TEMPLATE_APPT_RESCHEDULED || 'appointment_rescheduled_v1',
      language: 'en_US',
    },
    appointmentCancel: {
      name: process.env.WHATSAPP_TEMPLATE_APPT_CANCELLED || 'appointment_cancelled_v1',
      language: 'en_US',
    },
    consultationReminder: {
      name: process.env.WHATSAPP_TEMPLATE_CONSULT_REMINDER || 'consultation_reminder_v1',
      language: 'en_US',
    },
    paymentReceipt: {
      name: process.env.WHATSAPP_TEMPLATE_PAYMENT_RECEIPT || 'payment_receipt_v1',
      language: 'en_US',
    },
    orderDispatched: {
      name: process.env.WHATSAPP_TEMPLATE_ORDER_DISPATCHED || 'pharmacy_order_dispatched_v1',
      language: 'en_US',
    },
    orderDelivered: {
      name: process.env.WHATSAPP_TEMPLATE_ORDER_DELIVERED || 'pharmacy_order_delivered_v1',
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
