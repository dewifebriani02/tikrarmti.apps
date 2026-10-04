'use client';

import { useState, useEffect } from 'react';
import { Shield, ArrowLeft, HeartHandshake } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Toaster } from 'sonner';
import AdminPairingTab from '@/components/AdminPairingTab';

export default function AdminPartnerPage() {
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
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 sm:gap-4">
              <Link
                href="/admin"
                className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all border border-transparent hover:border-gray-200"
                title="Kembali ke Dashboard"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-green-600 uppercase tracking-[0.2em] mb-1">
                  <Shield className="h-3 w-3" />
                  <span>Authority Console</span>
                </div>
                <h1 className="text-lg sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                  Manajemen Partner
                  <span className="px-2 py-0.5 rounded-lg bg-green-50 text-green-700 text-xs font-bold border border-green-100">
                    V2
                  </span>
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="h-8 sm:h-10 px-3 sm:px-4 rounded-xl bg-gray-100/50 border border-gray-100 flex items-center gap-2">
                <HeartHandshake className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-bold text-gray-600">
                  Data Partner
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <AdminPairingTab />
      </div>
    </div>
  );
}
