import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  Users, 
  Play, 
  Activity, 
  Brain, 
  HeartPulse, 
  Pill, 
  Sparkles, 
  Apple, 
  CheckCircle2, 
  Stethoscope, 
  ArrowRight,
  ShieldCheck,
  Video,
  Clock,
  LineChart,
  Star
} from 'lucide-react';
import Image from 'next/image';

interface LandingPageProps {
  onStartAssessment: () => void;
  onLoginDoctor: () => void;
}

export default function LandingPage({ onStartAssessment, onLoginDoctor }: LandingPageProps) {
  const [scrolled, setScrolled] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#F8FAFC] overflow-x-hidden font-sans">
      
      {/* 1. Navbar */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 border-b ${scrolled ? 'bg-[#0A0A0F]/80 backdrop-blur-xl border-[#2DD4BF]/10 py-4 shadow-lg shadow-black/50' : 'bg-transparent border-transparent py-6'}`}>
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <img src="/images/logo%20loss.png" alt="8Liv Logo" className="h-10 md:h-12 object-contain" />
          </div>
          <nav className="hidden md:flex space-x-10">
            <a href="#how-it-works" className="text-sm font-medium text-[#CBD5E1] hover:text-[#2DD4BF] hover:drop-shadow-[0_0_8px_rgba(45,212,191,0.5)] transition-all">How It Works</a>
            <a href="#services" className="text-sm font-medium text-[#CBD5E1] hover:text-[#2DD4BF] hover:drop-shadow-[0_0_8px_rgba(45,212,191,0.5)] transition-all">Services</a>
            <button onClick={onLoginDoctor} className="text-sm font-medium text-[#CBD5E1] hover:text-[#2DD4BF] hover:drop-shadow-[0_0_8px_rgba(45,212,191,0.5)] transition-all">For Doctors</button>
            <a href="#contact" className="text-sm font-medium text-[#CBD5E1] hover:text-[#2DD4BF] hover:drop-shadow-[0_0_8px_rgba(45,212,191,0.5)] transition-all">Contact</a>
          </nav>
          <div className="flex items-center space-x-6">
            <button 
              onClick={onStartAssessment}
              className="px-6 py-2.5 rounded-full bg-[#2DD4BF] hover:bg-[#0FA89E] text-[#0A0A0F] font-semibold text-sm transition-all duration-300 shadow-[0_0_15px_rgba(45,212,191,0.3)] hover:shadow-[0_0_25px_rgba(45,212,191,0.5)]"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero */}
      <main className="relative pt-32 pb-24 lg:pt-48 lg:pb-32 px-6 lg:px-12 max-w-[1400px] mx-auto flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
        {/* Soft teal radial background glow */}
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[#2DD4BF]/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-[#0FA89E]/10 rounded-full blur-[100px] pointer-events-none -z-10"></div>

        {/* Left: Copy */}
        <div className="flex-1 text-center lg:text-left space-y-8 z-10 animate-slide-up">
          <h1 className="text-5xl lg:text-[5rem] font-bold tracking-tight leading-[1.1] text-white">
            Healthcare That <br />
            <span className="text-gradient-teal">Comes To You.</span>
          </h1>
          
          <p className="text-lg lg:text-xl text-[#94A3B8] max-w-2xl mx-auto lg:mx-0 leading-relaxed font-light">
            Connect with board-certified doctors instantly for personalized treatments, expert guidance, and ongoing care—all from the comfort of your home.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-6">
            <button 
              onClick={onStartAssessment}
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-[#2DD4BF] hover:bg-[#0FA89E] text-[#0A0A0F] font-bold transition-all duration-300 shadow-[0_0_20px_rgba(45,212,191,0.4)] hover:shadow-[0_0_30px_rgba(45,212,191,0.6)]"
            >
              Get Started
            </button>
            <a 
              href="#how-it-works"
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-dark-glass text-[#F8FAFC] font-semibold transition-all duration-300 hover:border-[#2DD4BF] hover:text-[#2DD4BF] border border-white/10"
            >
              How It Works
            </a>
          </div>
        </div>

        {/* Right: Floating Mockup */}
        <div className="flex-1 w-full max-w-lg lg:max-w-none relative animate-fade-in-delay z-10">
          {/* Dashboard/Mockup Card */}
          <div className="relative z-10 rounded-[2rem] bg-dark-glass p-8 border-[#2DD4BF]/30 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transform lg:rotate-2 hover:rotate-0 transition-transform duration-500">
            <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-full bg-slate-800 border border-white/10 overflow-hidden">
                  <img src="https://i.pravatar.cc/150?img=32" alt="Doctor" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="font-bold text-white text-lg">Dr. Sarah Jenkins</p>
                  <p className="text-sm text-[#2DD4BF]">Board-Certified Physician</p>
                </div>
              </div>
              <Video className="w-6 h-6 text-[#94A3B8]" />
            </div>
            
            <div className="space-y-4">
              <div className="h-4 w-3/4 bg-white/5 rounded-full"></div>
              <div className="h-4 w-1/2 bg-white/5 rounded-full"></div>
              <div className="h-4 w-5/6 bg-white/5 rounded-full"></div>
            </div>

            {/* Notification Badge */}
            <div className="absolute -bottom-6 -left-6 bg-[#0A0A0F]/90 backdrop-blur-md border border-[#2DD4BF]/40 px-6 py-4 rounded-2xl shadow-[0_0_30px_rgba(45,212,191,0.2)] flex items-center space-x-4 animate-pulse-glow">
              <div className="w-10 h-10 rounded-full bg-[#2DD4BF]/20 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-[#2DD4BF]" />
              </div>
              <div>
                <p className="font-bold text-white">Consultation Scheduled</p>
                <p className="text-xs text-[#94A3B8]">Today at 2:30 PM</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 3. How It Works - Horizontal Stepper */}
      <section id="how-it-works" className="py-24 relative border-t border-white/5">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-4">Your Path to Better Health</h2>
            <p className="text-[#94A3B8] max-w-2xl mx-auto">Three simple steps to connect with a specialist and begin your personalized treatment plan.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting Line (desktop only) */}
            <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-transparent via-[#2DD4BF]/30 to-transparent -z-10"></div>

            {/* Step 1 */}
            <div className="bg-dark-glass bg-dark-glass-hover p-8 rounded-[2rem] flex flex-col items-center text-center relative group">
              <div className="w-20 h-20 rounded-full bg-[#0A0A0F] border border-[#2DD4BF]/30 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(45,212,191,0.15)] group-hover:shadow-[0_0_30px_rgba(45,212,191,0.3)] transition-shadow">
                <ClipboardCheck className="w-8 h-8 text-[#2DD4BF]" />
              </div>
              <div className="absolute top-4 right-6 text-5xl font-black text-white/5">1</div>
              <h3 className="text-xl font-bold text-white mb-3">Take Health Assessment</h3>
              <p className="text-[#94A3B8] text-sm leading-relaxed">Complete a quick, secure medical intake to share your health history, symptoms, and goals.</p>
            </div>

            {/* Step 2 */}
            <div className="bg-dark-glass bg-dark-glass-hover p-8 rounded-[2rem] flex flex-col items-center text-center relative group">
              <div className="w-20 h-20 rounded-full bg-[#0A0A0F] border border-[#2DD4BF]/30 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(45,212,191,0.15)] group-hover:shadow-[0_0_30px_rgba(45,212,191,0.3)] transition-shadow">
                <Users className="w-8 h-8 text-[#2DD4BF]" />
              </div>
              <div className="absolute top-4 right-6 text-5xl font-black text-white/5">2</div>
              <h3 className="text-xl font-bold text-white mb-3">Match With a Clinician</h3>
              <p className="text-[#94A3B8] text-sm leading-relaxed">We pair you with a board-certified specialist for a secure, high-definition video consultation.</p>
            </div>

            {/* Step 3 */}
            <div className="bg-dark-glass bg-dark-glass-hover p-8 rounded-[2rem] flex flex-col items-center text-center relative group">
              <div className="w-20 h-20 rounded-full bg-[#0A0A0F] border border-[#2DD4BF]/30 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(45,212,191,0.15)] group-hover:shadow-[0_0_30px_rgba(45,212,191,0.3)] transition-shadow">
                <Sparkles className="w-8 h-8 text-[#2DD4BF]" />
              </div>
              <div className="absolute top-4 right-6 text-5xl font-black text-white/5">3</div>
              <h3 className="text-xl font-bold text-white mb-3">Start Your Treatment</h3>
              <p className="text-[#94A3B8] text-sm leading-relaxed">Receive a personalized plan, get medications delivered, and track progress in your dashboard.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Services Grid */}
      <section id="services" className="py-24 relative border-t border-white/5">
        <div className="absolute left-0 top-1/2 w-[500px] h-[500px] bg-[#2DD4BF]/5 rounded-full blur-[150px] pointer-events-none -z-10"></div>
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div className="max-w-2xl">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-4">Comprehensive Care</h2>
              <p className="text-[#94A3B8]">Expert treatments tailored to your unique biology and lifestyle.</p>
            </div>
            <button className="text-[#2DD4BF] font-semibold hover:text-white transition-colors flex items-center space-x-2">
              <span>View all services</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "Weight Management", icon: <Activity />, desc: "Science-backed GLP-1 programs and metabolic coaching." },
              { title: "Mental Health", icon: <Brain />, desc: "Compassionate psychiatric care and therapy sessions." },
              { title: "Primary Care", icon: <Stethoscope />, desc: "Everyday health needs, preventative care, and urgent consults." },
              { title: "Chronic Disease", icon: <HeartPulse />, desc: "Ongoing management for hypertension, diabetes, and more." },
              { title: "Dermatology", icon: <Sparkles />, desc: "Prescription skincare and acne treatments delivered." },
              { title: "Nutrition", icon: <Apple />, desc: "Dietitian-led plans optimized for your specific goals." },
            ].map((service, idx) => (
              <div key={idx} className="bg-dark-glass p-8 rounded-[2rem] relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
                {/* Top glowing border effect */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#2DD4BF] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 shadow-[0_0_15px_#2DD4BF]"></div>
                
                <div className="w-12 h-12 rounded-xl bg-[#2DD4BF]/10 flex items-center justify-center mb-6 text-[#2DD4BF] group-hover:scale-110 transition-transform duration-300">
                  {React.cloneElement(service.icon, { className: "w-6 h-6" })}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{service.title}</h3>
                <p className="text-[#94A3B8] text-sm">{service.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Why 8Liv (Split Layout) */}
      <section className="py-24 relative border-t border-white/5 bg-[#0A0A0F]/50">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1">
            <h2 className="text-5xl lg:text-7xl font-bold tracking-tight text-white mb-6">
              500+ <br />
              <span className="text-gradient-teal text-3xl lg:text-5xl block mt-2">Board-Certified Doctors</span>
            </h2>
            <p className="text-xl text-[#94A3B8] font-light">
              We exclusively partner with the top 1% of clinical specialists nationwide to ensure your care is uncompromising.
            </p>
          </div>
          <div className="flex-1 bg-dark-glass p-10 lg:p-12 rounded-[2.5rem] border-[#2DD4BF]/20 w-full shadow-[0_0_40px_rgba(0,0,0,0.5)]">
            <ul className="space-y-8">
              {[
                { title: "Instant video consults", icon: <Video /> },
                { title: "Secure & HIPAA-safe messaging", icon: <ShieldCheck /> },
                { title: "Personalized treatment plans", icon: <ClipboardCheck /> },
                { title: "24/7 availability & support", icon: <Clock /> },
                { title: "Progress tracking dashboard", icon: <LineChart /> },
              ].map((item, idx) => (
                <li key={idx} className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-[#2DD4BF]/10 flex items-center justify-center text-[#2DD4BF] shadow-[0_0_10px_rgba(45,212,191,0.2)]">
                    {React.cloneElement(item.icon, { className: "w-5 h-5" })}
                  </div>
                  <span className="text-lg text-[#F8FAFC] font-medium">{item.title}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 6. Doctor Dashboard Teaser */}
      <section className="py-24 relative border-t border-white/5 overflow-hidden">
        <div className="absolute right-0 top-1/2 w-[600px] h-[600px] bg-[#2DD4BF]/10 rounded-full blur-[200px] pointer-events-none -z-10"></div>
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 text-center relative z-10">
          <div className="max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-[#2DD4BF]/10 border border-[#2DD4BF]/30 text-[#2DD4BF] text-xs font-bold tracking-widest uppercase mb-6">
              For Providers
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-6">Powerful Tools for Clinicians</h2>
            <p className="text-lg text-[#94A3B8]">
              Join our network and utilize our state-of-the-art provider portal to seamlessly manage patients, handle scheduling, and securely review electronic health records.
            </p>
            <button 
              onClick={onLoginDoctor}
              className="mt-8 px-8 py-3 rounded-full bg-transparent border border-[#2DD4BF]/50 text-[#2DD4BF] font-semibold hover:bg-[#2DD4BF]/10 transition-all duration-300"
            >
              Explore Provider Dashboard
            </button>
          </div>
          
          {/* Blurred Dashboard Mockup */}
          <div className="relative mx-auto max-w-5xl rounded-[2rem] overflow-hidden border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.8)]">
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F] via-transparent to-transparent z-10"></div>
            {/* Abstract representation of UI */}
            <div className="bg-[#111827] h-[400px] w-full p-8 flex flex-col gap-6 blur-[2px] opacity-80">
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <div className="h-6 w-32 bg-white/10 rounded"></div>
                <div className="flex gap-4"><div className="h-8 w-8 rounded-full bg-white/10"></div><div className="h-8 w-24 bg-[#2DD4BF]/20 rounded"></div></div>
              </div>
              <div className="flex gap-6 h-full">
                <div className="w-1/4 h-full bg-white/5 rounded-xl"></div>
                <div className="flex-1 flex flex-col gap-6">
                  <div className="flex gap-6"><div className="flex-1 h-32 bg-white/5 rounded-xl"></div><div className="flex-1 h-32 bg-white/5 rounded-xl"></div><div className="flex-1 h-32 bg-white/5 rounded-xl"></div></div>
                  <div className="flex-1 bg-white/5 rounded-xl w-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Testimonials */}
      <section className="py-24 relative border-t border-white/5">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-4">Life-Changing Results</h2>
            <p className="text-[#94A3B8]">Hear from members who have transformed their wellness with 8Liv.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { quote: "The most seamless medical experience I've ever had. My doctor was incredibly attentive, and the treatment plan started working within weeks.", name: "Michael T." },
              { quote: "Finally, healthcare that fits my schedule. Being able to message my clinician directly through the app gives me so much peace of mind.", name: "Elena R." },
              { quote: "The GLP-1 program changed my life. Having a dashboard to track my progress alongside expert clinical advice is a game-changer.", name: "David K." },
            ].map((test, idx) => (
              <div key={idx} className="bg-dark-glass p-8 rounded-[2rem] flex flex-col justify-between">
                <div>
                  <div className="flex space-x-1 mb-6">
                    {[1,2,3,4,5].map(star => <Star key={star} className="w-5 h-5 fill-[#2DD4BF] text-[#2DD4BF]" />)}
                  </div>
                  <p className="text-[#E2E8F0] text-lg leading-relaxed mb-8">"{test.quote}"</p>
                </div>
                <div className="flex items-center space-x-4 border-t border-white/10 pt-6">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                    <img src={`https://i.pravatar.cc/150?img=${idx+15}`} alt={test.name} className="w-full h-full object-cover rounded-full opacity-80 grayscale" />
                  </div>
                  <p className="font-bold text-white">{test.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. CTA Banner */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0FA89E]/20 to-[#0A0A0F] -z-10"></div>
        <div className="max-w-4xl mx-auto px-6 text-center z-10 relative">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-8">
            Start Your Wellness <br /> Journey Today
          </h2>
          <button 
            onClick={onStartAssessment}
            className="px-10 py-5 rounded-full bg-[#2DD4BF] hover:bg-[#0FA89E] text-[#0A0A0F] font-bold text-lg transition-all duration-300 shadow-[0_0_30px_rgba(45,212,191,0.5)] hover:shadow-[0_0_50px_rgba(45,212,191,0.7)] hover:-translate-y-1"
          >
            Book a Consultation
          </button>
        </div>
      </section>

      {/* 9. Footer */}
      <footer className="bg-[#050508] py-16 border-t border-white/5">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 grid grid-cols-1 md:grid-cols-5 gap-12 mb-16">
          <div className="col-span-1 md:col-span-2 pr-8">
            <img src="/images/logo%20loss.png" alt="8Liv Logo" className="h-10 mb-6 brightness-0 invert opacity-80" />
            <p className="text-[#94A3B8] font-light text-sm max-w-sm mb-6">
              Wellness Wherever You Are. The premium concierge telehealth platform connecting you with board-certified clinicians.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-[#2DD4BF] hover:bg-[#2DD4BF]/20 transition-colors">in</a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-[#2DD4BF] hover:bg-[#2DD4BF]/20 transition-colors">tw</a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-[#2DD4BF] hover:bg-[#2DD4BF]/20 transition-colors">ig</a>
            </div>
          </div>
          <div>
            <h4 className="font-bold text-white mb-6">Company</h4>
            <ul className="space-y-4 text-[#94A3B8] text-sm">
              <li><a href="#" className="hover:text-[#2DD4BF] transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-[#2DD4BF] transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-[#2DD4BF] transition-colors">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-6">Services</h4>
            <ul className="space-y-4 text-[#94A3B8] text-sm">
              <li><a href="#" className="hover:text-[#2DD4BF] transition-colors">Weight Management</a></li>
              <li><a href="#" className="hover:text-[#2DD4BF] transition-colors">Mental Health</a></li>
              <li><a href="#" className="hover:text-[#2DD4BF] transition-colors">Primary Care</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-6">Legal</h4>
            <ul className="space-y-4 text-[#94A3B8] text-sm">
              <li><a href="#" className="hover:text-[#2DD4BF] transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-[#2DD4BF] transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-[#2DD4BF] transition-colors">HIPAA Notice</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 pt-8 border-t border-white/5 text-center text-[#64748B] text-xs">
          <p>© {new Date().getFullYear()} 8Liv. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
