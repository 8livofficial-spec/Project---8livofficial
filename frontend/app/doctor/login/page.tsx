'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DoctorLoginRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/?role=doctor');
  }, [router]);

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
      <p className="text-slate-600 font-bold mt-4 animate-pulse text-sm">Redirecting to Medical Portal...</p>
    </main>
  );
}