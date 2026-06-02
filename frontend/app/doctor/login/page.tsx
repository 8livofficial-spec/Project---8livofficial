'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight, Mail, Lock, Stethoscope, ShieldCheck } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const inputCls = 'w-full border border-slate-200 rounded-2xl p-4 pl-12 bg-slate-50/50 outline-none transition-all duration-300 text-slate-900 placeholder-slate-400 font-medium hover:border-blue-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:-translate-y-0.5 shadow-sm';
const labelCls = 'block text-sm font-bold text-slate-700 mb-2 tracking-wide';

export default function DoctorLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoginView, setIsLoginView] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/doctor/dashboard');
    });
  }, [router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isLoginView) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/doctor/dashboard');
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        // Create doctor profile + wallet on signup
        if (data.user) {
          await supabase.from('doctor_profiles').insert({
            doctor_id: data.user.id,
            full_name: fullName || email.split('@')[0],
          });
          await supabase.from('doctor_wallet').insert({
            doctor_id: data.user.id,
            balance: 0,
            total_earned: 0,
            total_withdrawn: 0,
          });
        }
        router.push('/doctor/dashboard');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-blue-100 selection:text-blue-900">
      <style>{`
        @keyframes fadeSlideUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        .anim { animation: fadeSlideUp 0.6s ease-out both; }
      `}</style>

      {/* Background blobs — blue/cyan for doctor theme */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200/50 rounded-full blur-[100px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-200/50 rounded-full blur-[100px] pointer-events-none z-0"></div>

      <div className="max-w-md w-full bg-white/80 backdrop-blur-2xl p-10 md:p-12 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.06)] border border-white/60 relative z-10 anim">

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="bg-gradient-to-br from-blue-100 to-cyan-100 text-blue-600 p-5 rounded-[1.5rem] shadow-sm border border-white">
            <Stethoscope className="w-9 h-9" />
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-900 to-cyan-700 tracking-tighter mb-1">8liv Provider</h1>
          <p className="text-slate-500 font-bold text-xs tracking-widest uppercase flex items-center justify-center gap-1 mt-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500"/> Secure Medical Portal
          </p>
        </div>

        <h2 className="text-2xl font-black text-slate-800 mb-8 text-center">
          {isLoginView ? 'Welcome Doctor 👋' : 'Register Provider ✨'}
        </h2>

        {error && (
          <div className="bg-rose-50 text-rose-600 font-bold p-4 rounded-2xl mb-6 text-sm border border-rose-100 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0"/> {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-5">
          {!isLoginView && (
            <div>
              <label className={labelCls}>Full Name</label>
              <div className="relative">
                <Stethoscope className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2"/>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className={inputCls} placeholder="Dr. Sharma"/>
              </div>
            </div>
          )}

          <div>
            <label className={labelCls}>Email Address</label>
            <div className="relative">
              <Mail className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2"/>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className={inputCls} placeholder="doctor@8liv.com"/>
            </div>
          </div>

          <div>
            <label className={labelCls}>Password</label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2"/>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className={inputCls} minLength={6} placeholder="Min 6 characters"/>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-60 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all duration-300 hover:-translate-y-1 active:scale-[0.98] flex items-center justify-center gap-2 group"
          >
            {loading ? 'Authenticating...' : (isLoginView ? 'Access Portal' : 'Create Account')}
            {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform"/>}
          </button>
        </form>

        <button
          onClick={() => { setIsLoginView(!isLoginView); setError(''); }}
          className="w-full text-center mt-6 text-sm text-blue-600 font-bold hover:text-blue-800 transition-colors"
        >
          {isLoginView ? 'New Provider? Register here' : 'Already registered? Sign in'}
        </button>
      </div>
    </main>
  );
}