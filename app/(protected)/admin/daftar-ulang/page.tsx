'use client';

import { useState, useEffect } from 'react';
import { Shield, ArrowLeft, FileText, AlertTriangle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Toaster, toast } from 'sonner';
import { DaftarUlangV2Tab } from '@/components/admin/daftar-ulang-v2/DaftarUlangV2Tab';
import { Button } from "@/components/ui/button";

export default function AdminDaftarUlangPage() {
  const [mounted, setMounted] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="min-h-screen bg-gray-50/50" />;
  }

  const handleFinalizeExams = async () => {
    if (!window.confirm("Apakah Ukhti yakin ingin memfinalisasi ujian untuk batch aktif? Aksi ini akan menurukan target hafalan thalibah yang belum lulus ke Juz 30A secara massal. Lanjutkan?")) {
      return;
    }
    
    try {
      setIsFinalizing(true);
      const res = await fetch('/api/admin/daftar-ulang/finalize-exams', {
        method: 'POST',
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to finalize exams');
      
      if (data.downgradedCount > 0) {
        toast.success(data.message, { duration: 5000 });
        // Optional: reload the page to refresh data in tabs
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast.info(data.message);
      }
    } catch (error: any) {
      toast.error(error.message || 'Terjadi kesalahan saat finalisasi ujian');
    } finally {
      setIsFinalizing(false);
    }
  };

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
                  Daftar Ulang
                  <span className="px-1.5 py-0.5 rounded-md sm:rounded-lg bg-green-50 text-green-700 text-[10px] sm:text-xs font-bold border border-green-100 flex-shrink-0">
                    V2
                  </span>
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button 
                variant="destructive" 
                size="sm"
                className="h-8 sm:h-10 px-2.5 sm:px-4 rounded-lg sm:rounded-xl shadow-sm gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold"
                onClick={handleFinalizeExams}
                disabled={isFinalizing}
              >
                {isFinalizing ? <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" /> : <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                <span className="hidden xs:inline sm:inline">Finalisasi Ujian</span>
                <span className="xs:hidden sm:hidden">Finalisasi</span>
              </Button>

              <div className="h-8 sm:h-10 px-2.5 sm:px-4 rounded-lg sm:rounded-xl bg-gray-100/50 border border-gray-100 flex items-center gap-1.5 sm:gap-2">
                <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
                <span className="text-xs sm:text-sm font-bold text-gray-600 hidden md:inline">
                  Data Daftar Ulang
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-3.5 sm:px-6 lg:px-8">
        <DaftarUlangV2Tab />
      </div>
    </div>
  );
}
