'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { 
  Calendar, 
  Sparkles, 
  Info, 
  HelpCircle, 
  BookOpen, 
  ClipboardList, 
  Award, 
  FileText, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  GraduationCap,
  Lock
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePersona } from '@/hooks/usePersona';
import { useActiveBatch } from '@/hooks/useBatches';
import { FinalExamSelectionModal } from '@/components/dashboard/FinalExamSelectionModal';
import { cn } from '@/lib/utils';
import { formatDateIndo } from '@/lib/utils/date-helpers';
import { toast } from 'sonner';

export default function UjianPage() {
  const { user } = useAuth();
  const { activePersona, isAdminPersona, isMusyrifahPersona } = usePersona();
  const { activeBatch } = useActiveBatch();
  const [activeTab, setActiveTab] = useState<'pekanan' | 'akhir'>('akhir');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'pekanan' || tab === 'akhir') {
        setActiveTab(tab);
      }
    }
  }, []);

  // Ujian Akhir Selection Modal State
  const [selectionOpen, setSelectionOpen] = useState(false);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  const [writtenAttempt, setWrittenAttempt] = useState<any>(null);

  const fetchRegistrations = async () => {
    setLoadingRegistrations(true);
    try {
      const url = `/api/exams/final-exams/registrations${activeBatch?.id ? `?batch_id=${activeBatch.id}` : ''}`;
      const response = await fetch(url);
      const result = await response.json();
      if (result.success) {
        setRegistrations(Array.isArray(result.data) ? result.data : result.data ? [result.data] : []);
      }

      // Also fetch exam attempts to check if written exam has been completed
      try {
        const attemptRes = await fetch('/api/exam/attempts');
        const attemptData = await attemptRes.json();
        if (attemptData.attempt) {
          setWrittenAttempt(attemptData.attempt);
        }
      } catch (err) {
        console.error('Fetch written attempt error:', err);
      }
    } catch (error) {
      console.error('Fetch registrations error:', error);
    } finally {
      setLoadingRegistrations(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, [activeBatch?.id]);

  const oralRegistration = registrations.find(r => r.schedule?.exam_type === 'oral');
  const writtenRegistration = registrations.find(r => r.schedule?.exam_type === 'written');

  // Hanya izinkan bypass jadwal jika persona yang sedang aktif adalah Admin atau Musyrifah
  const isStaffView = isAdminPersona || isMusyrifahPersona;
  const isAdmin = isStaffView;

  const now = new Date();
  const examStartDate = activeBatch?.final_exam_start_date ? new Date(activeBatch?.final_exam_start_date || '') : null;
  const examEndDate = activeBatch?.final_exam_end_date ? new Date(activeBatch.final_exam_end_date) : null;

  // Status jadwal ujian
  const isBeforeExam = !isAdmin && (examStartDate ? now < examStartDate : true);
  const isExamEnded = !isAdmin && examEndDate ? now > examEndDate : false;
  const isExamOpen = isAdmin || (!isBeforeExam && !isExamEnded);

  const isWrittenCompleted = writtenRegistration?.status === 'graded' || writtenAttempt?.status === 'submitted';
  const writtenScore = writtenRegistration?.score ?? writtenRegistration?.score_tulisan ?? writtenAttempt?.score;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 animate-fadeInUp pb-24 font-sans">
      {/* 1. Header Halaman */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              Evaluasi & Ujian
              <Sparkles className="w-4 h-4 text-amber-500" />
            </h1>
            <p className="text-gray-700 text-[10px] font-black uppercase tracking-widest leading-none mt-1">
              {activeBatch?.name || 'Tikrar Tahfidz MTI'}
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-800 px-3 py-1.5 rounded-2xl shadow-sm">
            <span className="text-xs">📜</span>
            <span className="text-xs font-black uppercase tracking-wider">
              {activeTab === 'pekanan' ? 'Ujian Pekanan' : 'Ujian Akhir'}
            </span>
          </div>
        </div>

        {/* Tab Switcher: Ujian Akhir (Pilih Jadwal) vs Panduan Ujian Pekanan */}
        <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-xl border border-gray-200 text-xs font-bold">
          <button
            onClick={() => setActiveTab('akhir')}
            className={cn(
              "py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 relative",
              activeTab === 'akhir' 
                ? "bg-white text-green-900 shadow-sm font-black" 
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            <Award className="w-3.5 h-3.5 text-amber-600" />
            <span>Ujian Akhir (Pilih Jadwal)</span>
            {oralRegistration && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 absolute top-2 right-2" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('pekanan')}
            className={cn(
              "py-2.5 rounded-lg transition-all flex items-center justify-center gap-2",
              activeTab === 'pekanan' 
                ? "bg-white text-green-900 shadow-sm font-black" 
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Panduan Ujian Pekanan</span>
          </button>
        </div>

        {/* 2. Hero Status Card (Gradien Hijau Tua Standar Jurnal Harian) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-900 to-green-800 p-5 text-white shadow-sm border border-green-800">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner shrink-0">
                {activeTab === 'pekanan' ? (
                  <Calendar className="w-5 h-5 text-green-200" />
                ) : (
                  <GraduationCap className="w-5 h-5 text-amber-300" />
                )}
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-green-300">
                  {activeTab === 'pekanan' ? 'EVALUASI MINGGUAN' : 'UJIAN KELULUSAN SYAHADAH'}
                </span>
                <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                  {activeTab === 'pekanan' ? 'Jadwal Evaluasi Pekanan' : 'Portal Ujian Akhir Santri'}
                </h2>
                <p className="text-green-100/80 text-xs mt-0.5">
                  {activeTab === 'pekanan' 
                    ? 'Dilaksanakan Setiap Akhir Pekan (Sabtu - Ahad)'
                    : 'Pilih jadwal ujian lisan hafalan bersama Mu\'allimah Penguji dan ikuti evaluasi pilihan ganda'}
                </p>
              </div>
            </div>
            
            <div className="shrink-0 self-start sm:self-auto">
              <span className="text-[10px] font-black uppercase tracking-wider bg-white/15 text-green-100 px-3 py-1 rounded-full border border-white/20">
                {activeTab === 'pekanan' ? 'Pekan Berjalan' : 'Kelulusan Juz'}
              </span>
            </div>
          </div>

          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-28 h-28 bg-yellow-400/10 rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-28 h-28 bg-green-400/10 rounded-full blur-2xl" />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* KONTEN TAB 1: UJIAN PEKANAN                                              */}
      {/* ========================================================================= */}
      {activeTab === 'pekanan' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Banner Alur Ujian */}
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

          {/* Kartu Syarat & Ketentuan Mengikuti Ujian */}
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

          {/* Catatan Ketentuan Nilai */}
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
      )}

      {/* ========================================================================= */}
      {/* KONTEN TAB 2: UJIAN AKHIR (PILIH JADWAL)                                  */}
      {/* ========================================================================= */}
      {activeTab === 'akhir' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Ujian Lisan Card (PILIH JADWAL) */}
          <Card className="rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 bg-white space-y-4">
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-green-700 text-white flex items-center justify-center shadow-md shadow-green-700/20 shrink-0">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider">
                    SETORAN HAFALAN
                  </span>
                  <h3 className="text-base font-black text-gray-900">
                    Ujian Lisan Akhir Juz
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Ujian kelancaran hafalan bersama Penguji (Mu'allimah) secara one-on-one.
                  </p>
                </div>
              </div>

              {oralRegistration ? (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Terdaftar
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                  Belum Pilih Jadwal
                </span>
              )}
            </div>

            {/* Jika Santri Sudah Terdaftar Jadwal */}
            {oralRegistration ? (
              <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-emerald-700" />
                    {oralRegistration.schedule?.exam_date ? formatDateIndo(oralRegistration.schedule.exam_date) : 'Jadwal Ditentukan'}
                  </span>
                  <span className="flex items-center gap-1 text-emerald-800">
                    <Clock className="w-3.5 h-3.5" />
                    {oralRegistration.schedule?.start_time ? oralRegistration.schedule.start_time.slice(0, 5) : ''} WIB
                  </span>
                </div>
                {oralRegistration.schedule?.examiner?.full_name && (
                  <p className="text-xs text-emerald-800">
                    Penguji: <span className="font-bold">{oralRegistration.schedule.examiner.full_name}</span>
                  </p>
                )}
                {oralRegistration.status === 'graded' && (
                  <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-900">Nilai Ujian Lisan:</span>
                    <span className="text-base font-black text-emerald-700">{oralRegistration.score ?? '-'}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-3.5 text-xs text-gray-600 space-y-1">
                <p className="font-semibold text-gray-800">📌 Petunjuk Pemilihan Jadwal:</p>
                <p>Silakan klik tombol di bawah untuk melihat daftar sesi dan tanggal ujian lisan yang masih memiliki kuota kosong bersama Mu'allimah penguji.</p>
              </div>
            )}

            {/* Tombol Pilih Jadwal */}
            <Button
              onClick={() => setSelectionOpen(true)}
              className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3 rounded-xl shadow-sm text-xs sm:text-sm flex items-center justify-center gap-2 transition-all"
            >
              <Calendar className="w-4 h-4" />
              <span>{oralRegistration ? 'Ubah / Lihat Pilihan Jadwal' : 'Pilih Jadwal Ujian Lisan'}</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Card>

          {/* Ujian Tulisan Card */}
          <Card className="rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 bg-white space-y-4">
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-blue-700 text-white flex items-center justify-center shadow-md shadow-blue-700/20 shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                    PILIHAN GANDA
                  </span>
                  <h3 className="text-base font-black text-gray-900">
                    Ujian Tulisan Akhir Juz
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Evaluasi mutqin hafalan juz melalui soal pilihan ganda CBT: sambung potongan ayat, tebak nama surat, dan letak halaman.
                  </p>
                </div>
              </div>

              {isWrittenCompleted ? (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Dinilai ({writtenScore ?? '-'})
                </span>
              ) : isExamOpen && !isExamEnded ? (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 shrink-0 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> {isStaffView && isBeforeExam ? 'Simulasi Panitia (Dibuka)' : 'Ujian Dibuka'}
                </span>
              ) : isExamEnded ? (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 shrink-0 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Waktu Berakhir
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200 shrink-0 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> Belum Dibuka
                </span>
              )}
            </div>

            <div className={cn(
              "rounded-xl p-3.5 text-xs space-y-1 border",
              isWrittenCompleted
                ? "bg-emerald-50/60 border-emerald-100 text-emerald-900"
                : isExamOpen && !isExamEnded
                ? "bg-blue-50/60 border-blue-100 text-blue-900"
                : isExamEnded
                ? "bg-rose-50/60 border-rose-100 text-rose-900"
                : "bg-gray-50 border-gray-200 text-gray-600"
            )}>
              <p className="font-bold flex items-center gap-1.5">
                {isWrittenCompleted ? (
                  <><span>🎉</span> Ujian Telah Selesai</>
                ) : isExamOpen && !isExamEnded ? (
                  <><span>📝</span> Petunjuk Ujian Pilihan Ganda (CBT):</>
                ) : isExamEnded ? (
                  <><span>⏱️</span> Waktu Pelaksanaan Ujian Telah Berakhir</>
                ) : (
                  <><span>🔒</span> Ujian Belum Dibuka</>
                )}
              </p>
              <p className="leading-relaxed">
                {isWrittenCompleted
                  ? `Alhamdulillah, Ukhti telah menyelesaikan ujian tulisan pilihan ganda dengan perolehan nilai ${writtenScore ?? '-'}. Nilai otomatis terhubung ke sistem kelulusan.`
                  : isExamOpen && !isExamEnded
                  ? "Ujian tulisan dikerjakan langsung melalui sistem Computer Based Test (CBT) pilihan ganda MTI. Pastikan koneksi internet stabil sebelum memulai pengerjaan."
                  : isExamEnded
                  ? `Waktu pelaksanaan ujian pilihan ganda telah berakhir pada ${activeBatch?.final_exam_end_date ? formatDateIndo(activeBatch.final_exam_end_date) : 'jadwal yang telah ditentukan'}. Jika memiliki kendala, silakan hubungi Musyrifah atau Mu'allimah pembimbing.`
                  : `Ujian pilihan ganda akan dibuka pada ${activeBatch?.final_exam_start_date ? formatDateIndo(activeBatch.final_exam_start_date) : 'jadwal pekan ujian akhir yang ditentukan panitia'}. Silakan persiapkan diri dan muraja'ah materi hafalan Ukhti.`}
              </p>
            </div>

            {/* Tombol Aksi Ujian Tulisan */}
            {isWrittenCompleted ? (
              <Link href="/exam/results?source=final-exam" className="block w-full">
                <Button
                  variant="outline"
                  className="w-full border-emerald-200 text-emerald-800 hover:bg-emerald-50 font-bold py-3 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Lihat Hasil Ujian Tulisan</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            ) : isExamOpen && !isExamEnded ? (
              <Link href="/exam?source=final-exam" className="block w-full">
                <Button
                  className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 rounded-xl shadow-sm text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                >
                  <FileText className="w-4 h-4" />
                  <span>Mulai Ujian Pilihan Ganda</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            ) : (
              <Button
                type="button"
                onClick={() => {
                  if (isExamEnded) {
                    toast.error(
                      activeBatch?.final_exam_end_date
                        ? `Waktu pelaksanaan ujian telah berakhir pada ${formatDateIndo(activeBatch.final_exam_end_date)}.`
                        : 'Waktu pelaksanaan ujian pilihan ganda telah berakhir.'
                    );
                  } else {
                    toast.error(
                      activeBatch?.final_exam_start_date
                        ? `Jadwal ujian belum dibuka. Ujian akan dibuka pada ${formatDateIndo(activeBatch.final_exam_start_date)}.`
                        : 'Jadwal pelaksanaan ujian akhir pilihan ganda belum dibuka oleh panitia.'
                    );
                  }
                }}
                className="w-full bg-gray-100 hover:bg-gray-200/90 text-gray-500 font-bold py-3 rounded-xl border border-gray-200 text-xs sm:text-sm flex items-center justify-center gap-2 cursor-not-allowed transition-all"
              >
                <Lock className="w-4 h-4 text-gray-400" />
                <span>{isExamEnded ? 'Waktu Ujian Telah Berakhir' : 'Ujian Belum Dibuka'}</span>
              </Button>
            )}
          </Card>
        </div>
      )}

      {/* Modal Pemilihan Jadwal Ujian Lisan */}
      <FinalExamSelectionModal 
        isOpen={selectionOpen}
        onClose={() => {
          setSelectionOpen(false);
          fetchRegistrations();
        }}
        examType="oral"
        batchId={activeBatch?.id}
      />
    </div>
  );
}
