export const APP_CONFIG = {
  rateLimits: {
    // Configurable rate limits with default values
    login: {
      limit: Number(process.env.RATE_LIMIT_LOGIN_LIMIT || 6),
      windowMs: Number(process.env.RATE_LIMIT_LOGIN_WINDOW_MS || 15 * 60 * 1000), // 15 mins
      lockMs: Number(process.env.RATE_LIMIT_LOGIN_LOCK_MS || 30 * 60 * 1000)      // 30 mins lock
    },
    signup: {
      limit: Number(process.env.RATE_LIMIT_SIGNUP_LIMIT || 5),
      windowMs: Number(process.env.RATE_LIMIT_SIGNUP_WINDOW_MS || 15 * 60 * 1000),
      lockMs: Number(process.env.RATE_LIMIT_SIGNUP_LOCK_MS || 30 * 60 * 1000)
    },
    forgotPassword: {
      limit: Number(process.env.RATE_LIMIT_FORGOT_PASSWORD_LIMIT || 5),
      windowMs: Number(process.env.RATE_LIMIT_FORGOT_PASSWORD_WINDOW_MS || 15 * 60 * 1000)
    },
    booking: {
      limit: Number(process.env.RATE_LIMIT_BOOKING_LIMIT || 5),
      windowMs: Number(process.env.RATE_LIMIT_BOOKING_WINDOW_MS || 15 * 60 * 1000)
    },
    paymentVerify: {
      limit: Number(process.env.RATE_LIMIT_PAYMENT_VERIFY_LIMIT || 5),
      windowMs: Number(process.env.RATE_LIMIT_PAYMENT_VERIFY_WINDOW_MS || 15 * 60 * 1000)
    },
    uploads: {
      limit: Number(process.env.RATE_LIMIT_UPLOAD_LIMIT || 5),
      windowMs: Number(process.env.RATE_LIMIT_UPLOAD_WINDOW_MS || 15 * 60 * 1000)
    },
    messages: {
      limit: Number(process.env.RATE_LIMIT_MESSAGE_LIMIT || 60),
      windowMs: Number(process.env.RATE_LIMIT_MESSAGE_WINDOW_MS || 15 * 60 * 1000)
    },
    ratings: {
      limit: Number(process.env.RATE_LIMIT_RATING_LIMIT || 5),
      windowMs: Number(process.env.RATE_LIMIT_RATING_WINDOW_MS || 15 * 60 * 1000)
    }
  },
  uploads: {
    // 10MB default size limit
    sizeLimitBytes: Number(process.env.UPLOAD_SIZE_LIMIT_BYTES || 10 * 1024 * 1024),
    // Allowed file types (PDF, JPG, PNG, WEBP, XLSX)
    allowedMimeTypes: (
      process.env.UPLOAD_ALLOWED_TYPES || 
      'application/pdf,image/jpeg,image/png,image/webp,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel'
    ).split(','),
    allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'xlsx']
  },
  payment: {
    // Mode (production / sandbox)
    mode: process.env.NEXT_PUBLIC_PAYMENT_MODE || 'sandbox',
    // Allow mock payments in development, block in production
    allowMock: process.env.NEXT_PUBLIC_MOCK_PAYMENT === 'true' || process.env.NODE_ENV !== 'production'
  }
}
