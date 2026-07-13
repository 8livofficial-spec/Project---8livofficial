'use client'

export default function Footer() {
  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
  }

  return (
    <footer className="relative z-10 border-t border-[#D46E53]/20 bg-transparent pb-10 pt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 grid grid-cols-1 gap-12 md:grid-cols-4">
          <div>
            <img
              src="/brand-logo.svg"
              alt="8Liv Logo"
              className="mb-4 h-14 w-auto object-contain opacity-90"
            />
            <p className="mb-6 leading-relaxed text-[#475569]">
              Secure online metabolic care with doctor consultations, treatment review, progress tracking, and follow-up support.
            </p>
          </div>

          <div>
            <h4 className="mb-6 font-sora font-bold text-[#0F172A]">Program</h4>
            <ul className="space-y-4">
              <li><button type="button" onClick={() => scrollToSection('how-it-works')} className="text-left text-[#475569] transition-colors hover:text-[#D46E53]">How it works</button></li>
              <li><button type="button" onClick={() => scrollToSection('program')} className="text-left text-[#475569] transition-colors hover:text-[#D46E53]">Care model</button></li>
              <li><button type="button" onClick={() => scrollToSection('outcomes')} className="text-left text-[#475569] transition-colors hover:text-[#D46E53]">Outcomes</button></li>
              <li><button type="button" onClick={() => scrollToSection('portal')} className="text-left text-[#475569] transition-colors hover:text-[#D46E53]">Patient dashboard</button></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-6 font-sora font-bold text-[#0F172A]">Company</h4>
            <ul className="space-y-4">
              <li><button type="button" onClick={() => scrollToSection('company')} className="text-left text-[#475569] transition-colors hover:text-[#D46E53]">About 8Liv</button></li>
              <li><button type="button" onClick={() => scrollToSection('company')} className="text-left text-[#475569] transition-colors hover:text-[#D46E53]">Clinical operations</button></li>
              <li><button type="button" onClick={() => scrollToSection('company')} className="text-left text-[#475569] transition-colors hover:text-[#D46E53]">Care network</button></li>
              <li><a href="mailto:8livofficial@gmail.com" className="text-[#475569] transition-colors hover:text-[#D46E53]">Contact</a></li>
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

        <div className="flex flex-col items-center justify-between gap-4 border-t border-[#D46E53]/10 pt-8 md:flex-row">
          <p className="text-sm text-[#475569]">
            &copy; {new Date().getFullYear()} 8Liv. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm">
            <a href="/privacy-policy" className="text-[#475569] transition-colors hover:text-[#D46E53]">Privacy Policy</a>
            <a href="/terms" className="text-[#475569] transition-colors hover:text-[#D46E53]">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
