'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Building2, CheckCircle2, CreditCard, ShieldCheck, Wallet, AlertCircle } from 'lucide-react'
import { authedFetch } from '@/lib/apiClient'

export default function ProviderBankingPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [preferredPayoutMethod, setPreferredPayoutMethod] = useState<'BANK_TRANSFER' | 'UPI'>('BANK_TRANSFER')
  const [beneficiaryName, setBeneficiaryName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('')
  const [ifsc, setIfsc] = useState('')
  const [bankName, setBankName] = useState('')
  const [branch, setBranch] = useState('')
  const [upiId, setUpiId] = useState('')
  const [currentMaskedAccount, setCurrentMaskedAccount] = useState('')

  useEffect(() => {
    async function loadAccount() {
      try {
        setLoading(true)
        const res = await authedFetch('/api/provider/payout/account')
        const data = await res.json()
        if (res.ok && data.account) {
          const acc = data.account
          setPreferredPayoutMethod(acc.preferredPayoutMethod === 'UPI' ? 'UPI' : 'BANK_TRANSFER')
          setBeneficiaryName(acc.beneficiaryName || '')
          setIfsc(acc.ifsc || '')
          setBankName(acc.bankName || '')
          setBranch(acc.branch || '')
          setUpiId(acc.vpa || '')
          setCurrentMaskedAccount(acc.accountNumberMasked || (acc.accountNumber ? `••••${acc.accountNumber.slice(-4)}` : ''))
        }
      } catch (err: any) {
        setError(err.message || 'Unable to load payment details.')
      } finally {
        setLoading(false)
      }
    }
    loadAccount()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (preferredPayoutMethod === 'BANK_TRANSFER') {
      if (!accountNumber) {
        setError('Please enter your bank account number.')
        return
      }
      if (accountNumber !== confirmAccountNumber) {
        setError('Bank account numbers do not match.')
        return
      }
      if (!ifsc || !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(ifsc)) {
        setError('Please enter a valid 11-character IFSC code.')
        return
      }
      if (!beneficiaryName) {
        setError('Please enter the account holder / beneficiary name.')
        return
      }
    } else {
      if (!upiId || !upiId.includes('@')) {
        setError('Please enter a valid UPI ID (e.g. yourname@oksbi).')
        return
      }
    }

    try {
      setSaving(true)
      const res = await authedFetch('/api/provider/payout/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferredPayoutMethod,
          beneficiaryName,
          accountNumber,
          ifsc: ifsc.toUpperCase(),
          bankName,
          branch,
          upiId,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update payment details.')
      }
      setSuccess('Payment and bank details updated successfully! ✅')
      if (data.account?.accountNumberMasked) {
        setCurrentMaskedAccount(data.account.accountNumberMasked)
      }
      setAccountNumber('')
      setConfirmAccountNumber('')
    } catch (err: any) {
      setError(err.message || 'Failed to update payment details.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#F9F6F0] px-4 py-8 text-[#1A1F36]">
      <div className="mx-auto max-w-2xl">
        <Link href="/provider/wallet" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#6B7A90] hover:text-[#1A1F36] transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Wallet
        </Link>

        <section className="rounded-[28px] border border-[#E8DED4] bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between pb-6 border-b border-[#E8DED4]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C4622D]">Payout Account</p>
              <h1 className="mt-1 text-2xl sm:text-3xl font-black">Payment & Bank Details</h1>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1A1F36] text-white">
              <Building2 className="h-6 w-6" />
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm font-bold text-[#6B7A90]">
              Loading payout settings...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-6">
              {error && (
                <div className="flex items-center gap-3 rounded-2xl bg-[#D96A6A]/10 border border-[#D96A6A]/20 p-4 text-sm font-bold text-[#B94D4D]">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="flex items-center gap-3 rounded-2xl bg-[#5C7A6B]/10 border border-[#5C7A6B]/20 p-4 text-sm font-bold text-[#5C7A6B]">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              {currentMaskedAccount && (
                <div className="flex items-center justify-between rounded-2xl bg-[#F9F6F0] p-4 border border-[#E8DED4]">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-[#C4622D]" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-[#6B7A90]">Current Registered Payout Account</p>
                      <p className="font-mono text-sm font-black text-[#1A1F36] mt-0.5">{currentMaskedAccount}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-[#5C7A6B]/15 px-3 py-1 text-[10px] font-black uppercase text-[#5C7A6B]">Verified</span>
                </div>
              )}

              {/* Preferred Payout Method */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#6B7A90] mb-3">
                  Preferred Payout Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPreferredPayoutMethod('BANK_TRANSFER')}
                    className={`flex items-center justify-center gap-2 rounded-2xl p-4 text-sm font-black transition-all border ${
                      preferredPayoutMethod === 'BANK_TRANSFER'
                        ? 'border-[#1A1F36] bg-[#1A1F36] text-white shadow-md'
                        : 'border-[#E8DED4] bg-[#F9F6F0] text-[#6B7A90] hover:bg-[#F0EBE1]'
                    }`}
                  >
                    <Building2 className="w-4 h-4" /> Bank Transfer (IMPS/NEFT)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreferredPayoutMethod('UPI')}
                    className={`flex items-center justify-center gap-2 rounded-2xl p-4 text-sm font-black transition-all border ${
                      preferredPayoutMethod === 'UPI'
                        ? 'border-[#1A1F36] bg-[#1A1F36] text-white shadow-md'
                        : 'border-[#E8DED4] bg-[#F9F6F0] text-[#6B7A90] hover:bg-[#F0EBE1]'
                    }`}
                  >
                    <Wallet className="w-4 h-4" /> UPI Instant Transfer
                  </button>
                </div>
              </div>

              {preferredPayoutMethod === 'BANK_TRANSFER' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-[#6B7A90] mb-1.5">
                      Account Holder Name <span className="text-[#C4622D]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={beneficiaryName}
                      onChange={(e) => setBeneficiaryName(e.target.value)}
                      placeholder="As printed on bank passbook / statement"
                      className="w-full rounded-xl border border-[#E8DED4] bg-[#F9F6F0] px-4 py-3 text-sm font-bold text-[#1A1F36] outline-none focus:border-[#1A1F36]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-[#6B7A90] mb-1.5">
                        Bank Account Number <span className="text-[#C4622D]">*</span>
                      </label>
                      <input
                        type="password"
                        required
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="Enter account number"
                        className="w-full rounded-xl border border-[#E8DED4] bg-[#F9F6F0] px-4 py-3 text-sm font-bold text-[#1A1F36] outline-none focus:border-[#1A1F36]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-[#6B7A90] mb-1.5">
                        Confirm Account Number <span className="text-[#C4622D]">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={confirmAccountNumber}
                        onChange={(e) => setConfirmAccountNumber(e.target.value)}
                        placeholder="Re-enter account number"
                        className="w-full rounded-xl border border-[#E8DED4] bg-[#F9F6F0] px-4 py-3 text-sm font-bold text-[#1A1F36] outline-none focus:border-[#1A1F36]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-[#6B7A90] mb-1.5">
                        IFSC Code <span className="text-[#C4622D]">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={11}
                        value={ifsc}
                        onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                        placeholder="e.g. HDFC0001234"
                        className="w-full uppercase font-mono rounded-xl border border-[#E8DED4] bg-[#F9F6F0] px-4 py-3 text-sm font-bold text-[#1A1F36] outline-none focus:border-[#1A1F36]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-[#6B7A90] mb-1.5">
                        Bank Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="e.g. HDFC Bank"
                        className="w-full rounded-xl border border-[#E8DED4] bg-[#F9F6F0] px-4 py-3 text-sm font-bold text-[#1A1F36] outline-none focus:border-[#1A1F36]"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-[#6B7A90] mb-1.5">
                    UPI ID / VPA <span className="text-[#C4622D]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. doctor@upi, mobile@paytm"
                    className="w-full rounded-xl border border-[#E8DED4] bg-[#F9F6F0] px-4 py-3 text-sm font-bold text-[#1A1F36] outline-none focus:border-[#1A1F36]"
                  />
                  <p className="mt-2 text-xs font-semibold text-[#6B7A90]">
                    Instant transfer will be sent to this virtual payment address upon admin payout approval.
                  </p>
                </div>
              )}

              <div className="rounded-2xl bg-[#5C7A6B]/10 p-4 border border-[#5C7A6B]/20 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#5C7A6B] shrink-0 mt-0.5" />
                <p className="text-xs font-semibold text-[#5C7A6B] leading-relaxed">
                  Your banking information is protected with AES-256 bank-grade encryption. Withdrawals are processed through RazorpayX directly to this verified destination.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#E8DED4]">
                <Link
                  href="/provider/wallet"
                  className="rounded-full border border-[#E8DED4] px-6 py-3 text-sm font-black text-[#6B7A90] hover:bg-[#F9F6F0] transition-colors"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-[#1A1F36] hover:bg-[#0D101C] disabled:opacity-50 text-white px-8 py-3 text-sm font-black transition-all shadow-md cursor-pointer"
                >
                  {saving ? 'Saving Details...' : 'Save Payment Details'}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </main>
  )
}
