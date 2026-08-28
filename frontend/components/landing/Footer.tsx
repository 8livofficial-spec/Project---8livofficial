import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-[#D46E53]/20 bg-transparent pb-10 pt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 grid grid-cols-1 gap-10 sm:grid-cols-2 md:mb-16 md:grid-cols-4 md:gap-12">
          <div>
            <img
              src="/brand-logo-official.png"
              alt="8LIV Official Logo"
              className="mb-4 h-12 w-auto object-contain opacity-90"
            />



            <p className="mb-6 leading-relaxed text-[#475569]">
              Secure online metabolic care with doctor consultations, treatment review, progress tracking, and follow-up support.
            </p>
          </div>

          <div>
            <h4 className="mb-6 font-sora font-bold text-[#0F172A]">Program</h4>
            <ul className="space-y-4">
              <li><Link href="/how-it-works" className="text-[#475569] transition-colors hover:text-[#D46E53]">How it works</Link></li>
              <li><Link href="/medical-weight-management" className="text-[#475569] transition-colors hover:text-[#D46E53]">Medical weight management</Link></li>
              <li><Link href="/online-doctor-consultation" className="text-[#475569] transition-colors hover:text-[#D46E53]">Online doctor consultation</Link></li>
              <li><Link href="/membership" className="text-[#475569] transition-colors hover:text-[#D46E53]">Membership</Link></li>
              <li><Link href="/learn" className="text-[#475569] transition-colors hover:text-[#D46E53]">Learning center</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-6 font-sora font-bold text-[#0F172A]">Company</h4>
            <ul className="space-y-4">
              <li><Link href="/about" className="text-[#475569] transition-colors hover:text-[#D46E53]">About 8Liv</Link></li>
              <li><Link href="/nutrition-support" className="text-[#475569] transition-colors hover:text-[#D46E53]">Nutrition support</Link></li>
              <li><Link href="/fitness-coaching" className="text-[#475569] transition-colors hover:text-[#D46E53]">Fitness coaching</Link></li>
              <li><Link href="/contact" className="text-[#475569] transition-colors hover:text-[#D46E53]">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-6 font-sora font-bold text-[#0F172A]">Contact</h4>
            <ul className="mb-8 space-y-4">
              <li><a href="mailto:8livofficial@gmail.com" className="text-[#475569] transition-colors hover:text-[#D46E53]">8livofficial@gmail.com</a></li>
              <li className="text-[#475569]">Secure online metabolic care</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-5 border-t border-[#D46E53]/10 pt-8 text-center md:flex-row md:text-left">
          <p className="text-sm text-[#475569]">
            &copy; {new Date().getFullYear()} 8Liv. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-3 text-sm md:justify-end">
            <Link href="/privacy" className="text-[#475569] transition-colors hover:text-[#D46E53]">Privacy Policy</Link>
            <Link href="/terms" className="text-[#475569] transition-colors hover:text-[#D46E53]">Terms of Service</Link>
            <Link href="/prescription-policy" className="text-[#475569] transition-colors hover:text-[#D46E53]">Prescription Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
