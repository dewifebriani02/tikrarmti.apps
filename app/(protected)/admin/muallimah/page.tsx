'use client';

import { useState, useEffect } from 'react';
import { Shield, ArrowLeft, GraduationCap, BarChart3, Users, FileText } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Toaster } from 'sonner';
import { MuallimahV2Tab } from '@/components/admin/muallimah-v2/MuallimahV2Tab';
import { MuallimahAnalysisTab } from '@/components/admin/muallimah-v2/MuallimahAnalysisTab';
import { MuallimahAnalysisTableTab } from '@/components/admin/muallimah-v2/MuallimahAnalysisTableTab';
import { MuallimahAvailabilityTab } from '@/components/admin/muallimah-v2/MuallimahAvailabilityTab';
import { cn } from '@/lib/utils';

export default function AdminMuallimahPage() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'data' | 'analysis_table' | 'availability' | 'analysis'>('data');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="min-h-screen bg-gray-50/50" />;
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      <Toaster position="top-right" richColors />

      {/* Header Section */}
      <div className="bg-white/95 backdrop-blur-md border-b border-gray-100 sticky top-0 z-20 shadow-xs">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link
                href="/admin"
                className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-all border border-gray-200/60 shrink-0"
                title="Kembali ke Dashboard"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-bold text-emerald-600 uppercase tracking-[0.15em]">
                  <Shield className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                  <span>Authority Console &bull; Admin</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                  <h1 className="text-base sm:text-2xl font-black text-gray-900 tracking-tight leading-tight">
                    Daftar Muallimah
                  </h1>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] sm:text-xs font-bold border border-emerald-200/60">
                    V2
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation - Smooth horizontal scrolling on mobile */}
        <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 sm:gap-6 border-b border-transparent overflow-x-auto no-scrollbar scroll-smooth pb-1 sm:pb-0">
            <button
              onClick={() => setActiveTab('data')}
              className={cn(
                "pb-2.5 sm:pb-3.5 text-xs sm:text-sm font-bold transition-all border-b-2 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap px-1",
                activeTab === 'data'
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span>Data Muallimah</span>
            </button>
            <button
              onClick={() => setActiveTab('availability')}
              className={cn(
                "pb-2.5 sm:pb-3.5 text-xs sm:text-sm font-bold transition-all border-b-2 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap px-1",
                activeTab === 'availability'
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span>Ketersediaan</span>
            </button>
            <button
              onClick={() => setActiveTab('analysis_table')}
              className={cn(
                "pb-2.5 sm:pb-3.5 text-xs sm:text-sm font-bold transition-all border-b-2 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap px-1",
                activeTab === 'analysis_table'
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span>Tabel Analisis Juz</span>
            </button>
            <button
              onClick={() => setActiveTab('analysis')}
              className={cn(
                "pb-2.5 sm:pb-3.5 text-xs sm:text-sm font-bold transition-all border-b-2 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap px-1",
                activeTab === 'analysis'
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span>Detail Analisis</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {activeTab === 'data' && <MuallimahV2Tab user={user} />}
        {activeTab === 'analysis_table' && <MuallimahAnalysisTableTab />}
        {activeTab === 'availability' && <MuallimahAvailabilityTab />}
        {activeTab === 'analysis' && <MuallimahAnalysisTab />}
      </div>
    </div>
  );
}
