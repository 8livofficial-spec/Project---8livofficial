export default function Footer() {
  return (
    <footer className="bg-transparent border-t border-[#D46E53]/20 pt-20 pb-10 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <img 
              src="/images/logo%20loss.png" 
              alt="8Liv Logo" 
              className="mb-4 opacity-90"
              style={{ height: 120, objectFit: 'contain' }}
            />
            <p className="text-[#475569] leading-relaxed mb-6">
              Wellness wherever you are. Comprehensive metabolic care designed for sustainable weight loss.
            </p>
          </div>

          {/* Links: Program */}
          <div>
            <h4 className="text-[#0F172A] font-bold mb-6 font-sora">Program</h4>
            <ul className="space-y-4">
              <li><a href="#" className="text-[#475569] hover:text-[#D46E53] transition-colors">How it Works</a></li>
              <li><a href="#" className="text-[#475569] hover:text-[#D46E53] transition-colors">Medication</a></li>
              <li><a href="#" className="text-[#475569] hover:text-[#D46E53] transition-colors">Pricing</a></li>
              <li><a href="#" className="text-[#475569] hover:text-[#D46E53] transition-colors">Success Stories</a></li>
            </ul>
          </div>

          {/* Links: Company */}
          <div>
            <h4 className="text-[#0F172A] font-bold mb-6 font-sora">Company</h4>
            <ul className="space-y-4">
              <li><a href="#" className="text-[#475569] hover:text-[#D46E53] transition-colors">About Us</a></li>
              <li><a href="#" className="text-[#475569] hover:text-[#D46E53] transition-colors">Medical Experts</a></li>
              <li><a href="#" className="text-[#475569] hover:text-[#D46E53] transition-colors">Careers</a></li>
              <li><a href="#" className="text-[#475569] hover:text-[#D46E53] transition-colors">Contact</a></li>
            </ul>
          </div>

          {/* Contact & Legal */}
          <div>
            <h4 className="text-[#0F172A] font-bold mb-6 font-sora">Contact</h4>
            <ul className="space-y-4 mb-8">
              <li className="text-[#475569]">support@8liv.com</li>
              <li className="text-[#475569]">1-800-8LIV-CARE</li>
            </ul>
          </div>

        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-[#D46E53]/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[#475569] text-sm">
            © {new Date().getFullYear()} 8Liv. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm">
            <a href="#" className="text-[#475569] hover:text-[#D46E53] transition-colors">Privacy Policy</a>
            <a href="#" className="text-[#475569] hover:text-[#D46E53] transition-colors">Terms of Service</a>
          </div>
        </div>

      </div>
    </footer>
  )
}

