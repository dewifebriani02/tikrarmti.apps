'use client';

import { useState, useEffect } from 'react';
import { Shield, ArrowLeft, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Toaster } from 'sonner';
import { TikrarTab as TikrarManagementTab } from '@/components/admin/tikrar/TikrarTab';

export default function AdminTikrarPage() {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

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
      <div className="bg-white border-b border-gray-100 mb-4 sm:mb-8 sticky top-0 z-20 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-3.5 sm:px-6 lg:px-8 py-3 sm:py-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
              <Link
                href="/admin"
                className="p-2 sm:p-2.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all border border-transparent hover:border-gray-200 flex-shrink-0"
                title="Kembali ke Dashboard"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-bold text-green-600 uppercase tracking-[0.2em] mb-0.5 sm:mb-1">
                  <Shield className="h-3 w-3" />
                  <span>Authority Console</span>
                </div>
                <h1 className="text-lg sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2 sm:gap-3 truncate">
                  Pendaftaran & Seleksi
                  <span className="px-1.5 py-0.5 rounded-md sm:rounded-lg bg-green-50 text-green-700 text-[10px] sm:text-xs font-bold border border-green-100 flex-shrink-0">
                    V2
                  </span>
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="h-8 sm:h-10 px-2.5 sm:px-4 rounded-lg sm:rounded-xl bg-gray-100/50 border border-gray-100 flex items-center gap-1.5 sm:gap-2">
                <ClipboardList className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
                <span className="text-xs sm:text-sm font-bold text-gray-600 hidden xs:inline sm:inline">
                  Data Pendaftaran
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-3.5 sm:px-6 lg:px-8">
        <TikrarManagementTab user={user} />
      </div>
    </div>
  );
}
