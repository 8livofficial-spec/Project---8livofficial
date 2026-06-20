type RazorpayXContact = {
  id: string
}

type RazorpayXFundAccount = {
  id: string
}

type RazorpayXPayout = {
  id: string
  status: string
}

const RAZORPAYX_BASE_URL = 'https://api.razorpay.com/v1'

function getRazorpayAuthHeader() {
  const keyId = process.env.RAZORPAYX_KEY_ID || process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAYX_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET

  if (!keyId || !keySecret) {
    throw new Error('RazorpayX credentials are not configured.')
  }

  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`
}

async function razorpayXRequest<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${RAZORPAYX_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: getRazorpayAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = typeof data?.error?.description === 'string'
      ? data.error.description
      : `RazorpayX request failed with status ${response.status}`
    throw new Error(message)
  }

  return data as T
}

export async function createRazorpayXContact(input: {
  name: string
  email?: string | null
  contact?: string | null
  referenceId: string
}) {
  return razorpayXRequest<RazorpayXContact>('/contacts', {
    name: input.name,
    email: input.email || undefined,
    contact: input.contact || undefined,
    type: 'employee',
    reference_id: input.referenceId,
    notes: {
      platform: '8liv',
      role: 'doctor',
    },
  })
}

export async function createRazorpayXFundAccount(input: {
  contactId: string
  accountType: 'bank_account' | 'vpa'
  name: string
  ifsc?: string | null
  accountNumber?: string | null
  vpa?: string | null
}) {
  const account = input.accountType === 'vpa'
    ? {
        address: input.vpa,
      }
    : {
        name: input.name,
        ifsc: input.ifsc,
        account_number: input.accountNumber,
      }

  return razorpayXRequest<RazorpayXFundAccount>('/fund_accounts', {
    contact_id: input.contactId,
    account_type: input.accountType,
    [input.accountType]: account,
  })
}

export async function createRazorpayXPayout(input: {
  fundAccountId: string
  amountPaise: number
  currency?: string
  mode: 'IMPS' | 'NEFT' | 'RTGS' | 'UPI'
  purpose?: string
  referenceId: string
  narration: string
  notes?: Record<string, string>
}) {
  if (!process.env.RAZORPAYX_ACCOUNT_NUMBER) {
    throw new Error('RazorpayX account number is not configured.')
  }

  return razorpayXRequest<RazorpayXPayout>('/payouts', {
    account_number: process.env.RAZORPAYX_ACCOUNT_NUMBER,
    fund_account_id: input.fundAccountId,
    amount: input.amountPaise,
    currency: input.currency || 'INR',
    mode: input.mode,
    purpose: input.purpose || 'payout',
    queue_if_low_balance: true,
    reference_id: input.referenceId,
    narration: input.narration,
    notes: input.notes || {},
  })
}
