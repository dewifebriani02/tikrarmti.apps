'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  CheckCircle2, 
  GraduationCap, 
  ArrowRight, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles,
  Calendar,
  Layers,
  BookOpen
} from "lucide-react";

export interface BatchProgramData {
  batchId: string;
  batchName: string;
  batchNumber: number;
  batchStatus: string;
  isOpening: boolean;
  totalDaftar: number;
  lulusSeleksi: number;
  lulusProgram: number;
  persenLolosSeleksi: number;
  persenLulusProgram: number;
}

interface BatchRetentionCarouselProps {
  allBatches: BatchProgramData[];
  tikrarBatches: BatchProgramData[];
  praTikrarBatches: BatchProgramData[];
}

export function BatchRetentionCarousel({
  allBatches,
  tikrarBatches,
  praTikrarBatches,
}: BatchRetentionCarouselProps) {
  const [selectedProgram, setSelectedProgram] = useState<'all' | 'tikrar' | 'pra'>('all');
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeBatches =
    selectedProgram === 'tikrar'
      ? tikrarBatches
      : selectedProgram === 'pra'
      ? praTikrarBatches
      : allBatches;

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft } = scrollRef.current;
      const cardWidth = 360;
      const scrollAmount = direction === 'left' ? -cardWidth : cardWidth;
      scrollRef.current.scrollTo({
        left: scrollLeft + scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Program Selection Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-2 max-w-xl mx-auto px-4">
        <button
          type="button"
          onClick={() => setSelectedProgram('all')}
          className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-1.5 shadow-2xs cursor-pointer ${
            selectedProgram === 'all'
              ? 'bg-emerald-900 text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200/80'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Semua Program</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedProgram('tikrar')}
          className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-1.5 shadow-2xs cursor-pointer ${
            selectedProgram === 'tikrar'
              ? 'bg-emerald-900 text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200/80'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Tikrar Tahfidz</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedProgram('pra')}
          className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-1.5 shadow-2xs cursor-pointer ${
            selectedProgram === 'pra'
              ? 'bg-emerald-900 text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200/80'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Pra-Tikrar</span>
        </button>
      </div>

      {/* Swipeable Container Controls */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        {/* Navigation Arrow Left */}
        <button
          type="button"
          onClick={() => handleScroll('left')}
          aria-label="Geser ke kiri"
          className="hidden md:flex absolute -left-2 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/95 border border-gray-200 shadow-md hover:bg-emerald-50 text-emerald-900 items-center justify-center transition-all duration-200 hover:scale-105 cursor-pointer"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Navigation Arrow Right */}
        <button
          type="button"
          onClick={() => handleScroll('right')}
          aria-label="Geser ke kanan"
          className="hidden md:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/95 border border-gray-200 shadow-md hover:bg-emerald-50 text-emerald-900 items-center justify-center transition-all duration-200 hover:scale-105 cursor-pointer"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Horizontal Scrollable Carousel */}
        <div
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto snap-x snap-mandatory py-4 px-1 scrollbar-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {activeBatches.map((item) => {
            const isBatchOngoing = item.batchStatus === 'open';
            const isOpening = item.isOpening;

            return (
              <div
                key={item.batchId}
                className="w-[310px] sm:w-[350px] shrink-0 snap-start snap-always"
              >
                <Card
                  className={`h-full rounded-3xl border-2 transition-all duration-300 overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-xl ${
                    isOpening
                      ? 'border-emerald-400 bg-gradient-to-b from-emerald-50/70 via-white to-white ring-2 ring-emerald-500/20'
                      : isBatchOngoing
                      ? 'border-amber-300 bg-gradient-to-b from-amber-50/40 via-white to-white'
                      : 'border-gray-200/90 bg-white'
                  }`}
                >
                  <CardHeader className="p-5 pb-3.5 border-b border-gray-150/70 bg-gray-50/50">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                        Angkatan MTI
                      </span>

                      {/* Status Badge */}
                      {isOpening ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-xs animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                          Sedang Dibuka
                        </span>
                      ) : isBatchOngoing ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white shadow-xs">
                          Sedang Berjalan
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-gray-100 text-gray-700 border border-gray-200">
                          Selesai
                        </span>
                      )}
                    </div>

                    <CardTitle className="text-lg font-extrabold text-gray-900 tracking-tight leading-snug">
                      {item.batchName}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="p-5 space-y-4 text-xs flex-1 flex flex-col justify-between">
                    {isOpening ? (
                      /* Content khusus Batch yang sedang dibuka (Batch 4) */
                      <div className="space-y-4 py-2">
                        <div className="p-4 bg-emerald-100/60 rounded-2xl border border-emerald-200/80 space-y-2">
                          <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs">
                            <Calendar className="w-4 h-4 text-emerald-700 shrink-0" />
                            <span>Pendaftaran Angkatan Baru</span>
                          </div>
                          <p className="text-[11px] text-emerald-800 leading-relaxed">
                            Pendaftaran angkatan ini sedang dibuka secara resmi. Silakan daftarkan diri dan amankan kuota sebelum pendaftaran ditutup.
                          </p>
                        </div>

                        {/* Timeline Preview */}
                        <div className="space-y-2 text-[11px] bg-gray-50 p-3.5 rounded-xl border border-gray-150">
                          <div className="flex justify-between items-center text-gray-600">
                            <span>Masa Pendaftaran:</span>
                            <span className="font-bold text-gray-900">Aktif Dibuka</span>
                          </div>
                          <div className="flex justify-between items-center text-gray-600">
                            <span>Ujian Seleksi:</span>
                            <span className="font-bold text-gray-900">Desember 2026</span>
                          </div>
                          <div className="flex justify-between items-center text-gray-600">
                            <span>Mulai Kelas:</span>
                            <span className="font-bold text-emerald-800">Januari 2027</span>
                          </div>
                        </div>

                        <div className="pt-2">
                          <Link
                            href="/pendaftaran"
                            className="w-full py-2.5 px-4 bg-emerald-900 hover:bg-emerald-800 text-white font-bold rounded-xl text-center text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all hover:scale-[1.02]"
                          >
                            <span>Daftar Angkatan Ini</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    ) : (
                      /* Content Batch Berjalan & Selesai */
                      <div className="space-y-4">
                        {/* Metric 1: Pendaftar */}
                        <div className="p-3 bg-gray-50 rounded-2xl border border-gray-150 space-y-1.5">
                          <div className="flex items-center justify-between text-gray-600 font-medium">
                            <span className="flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-blue-600" />
                              1. Total Pendaftar:
                            </span>
                            <span className="font-mono font-black text-sm text-gray-900">
                              {item.totalDaftar}{' '}
                              <span className="text-[10px] font-normal text-gray-500">Thalibah</span>
                            </span>
                          </div>
                          {/* Bar 1: Pendaftar (Full Base 100%) */}
                          <div className="w-full bg-blue-100 rounded-full h-2 overflow-hidden">
                            <div className="bg-blue-600 h-full rounded-full w-full" />
                          </div>
                          <div className="flex justify-between text-[10px] text-gray-400">
                            <span>Pendaftar Masuk</span>
                            <span className="font-mono font-bold text-blue-700">100%</span>
                          </div>
                        </div>

                        {/* Metric 2: Lulus Seleksi */}
                        <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-150 space-y-1.5">
                          <div className="flex items-center justify-between text-gray-700 font-medium">
                            <span className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              2. Lulus Tes Seleksi:
                            </span>
                            <span className="font-mono font-black text-sm text-emerald-900">
                              {item.lulusSeleksi}{' '}
                              <span className="text-[10px] font-normal text-emerald-700">Lolos</span>
                            </span>
                          </div>
                          {/* Bar 2: Seleksi Conversion */}
                          <div className="w-full bg-emerald-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, Math.max(item.persenLolosSeleksi, 5))}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-emerald-700">
                            <span>Tingkat Lolos Seleksi</span>
                            <span className="font-mono font-bold">{item.persenLolosSeleksi}%</span>
                          </div>
                        </div>

                        {/* Metric 3: Lulus Program */}
                        <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-150 space-y-1.5">
                          <div className="flex items-center justify-between text-gray-700 font-medium">
                            <span className="flex items-center gap-1.5">
                              <GraduationCap className="w-3.5 h-3.5 text-amber-600" />
                              3. Lulus Program:
                            </span>
                            <span className="font-mono font-black text-sm text-amber-900">
                              {item.lulusProgram}{' '}
                              <span className="text-[10px] font-normal text-amber-700">Lulus</span>
                            </span>
                          </div>
                          {/* Bar 3: Lulus Program Conversion */}
                          <div className="w-full bg-amber-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-amber-500 to-amber-600 h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min(100, Math.max(item.persenLulusProgram, item.lulusProgram > 0 ? 5 : 0))}%`,
                              }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-amber-800">
                            <span>{isBatchOngoing ? 'Sedang Masa Ujian Akhir' : 'Kelulusan Kurikulum'}</span>
                            <span className="font-mono font-bold">
                              {isBatchOngoing ? 'Berlangsung' : `${item.persenLulusProgram}%`}
                            </span>
                          </div>
                        </div>

                        {/* Footer Note */}
                        <p className="text-[10px] text-gray-400 italic pt-1 text-center">
                          {isBatchOngoing
                            ? '*Angkatan sedang aktif berjalan masa ujian akhir semester'
                            : '*Data kelulusan kurikulum & evaluasi resmi'}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>

        {/* Swipe Helper Text for Mobile & Desktop */}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400 mt-2 font-medium">
          <span>← Geser horizontal untuk melihat seluruh angkatan →</span>
        </div>
      </div>
    </div>
  );
}
