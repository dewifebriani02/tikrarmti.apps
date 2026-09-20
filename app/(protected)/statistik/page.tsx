'use client';

import { useState, useEffect } from 'react';
import { Shield, ArrowLeft, BarChart3, AlertTriangle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Toaster, toast } from 'sonner';
import { AdminStatistik } from '@/components/AdminStatistik';

export default function StatistikPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { isAdmin, isLoading } = useUserRoles();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Strict Admin-only access enforcement
  useEffect(() => {
    if (mounted && !isLoading && user && !isAdmin) {
      toast.error('Akses Ditolak: Halaman Ringkasan Statistik hanya dapat diakses oleh Administrator.');
      const timer = setTimeout(() => {
        router.replace('/dashboard');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [mounted, isLoading, user, isAdmin, router]);

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center animate-pulse">
            <BarChart3 className="w-6 h-6 text-emerald-600 animate-spin" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Memuat Ringkasan Statistik...</h3>
            <p className="text-xs text-gray-500 mt-0.5">Memverifikasi hak akses administrator</p>
          </div>
        </div>
      </div>
    );
  }

  // If user is authenticated but not an admin
  if (user && !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex flex-col items-center justify-center p-4">
        <Toaster position="top-right" richColors />
        <div className="max-w-md w-full bg-white rounded-2xl border border-red-100 shadow-xl p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-black text-gray-900 mb-2">Akses Terbatas</h2>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            Halaman <strong>Ringkasan Statistik</strong> merupakan konsol otoritas khusus untuk <strong>Administrator</strong>. Akun Anda tidak memiliki izin untuk melihat laporan ini.
          </p>
          <div className="space-y-3">
            <Link
              href="/dashboard"
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition-all"
            >
              <span>Kembali ke Dashboard Utama</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      <Toaster position="top-right" richColors />

      {/* Header Section */}
      <div className="bg-white border-b border-gray-100 mb-8 sticky top-0 z-20 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all border border-transparent hover:border-gray-200"
                title="Kembali ke Konsol Admin"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 uppercase tracking-[0.2em] mb-1">
                  <Shield className="h-3 w-3" />
                  <span>Authority Console &bull; Admin Only</span>
                </div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                  Ringkasan Statistik & Analitik
                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                    Live Database
                  </span>
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Link
                href="/admin"
                className="text-xs font-semibold text-gray-500 hover:text-emerald-700 px-3 py-2 rounded-lg hover:bg-gray-100 transition-all"
              >
                Manajemen Admin &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <AdminStatistik />
      </div>
    </div>
  );
}
