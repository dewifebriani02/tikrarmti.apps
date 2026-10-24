'use client';

import React from 'react';
import { Murojaah40xTab } from '@/components/alumni/Murojaah40xTab';
import { Sparkles, RotateCcw } from 'lucide-react';

export default function MurojaahPage() {
  return (
    <div className="min-h-screen bg-[#F8FAF9] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 pb-24 xl:pb-12">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Banner Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-800 rounded-3xl p-6 sm:p-10 text-white shadow-xl overflow-hidden relative">
          <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-52 h-52 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 bg-emerald-800/80 border border-emerald-600/50 text-emerald-200 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider mb-3">
                <RotateCcw className="w-3.5 h-3.5 text-yellow-400" />
                Pekan Muraja'ah & Penjagaan Hafalan
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
                Program Muraja'ah 40x
              </h1>
              <p className="text-emerald-100/90 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
                Kunci mutqin adalah pengulangan. Selesaikan target 40 kali putaran muraja'ah untuk mengokohkan hafalan Al-Qur'an dan memenuhi syarat kelulusan ujian akhir.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 sm:p-5 rounded-2xl flex items-center gap-4 shrink-0">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-white">
                <Sparkles className="w-6 h-6 text-yellow-300" />
              </div>
              <div>
                <p className="text-[11px] text-emerald-200 font-bold uppercase tracking-wider">Target Tikrar</p>
                <p className="text-lg font-black text-white">40 Putaran</p>
                <p className="text-[11px] text-emerald-100/80">Syarat Menuju Ujian Akhir</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Content Murojaah 40x */}
        <Murojaah40xTab />
      </div>
    </div>
  );
}
