'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  ArrowRightLeft, 
  Calendar, 
  FileText, 
  Award, 
  Clock, 
  Sparkles, 
  ChevronRight, 
  BookOpen, 
  CheckCircle2,
  GraduationCap,
  ClipboardList,
  Layers,
  Send
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type DashboardPhase = 
  | 'pendaftaran'
  | 'daftar_ulang'
  | 'pekan_1_tashih'
  | 'ziyadah'
  | 'pekan_10_ujian'
  | 'ujian_akhir_next_batch';

interface DynamicActionBannerProps {
  user: any;
  activeBatch: any;
  currentWeek: number;
  hasRegistered: boolean;
  isRegisteredTikrar: boolean;
  hasPhase3Complete: boolean;
  daftarUlangData?: any;
  onOpenScheduleOptions: () => void;
  onOpenSitIn: () => void;
  onOpenTransfer: () => void;
  onOpenExam?: () => void;
}

export function DynamicActionBanner({
  user,
  activeBatch,
  currentWeek,
  hasRegistered,
  isRegisteredTikrar,
  hasPhase3Complete,
  daftarUlangData,
  onOpenScheduleOptions,
  onOpenSitIn,
  onOpenTransfer,
  onOpenExam,
}: DynamicActionBannerProps) {
  // Determine current active lifecycle phase
  const phase: DashboardPhase = React.useMemo(() => {
    // 1. If not registered at all
    if (!hasRegistered) {
      return 'pendaftaran';
    }

    // 2. If registered but hasn't completed daftar ulang
    if (!hasPhase3Complete) {
      return 'daftar_ulang';
    }

    // 3. Week 1: Masa Tashih Awal
    if (currentWeek <= 1) {
      return 'pekan_1_tashih';
    }

    // 4. Week 2 to 9: Masa Ziyadah
    if (currentWeek >= 2 && currentWeek <= 9) {
      return 'ziyadah';
    }

    // 5. Week 10: Pra-Ujian Akhir (Pilih Jadwal)
    if (currentWeek === 10) {
      return 'pekan_10_ujian';
    }

    // 6. Week 11+: Masa Ujian Akhir & Pendaftaran Batch Berikutnya
    return 'ujian_akhir_next_batch';
  }, [hasRegistered, hasPhase3Complete, currentWeek]);

  return (
    <div className="max-w-6xl mx-auto w-full px-4 md:px-8 mb-6">
      {/* ============================================================== */}
      {/* FASE 1: MASA PENDAFTARAN BATCH BARU                            */}
      {/* ============================================================== */}
      {phase === 'pendaftaran' && (
        <div className="bg-gradient-to-r from-emerald-50/95 via-green-50/80 to-teal-50/90 border border-emerald-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-md shadow-emerald-700/20 shrink-0">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm sm:text-base font-black text-gray-900 tracking-tight">
                  Pendaftaran Batch Baru Telah Dibuka 🌸
                </h4>
                <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full uppercase">
                  Buka
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                Pendaftaran program Tikrar Tahfidz MTI sedang berlangsung. Amankan kuota halaqah Ukhti sebelum ditutup.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
            <Link href="/pendaftaran/tikrar-tahfidz" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-sm text-xs sm:text-sm">
                Daftar Tikrar Tahfidz &rarr;
              </Button>
            </Link>
            <Link href="/pendaftaran/pra-tikrar" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto border-emerald-300 text-emerald-800 hover:bg-emerald-50 font-bold rounded-xl text-xs sm:text-sm">
                Daftar Pra-Tikrar (Juz 30) &rarr;
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* FASE 2: MASA DAFTAR ULANG                                      */}
      {/* ============================================================== */}
      {phase === 'daftar_ulang' && (
        <div className="bg-gradient-to-r from-amber-50/95 via-orange-50/80 to-amber-50/90 border border-amber-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-600/20 shrink-0">
              <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm sm:text-base font-black text-gray-900 tracking-tight">
                  Konfirmasi & Daftar Ulang Halaqah 📋
                </h4>
                <span className="text-[10px] font-black bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full uppercase">
                  Wajib
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                Silakan selesaikan tanda tangan berkas akad, penentuan halaqah utama, dan verifikasi pasangan tikrar Ukhti.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <Link href="/daftar-ulang" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-sm text-xs sm:text-sm">
                Selesaikan Daftar Ulang &rarr;
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* FASE 3: PEKAN 1 (MASA TASHIH AWAL)                             */}
      {/* ============================================================== */}
      {phase === 'pekan_1_tashih' && (
        <div className="bg-gradient-to-r from-sky-50/95 via-blue-50/80 to-indigo-50/90 border border-sky-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-sky-700 text-white flex items-center justify-center shadow-md shadow-sky-700/20 shrink-0">
              <ArrowRightLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm sm:text-base font-black text-gray-900 tracking-tight">
                  Penyesuaian / Ganti Jadwal Halaqah 🔄
                </h4>
                <span className="text-[10px] font-black bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full uppercase">
                  Pekan 1 Tashih
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                Jadwal halaqah utama bentrok setelah pekan pertama? Ukhti dapat mengajukan perpindahan kelompok halaqah resmi.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <Button
              onClick={onOpenTransfer}
              className="w-full sm:w-auto bg-sky-700 hover:bg-sky-800 text-white font-bold rounded-xl shadow-sm text-xs sm:text-sm"
            >
              <ArrowRightLeft className="w-4 h-4 mr-1.5" />
              Ajukan Ganti Jadwal
            </Button>
            <Link href="/tashih" className="hidden sm:inline-flex">
              <Button
                variant="outline"
                className="border-sky-200 text-sky-800 hover:bg-sky-50 font-semibold rounded-xl text-xs sm:text-sm"
              >
                Catatan Tashih
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* FASE 4: MASA ZIYADAH (PEKAN 2 - 9)                              */}
      {/* ============================================================== */}
      {phase === 'ziyadah' && (
        <div className="bg-gradient-to-r from-emerald-50/90 via-green-50/70 to-teal-50/80 border border-green-200/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-green-700 text-white flex items-center justify-center shadow-md shadow-green-200 shrink-0">
              <ArrowRightLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm sm:text-base font-black text-gray-900 tracking-tight">
                  Layanan Jadwal: Mutasi & Sit-In Pengganti 🌸
                </h4>
                <span className="text-[10px] font-black bg-green-100 text-green-800 px-2 py-0.5 rounded-full uppercase">
                  Pekan {currentWeek}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                Berhalangan hadir pekan ini? Ikuti kelas pengganti (Sit-In). Atau ajukan Mutasi Jadwal jika jam utama Ukhti berubah permanen.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
            <Button
              onClick={onOpenScheduleOptions}
              className="w-full sm:w-auto bg-green-700 hover:bg-green-800 text-white font-bold rounded-xl shadow-sm text-xs sm:text-sm transition-all"
            >
              <Layers className="w-4 h-4 mr-1.5" />
              Kelola Jadwal (Sit-In / Mutasi)
            </Button>
            <Link href="/sit-in" className="hidden sm:inline-flex">
              <Button
                variant="outline"
                className="border-green-200 text-green-800 hover:bg-green-50 font-semibold rounded-xl text-xs sm:text-sm"
              >
                Lihat Jadwal Sit-In
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* FASE 5: PEKAN 10 (PRA-UJIAN AKHIR - PILIH JADWAL)               */}
      {/* ============================================================== */}
      {phase === 'pekan_10_ujian' && (
        <div className="bg-gradient-to-r from-purple-50/95 via-indigo-50/80 to-purple-50/90 border border-purple-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-purple-700 text-white flex items-center justify-center shadow-md shadow-purple-700/20 shrink-0">
              <Award className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm sm:text-base font-black text-gray-900 tracking-tight">
                  Pemilihan Jadwal Ujian Akhir Juz 🎓
                </h4>
                <span className="text-[10px] font-black bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full uppercase">
                  Pekan 10
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                Pekan ziyadah segera tuntas! Kuota penguji ujian lisan terbatas. Silakan pilih dan amankan jadwal ujian lisan Ukhti sekarang.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <Link href="/ujian" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl shadow-sm text-xs sm:text-sm">
                <Calendar className="w-4 h-4 mr-1.5" />
                Pilih Jadwal Ujian Akhir &rarr;
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* FASE 6: MASA UJIAN AKHIR & PENDAFTARAN BATCH BERIKUTNYA         */}
      {/* ============================================================== */}
      {phase === 'ujian_akhir_next_batch' && (
        <div className="bg-gradient-to-r from-teal-50/95 via-emerald-50/80 to-cyan-50/90 border border-teal-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-teal-700 text-white flex items-center justify-center shadow-md shadow-teal-700/20 shrink-0">
              <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm sm:text-base font-black text-gray-900 tracking-tight">
                  Pendaftaran Batch Berikutnya Telah Dibuka 🚀
                </h4>
                <span className="text-[10px] font-black bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full uppercase">
                  Batch Baru
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                Selamat telah menuntaskan evaluasi! Lanjutkan perjalanan tahfidz ke juz berikutnya dengan mendaftar di batch baru.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <Link href="/pendaftaran" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl shadow-sm text-xs sm:text-sm">
                Daftar Batch Berikutnya &rarr;
              </Button>
            </Link>
            <Link href="/ujian" className="hidden sm:inline-flex">
              <Button
                variant="outline"
                className="border-teal-200 text-teal-800 hover:bg-teal-50 font-semibold rounded-xl text-xs sm:text-sm"
              >
                Cek Ujian
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
