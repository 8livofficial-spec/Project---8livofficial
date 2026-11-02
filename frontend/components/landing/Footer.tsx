import Link from 'next/link'
import Image from 'next/image'

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Image
                src="/brand-logo-official.png"
                alt="8Liv Health"
                width={120}
                height={36}
                className="h-8 w-auto object-contain"
              />
            </Link>
            <p className="text-sm text-[#475569] leading-relaxed">
              Medical weight management &amp; metabolic healthcare platform connecting you with licensed doctors, dieticians, and trainers.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 mb-4">Programs</h3>
            <ul className="space-y-3 text-sm">
              <li><Link href="/plans" className="text-[#475569] transition-colors hover:text-[#0F766E]">Weight Management</Link></li>
              <li><Link href="/plans" className="text-[#475569] transition-colors hover:text-[#0F766E]">Metabolic Health</Link></li>
              <li><Link href="/how-it-works" className="text-[#475569] transition-colors hover:text-[#0F766E]">How It Works</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 mb-4">Clinical Governance</h3>
            <ul className="space-y-3 text-sm">
              <li><Link href="/terms" className="text-[#475569] transition-colors hover:text-[#0F766E]">Terms of Service</Link></li>
              <li><Link href="/privacy" className="text-[#475569] transition-colors hover:text-[#0F766E]">Privacy Policy</Link></li>
              <li><Link href="/prescription-policy" className="text-[#475569] transition-colors hover:text-[#0F766E]">Prescription Policy</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 mb-4">Support &amp; Care Desk</h3>
            <ul className="space-y-3 text-sm">
              <li><a href="mailto:support@8liv.in" className="text-[#475569] transition-colors hover:text-[#0F766E]">support@8liv.in</a></li>
              <li><a href="tel:+919944023986" className="text-[#475569] transition-colors hover:text-[#0F766E] font-medium">+91 99440 23986 (Voice Line)</a></li>
              <li><a href="https://wa.me/919944023986?text=Hi%208Liv%20Support%2C%20I%20need%20assistance." target="_blank" rel="noopener noreferrer" className="text-emerald-700 transition-colors hover:text-emerald-900 font-medium">WhatsApp Support Desk</a></li>
              <li className="text-xs text-[#64748B]">Emergency: In a medical emergency, call 112 immediately</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-5 border-t border-slate-200 pt-8 mt-8 text-center md:flex-row md:text-left">
          <div className="space-y-1">
            <p className="text-sm text-[#475569]">
              &copy; {new Date().getFullYear()} 8liv. All rights reserved.
            </p>
            <p className="text-xs text-[#64748B]">
              8liv is a technology platform operated by LONGLIV PRIVATE LIMITED.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-3 text-sm md:justify-end">
            <Link href="/privacy" className="text-[#475569] transition-colors hover:text-[#0F766E]">Privacy Policy</Link>
            <Link href="/terms" className="text-[#475569] transition-colors hover:text-[#0F766E]">Terms of Service</Link>
            <Link href="/prescription-policy" className="text-[#475569] transition-colors hover:text-[#0F766E]">Prescription Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
