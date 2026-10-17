import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-slate-200 bg-white pb-10 pt-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 grid grid-cols-1 gap-10 sm:grid-cols-2 md:mb-16 md:grid-cols-4 md:gap-12">
          <div>
            <img
              src="/brand-logo-official.png"
              alt="8LIV Official Logo"
              className="mb-4 h-10 w-auto object-contain opacity-90"
            />

            <p className="mb-2 text-sm font-semibold text-[#0F172A]">
              8Liv — The digital healthcare platform by{' '}
              <Link href="/about" className="text-[#0F766E] transition-colors hover:text-[#00A884] hover:underline">
                Infinity Liv
              </Link>
            </p>

            <p className="mb-6 leading-relaxed text-sm text-[#475569]">
              Secure online metabolic care with doctor consultations, treatment review, progress tracking, and follow-up support.
            </p>
          </div>

          <div>
            <h4 className="mb-4 font-sora font-bold text-[#0F172A]">Program</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/how-it-works" className="text-[#475569] transition-colors hover:text-[#0F766E]">How it works</Link></li>
              <li><Link href="/medical-weight-management" className="text-[#475569] transition-colors hover:text-[#0F766E]">Medical weight management</Link></li>
              <li><Link href="/online-doctor-consultation" className="text-[#475569] transition-colors hover:text-[#0F766E]">Online doctor consultation</Link></li>
              <li><Link href="/membership" className="text-[#475569] transition-colors hover:text-[#0F766E]">Membership</Link></li>
              <li><Link href="/learn" className="text-[#475569] transition-colors hover:text-[#0F766E]">Learning center</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-sora font-bold text-[#0F172A]">Company</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/about" className="text-[#475569] transition-colors hover:text-[#0F766E]">About 8Liv</Link></li>
              <li><Link href="/nutrition-support" className="text-[#475569] transition-colors hover:text-[#0F766E]">Nutrition support</Link></li>
              <li><Link href="/fitness-coaching" className="text-[#475569] transition-colors hover:text-[#0F766E]">Fitness coaching</Link></li>
              <li><Link href="/contact" className="text-[#475569] transition-colors hover:text-[#0F766E]">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-sora font-bold text-[#0F172A]">Contact</h4>
            <ul className="mb-8 space-y-3 text-sm">
              <li><a href="mailto:8livofficial@gmail.com" className="text-[#475569] transition-colors hover:text-[#0F766E]">8livofficial@gmail.com</a></li>
              <li className="text-[#475569]">Secure online metabolic care across India</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-5 border-t border-slate-200 pt-8 text-center md:flex-row md:text-left">
          <div className="space-y-1">
            <p className="text-sm text-[#475569]">
              &copy; {new Date().getFullYear()} 8Liv. All rights reserved.
            </p>
            <p className="text-xs text-[#64748B]">
              8Liv is operated under the{' '}
              <Link href="/about" className="font-medium text-[#0F766E] hover:underline">
                Infinity Liv
              </Link>{' '}
              brand.
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
