export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-[#D46E53]/20 bg-transparent pb-10 pt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 grid grid-cols-1 gap-12 md:grid-cols-4">
          <div>
            <img
              src="/images/logo%20loss.png"
              alt="8Liv Logo"
              className="mb-4 opacity-90"
              style={{ height: 120, objectFit: 'contain' }}
            />
            <p className="mb-6 leading-relaxed text-[#475569]">
              Secure online metabolic care built around doctors, care teams, pharmacy workflows, and monthly subscription access.
            </p>
          </div>

          <div>
            <h4 className="mb-6 font-sora font-bold text-[#0F172A]">Program</h4>
            <ul className="space-y-4">
              <li><a href="#how-it-works" className="text-[#475569] transition-colors hover:text-[#D46E53]">How it works</a></li>
              <li><a href="#program" className="text-[#475569] transition-colors hover:text-[#D46E53]">Care model</a></li>
              <li><a href="#outcomes" className="text-[#475569] transition-colors hover:text-[#D46E53]">Outcomes</a></li>
              <li><a href="#portal" className="text-[#475569] transition-colors hover:text-[#D46E53]">Patient dashboard</a></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-6 font-sora font-bold text-[#0F172A]">Company</h4>
            <ul className="space-y-4">
              <li><a href="#company" className="text-[#475569] transition-colors hover:text-[#D46E53]">About 8Liv</a></li>
              <li><a href="#company" className="text-[#475569] transition-colors hover:text-[#D46E53]">Clinical operations</a></li>
              <li><a href="#company" className="text-[#475569] transition-colors hover:text-[#D46E53]">Care network</a></li>
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
            © {new Date().getFullYear()} 8Liv. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm">
            <a href="#" className="text-[#475569] transition-colors hover:text-[#D46E53]">Privacy Policy</a>
            <a href="#" className="text-[#475569] transition-colors hover:text-[#D46E53]">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

