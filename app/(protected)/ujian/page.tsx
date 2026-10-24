'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/hooks/useAuth';
import { useActiveBatch } from '@/hooks/useBatches';
import { 
  Calendar, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Sparkles, 
  Info, 
  HelpCircle,
  ArrowRight,
  BookOpen,
  ClipboardList,
  ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function UjianPage() {
  const { user } = useAuth();
  const { activeBatch } = useActiveBatch();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 animate-fadeInUp pb-24 font-sans">
      {/* 1. Header Halaman (Standar Jurnal Harian) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              Ujian & Evaluasi Pekanan
              <Sparkles className="w-4 h-4 text-amber-500" />
            </h1>
            <p className="text-gray-700 text-[10px] font-black uppercase tracking-widest leading-none mt-1">
              {activeBatch?.name || 'Tikrar Tahfidz MTI'}
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-2xl shadow-sm">
            <span className="text-xs">📝</span>
            <span className="text-xs font-black uppercase tracking-wider">
              Ujian Pekanan
            </span>
          </div>
        </div>

        {/* 2. Hero Status Card (Gradien Hijau Tua Elegan) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-900 to-green-800 p-4 sm:p-5 text-white shadow-lg border border-white/10">
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner">
                <Calendar className="w-5 h-5 text-green-200" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-wide">
                  Jadwal Evaluasi Pekanan
                </h2>
                <p className="text-green-100/70 text-[10px] font-black uppercase tracking-tighter">
                  Dilaksanakan Setiap Akhir Pekan (Sabtu - Ahad)
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black uppercase tracking-wider bg-white/15 text-green-100 px-2.5 py-1 rounded-lg border border-white/10">
                Pekan Berjalan
              </span>
            </div>
          </div>

          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-24 h-24 bg-yellow-400/5 rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-24 h-24 bg-green-400/5 rounded-full blur-2xl" />
        </div>
      </div>

      {/* 3. Banner Alur Ujian */}
      <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-100/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Info className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="text-xs font-black text-gray-900 leading-tight">
              Alur Evaluasi Pekanan Santri
            </p>
            <p className="text-[10px] text-gray-500 font-medium mt-0.5">
              Tashih Bacaan → Pengisian Jurnal 4 Blok → Ujian Mandiri Akhir Pekan.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
          <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-md border border-emerald-200">
            Terjadwal
          </span>
        </div>
      </div>

      {/* 4. Kartu Syarat & Ketentuan Mengikuti Ujian */}
      <Card className="rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 bg-white space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-gray-900">
              Syarat & Kesiapan Ujian
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Pastikan seluruh persiapan berikut telah tuntas sebelum mengikuti ujian:
            </p>
          </div>
          <span className="text-[10px] font-bold bg-green-50 text-green-800 border border-green-200 px-2.5 py-1 rounded-full">
            3 Langkah
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50/70 border border-gray-100">
            <div className="w-7 h-7 rounded-lg bg-green-100 text-green-800 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
              1
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-900">Tashih Bacaan Tuntas</h4>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                Menyetorkan bacaan blok berjalan bersama Mu'allimah dan dinyatakan lulus tashih.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50/70 border border-gray-100">
            <div className="w-7 h-7 rounded-lg bg-green-100 text-green-800 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
              2
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-900">Jurnal Harian 4 Blok</h4>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                Melengkapi laporan 9 indikator jurnal harian untuk 4 blok target pekan berjalan.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50/70 border border-gray-100">
            <div className="w-7 h-7 rounded-lg bg-green-100 text-green-800 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
              3
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-900">Pengerjaan Ujian Akhir Pekan</h4>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                Link evaluasi online akan otomatis aktif dan dibagikan di grup halaqah pada hari Sabtu.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons to Support Preparation */}
        <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
          <Link href="/jurnal-harian" className="flex-1">
            <Button className="w-full bg-green-900 hover:bg-green-800 text-white rounded-xl text-xs font-bold py-2.5 gap-1.5 shadow-sm">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Buka Jurnal Harian</span>
            </Button>
          </Link>
          <Link href="/tashih" className="flex-1">
            <Button variant="outline" className="w-full border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-semibold py-2.5 gap-1.5">
              <ClipboardList className="w-3.5 h-3.5" />
              <span>Catatan Tashih</span>
            </Button>
          </Link>
        </div>
      </Card>

      {/* 5. Catatan Ketentuan Nilai */}
      <div className="p-3.5 bg-gray-50 border border-gray-100 rounded-2xl space-y-1.5">
        <p className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-gray-500" />
          Ketentuan Nilai Evaluasi
        </p>
        <p className="text-[11px] text-gray-500 leading-relaxed">
          Ujian pekanan bertujuan mengevaluasi ketepatan tajwid, kelancaran hafalan, dan pemahaman mufrodat blok hafalan. Nilai akan direkap oleh Mu'allimah sebagai akumulasi rapor evaluasi kelulusan akhir juz.
        </p>
      </div>
    </div>
  );
}
