'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/hooks/useAuth';
import { useActiveBatch } from '@/hooks/useBatches';
import { 
  Award, 
  CheckCircle2, 
  Sparkles, 
  Info, 
  HelpCircle,
  ArrowRight,
  BookOpen,
  RotateCcw,
  GraduationCap,
  FileCheck2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function KelulusanSertifikatPage() {
  const { user } = useAuth();
  const { activeBatch } = useActiveBatch();

  const graduationCriteria = [
    {
      step: '1',
      title: 'Presensi & Tashih Bacaan (≥ 80%)',
      desc: 'Hadir aktif di kelas utama/sit-in dan menuntaskan setoran tashih bersama Mu\'allimah.'
    },
    {
      step: '2',
      title: 'Tuntas Jurnal Harian 40 Blok',
      desc: 'Melengkapi seluruh 9 indikator jurnal harian dari blok pertama hingga tuntas 1/2 juz.'
    },
    {
      step: '3',
      title: 'Kelulusan Ujian Akhir Juz',
      desc: 'Lulus evaluasi ujian akhir hafalan dengan predikat Mumtaz atau Jayyid Jiddan.'
    },
    {
      step: '4',
      title: 'Tuntas Muraja\'ah 40x Putaran',
      desc: 'Menyelesaikan 40 kali pengulangan 1/2 juz di ruang Muraja\'ah sebagai syarat syahadah & naik juz.'
    }
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 animate-fadeInUp pb-24 font-sans">
      {/* 1. Header Halaman (Standar Jurnal Harian) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              Kelulusan & Syahadah
              <Sparkles className="w-4 h-4 text-amber-500" />
            </h1>
            <p className="text-gray-700 text-[10px] font-black uppercase tracking-widest leading-none mt-1">
              {activeBatch?.name || 'Tikrar Tahfidz MTI'}
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-2xl shadow-sm">
            <Award className="w-3.5 h-3.5 text-emerald-700" />
            <span className="text-xs font-black uppercase tracking-wider">
              Syahadah Resmi
            </span>
          </div>
        </div>

        {/* 2. Hero Status Card (Gradien Hijau Tua Elegan) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-900 to-green-800 p-4 sm:p-5 text-white shadow-lg border border-white/10">
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner">
                <Award className="w-5 h-5 text-green-200" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-wide">
                  Penerbitan Syahadah Santri
                </h2>
                <p className="text-green-100/70 text-[10px] font-black uppercase tracking-tighter">
                  Sertifikat Resmi Kelulusan Tikrar Tahfidz
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black uppercase tracking-wider bg-white/15 text-green-100 px-2.5 py-1 rounded-lg border border-white/10">
                Terakreditasi MTI
              </span>
            </div>
          </div>

          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-24 h-24 bg-yellow-400/5 rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-24 h-24 bg-green-400/5 rounded-full blur-2xl" />
        </div>
      </div>

      {/* 3. Banner Edukasi Alur Kelulusan */}
      <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-100/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Info className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="text-xs font-black text-gray-900 leading-tight">
              4 Pilar Syarat Penerbitan Syahadah
            </p>
            <p className="text-[10px] text-gray-500 font-medium mt-0.5">
              Diterbitkan secara digital dengan barcode verifikasi resmi setelah seluruh pilar tuntas.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
          <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-md border border-emerald-200">
            Terstandarisasi
          </span>
        </div>
      </div>

      {/* 4. Kartu 4 Pilar Kelulusan */}
      <Card className="rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 bg-white space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-gray-900">
              Kriteria Kelulusan Wisudawati
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Pastikan seluruh kewajiban pembelajaran berikut terpenuhi:
            </p>
          </div>
          <span className="text-[10px] font-bold bg-green-50 text-green-800 border border-green-200 px-2.5 py-1 rounded-full">
            4 Pilar
          </span>
        </div>

        <div className="space-y-3">
          {graduationCriteria.map((item) => (
            <div key={item.step} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50/70 border border-gray-100">
              <div className="w-7 h-7 rounded-lg bg-green-100 text-green-800 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                {item.step}
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900">{item.title}</h4>
                <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions to Complete Pillars */}
        <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
          <Link href="/murojaah" className="flex-1">
            <Button className="w-full bg-green-900 hover:bg-green-800 text-white rounded-xl text-xs font-bold py-2.5 gap-1.5 shadow-sm">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Program Muraja'ah 40x</span>
            </Button>
          </Link>
          <Link href="/alumni" className="flex-1">
            <Button variant="outline" className="w-full border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-semibold py-2.5 gap-1.5">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Ruang Alumni MTI</span>
            </Button>
          </Link>
        </div>
      </Card>

      {/* 5. Catatan Legalisasi & Verifikasi */}
      <div className="p-3.5 bg-gray-50 border border-gray-100 rounded-2xl space-y-1.5">
        <p className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-gray-500" />
          Verifikasi Keaslian Syahadah
        </p>
        <p className="text-[11px] text-gray-500 leading-relaxed">
          Setiap sertifikat digital dilengkapi dengan ID unik dan QR-Code verifikasi resmi yang terhubung langsung ke database wisudawati Markaz Tikrar Indonesia untuk memastikan keabsahan riwayat hafalan Ukhti.
        </p>
      </div>
    </div>
  );
}
