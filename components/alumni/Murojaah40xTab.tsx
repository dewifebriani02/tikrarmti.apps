'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Award, 
  CheckCircle2, 
  Clock, 
  Flame, 
  ShieldCheck, 
  Sparkles, 
  Users, 
  Mic, 
  Compass, 
  Plus, 
  RotateCcw, 
  Info, 
  Calendar,
  Layers,
  ChevronRight,
  BookOpen,
  MessageCircle,
  AlertTriangle,
  RefreshCw,
  Lock,
  LayoutGrid
} from 'lucide-react';
import { MurojaahMethod, MurojaahSegment, Murojaah40xLog, Murojaah40xProgress } from '@/types/database';
import { MurojaahCommunityDirectory } from './MurojaahCommunityDirectory';
import { MurojaahEnrollModal } from './MurojaahEnrollModal';
import { buildMurojaahSelfReminder } from '@/lib/murojaah';

interface Murojaah40xTabProps {
  isAlumni?: boolean;
}

const METHOD_OPTIONS: { id: MurojaahMethod; label: string; desc: string; icon: any }[] = [
  { 
    id: 'pasangan', 
    label: 'Pasangan Tikrar', 
    desc: 'Setoran saling simak bersama partner via Zoom / WA Call / Tatap Muka',
    icon: Users
  },
  { 
    id: 'tarteel', 
    label: 'Tarteel AI', 
    desc: 'Evaluasi mandiri hafalan melalui aplikasi Tarteel',
    icon: Mic
  },
  { 
    id: 'sholat', 
    label: 'Dibaca Saat Sholat', 
    desc: 'Melantunkan hafalan dalam sholat fardhu, dhuha, atau qiyamul lail',
    icon: Compass
  },
  { 
    id: 'aktifitas_lain', 
    label: 'Sambil Aktifitas Lain', 
    desc: 'Murojaah di sela kesibukan (memasak, beres-beres, menyetir, dll)',
    icon: Flame
  }
];

export function Murojaah40xTab({ isAlumni = true }: Murojaah40xTabProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeSegment, setActiveSegment] = useState<MurojaahSegment>('primary');
  const [activeMainTab, setActiveMainTab] = useState<'tracker' | 'komunitas' | 'panduan'>('tracker');
  const [viewMode, setViewMode] = useState<'daily' | 'grid'>('daily');
  
  // Modal states
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRoundDetails, setSelectedRoundDetails] = useState<Murojaah40xLog | null>(null);
  const [isWarriorModalOpen, setIsWarriorModalOpen] = useState(false);
  const [undoing, setUndoing] = useState(false);

  // Form states
  const [selectedMethods, setSelectedMethods] = useState<MurojaahMethod[]>(['pasangan']);
  const [logDate, setLogDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [logNotes, setLogNotes] = useState('');

  const fetchData = useCallback(async (targetJuz?: string) => {
    try {
      setLoading(true);
      const url = targetJuz 
        ? `/api/alumni/murojaah-40x?juz_code=${targetJuz}` 
        : '/api/alumni/murojaah-40x';
      const res = await fetch(url);
      const json = await res.json();
      if (res.ok && json.success) {
        setData(json.data);
      } else {
        toast.error(json.error || 'Gagal memuat progres murojaah');
      }
    } catch (err: any) {
      console.error('Error fetching murojaah 40x data:', err);
      toast.error('Terjadi kesalahan saat mengambil data murojaah');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleMethod = (methodId: MurojaahMethod) => {
    setSelectedMethods(prev => {
      if (prev.includes(methodId)) {
        if (prev.length === 1) {
          toast.error('Pilih minimal 1 metode murojaah');
          return prev;
        }
        return prev.filter(m => m !== methodId);
      } else {
        return [...prev, methodId];
      }
    });
  };

  const handleOpenLogModal = () => {
    if (wajib_murojaah?.is_locked) {
      toast.error(wajib_murojaah.reason || 'Program Murojaah 40x terkunci sebelum Murojaah Wajib Pekan 11 tuntas.');
      return;
    }
    if (data?.warrior?.is_expired) {
      toast.error('Tantangan 20 hari telah berakhir. Silakan re-registrasi porsi untuk memulai siklus baru.');
      setIsEnrollModalOpen(true);
      return;
    }
    setSelectedMethods(['pasangan']);
    setLogDate(new Date().toISOString().split('T')[0]);
    setLogNotes('');
    setIsLogModalOpen(true);
  };

  const handleSaveLog = async () => {
    if (!data?.progress?.id) return;
    if (selectedMethods.length === 0) {
      toast.error('Pilih minimal satu metode murojaah');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/alumni/murojaah-40x', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          progress_id: data.progress.id,
          juz_segment: activeSegment,
          methods: selectedMethods,
          completed_at: logDate,
          notes: logNotes
        })
      });

      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(json.message);
        setIsLogModalOpen(false);
        if (json.data?.warrior_awarded) {
          setIsWarriorModalOpen(true);
        }
        fetchData();
      } else {
        toast.error(json.error || 'Gagal mencatat putaran murojaah');
      }
    } catch (err: any) {
      console.error('Error saving murojaah 40x log:', err);
      toast.error('Terjadi kesalahan saat mencatat putaran');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUndoLastRound = async () => {
    if (!data?.progress?.id) return;
    if (!confirm(`Batalkan pencatatan putaran terakhir untuk ${activeSegment === 'primary' ? 'Juz Utama' : 'Bagian A'}?`)) {
      return;
    }

    try {
      setUndoing(true);
      const res = await fetch(`/api/alumni/murojaah-40x?progress_id=${data.progress.id}&segment=${activeSegment}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(json.message);
        fetchData();
      } else {
        toast.error(json.error || 'Gagal membatalkan putaran');
      }
    } catch (err: any) {
      console.error('Error undoing last round:', err);
      toast.error('Terjadi kesalahan saat membatalkan');
    } finally {
      setUndoing(false);
    }
  };

  const handleSendSelfReminder = () => {
    const userName = data?.progress?.user?.full_name || 'Thalibah MTI';
    const juzCode = data?.juz_info?.code || '30A';
    const currentRound = activeSegment === 'primary' ? (data?.primary_logs?.length || 0) : (data?.part_a_logs?.length || 0);
    const daysRemaining = data?.warrior?.days_remaining || 0;

    const message = buildMurojaahSelfReminder({
      userName,
      juzCode,
      currentRound,
      daysRemaining
    });

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  if (loading && !data) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-10 h-10 border-3 border-green-800 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-gray-500 font-medium">Memuat data Murojaah 40x...</p>
      </div>
    );
  }

  const { progress, primary_logs = [], part_a_logs = [], warrior, juz_info, all_enrolled_juz = [], wajib_murojaah } = data || {};
  const currentLogs: Murojaah40xLog[] = activeSegment === 'primary' ? primary_logs : part_a_logs;
  const currentCompletedCount = currentLogs.length;
  const nextRoundNumber = currentCompletedCount + 1;
  const isSegmentCompleted = currentCompletedCount >= 40;
  const percentage = Math.round((currentCompletedCount / 40) * 100);

  // Map rounds 1..40 to existing logs
  const logsMap = new Map<number, Murojaah40xLog>();
  currentLogs.forEach(l => logsMap.set(l.round_number, l));

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. HERO CHALLENGE & BADGE CARD */}
      <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-gradient-to-br from-green-900 to-green-800 text-white relative">
        <CardContent className="p-5 sm:p-6 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-white/10 backdrop-blur-md border border-white/20 text-green-200 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Program Muraja'ah MTI
                </span>
                <span className="bg-amber-400/20 border border-amber-300/30 text-amber-200 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-400" /> Bebas &gt;1 Putaran/Hari
                </span>
                {progress?.is_free_extension && (
                  <span className="bg-emerald-400/20 border border-emerald-300/40 text-emerald-200 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                    🏆 Free Extension Warrior
                  </span>
                )}
                {progress?.time_slot_main_label && (
                  <span className="bg-white/10 border border-white/20 text-emerald-100 text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {progress.time_slot_main_label}
                  </span>
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Muraja'ah 40x 1/2 Juz {activeSegment === 'primary' ? `(${juz_info?.code || '30A'})` : `(${juz_info?.optional_part_a_code || '30A'})`}
              </h2>
              <p className="text-green-100/90 text-sm max-w-xl leading-relaxed">
                Kunci hafalan mutqin adalah pengulangan. Selesaikan target 40 kali putaran muraja'ah untuk mengokohkan hafalan dan membuka syarat kelulusan naik juz.
              </p>
            </div>

            {/* Warrior Badge Box & Enrollment Trigger */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className={`p-4 sm:p-5 rounded-2xl border flex items-center gap-4 transition-all ${
                warrior?.has_badge 
                  ? 'bg-amber-400/20 border-amber-300/50 shadow-inner' 
                  : 'bg-white/10 backdrop-blur-md border-white/20'
              }`}>
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm ${
                  warrior?.has_badge ? 'bg-amber-400 text-amber-950' : 'bg-white/20 border border-white/30 text-white'
                }`}>
                  {warrior?.has_badge ? '🏆' : '🛡️'}
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-green-200">Tantangan 20 Hari</p>
                  <h4 className="text-base font-extrabold text-white">
                    {warrior?.has_badge ? 'Murojaah Warrior' : 'Badge Murojaah Warrior'}
                  </h4>
                  <p className="text-xs text-green-100/90">
                    {warrior?.has_badge ? (
                      <span className="text-amber-300 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-300" /> Telah Diraih! Barakallahu fiik.
                      </span>
                    ) : warrior?.is_expired ? (
                      <span className="text-rose-300 font-bold">20 Hari Telah Berakhir</span>
                    ) : (
                      <span>
                        Hari ke-{warrior?.days_elapsed || 1} • <span className="text-amber-300 font-bold">Sisa {warrior?.days_remaining || 0} hari lagi</span>
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar & Counter */}
          <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-4 sm:p-5 border border-white/10 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
              <span className="font-semibold text-green-200">
                Progres {activeSegment === 'primary' ? 'Juz Utama' : 'Bagian A (Opsional)'}:
              </span>
              <span className="text-sm font-black text-amber-300">
                {currentCompletedCount} / 40 Putaran Selesai ({percentage}%)
              </span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden p-0.5">
              <div 
                className="bg-gradient-to-r from-amber-400 to-amber-300 h-full rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-green-100/80 pt-1">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-300" />
                {isSegmentCompleted ? 'Alhamdulillah, target 40 putaran telah tuntas!' : `Sisa ${40 - currentCompletedCount} putaran lagi`}
              </span>

              {/* Quick Actions in Hero */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSendSelfReminder}
                  className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white font-bold text-[10px] flex items-center gap-1 transition-all"
                >
                  <MessageCircle className="w-3 h-3 text-emerald-300" />
                  <span>Kirim Reminder WA</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEnrollModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold text-[10px] flex items-center gap-1 transition-all shadow-xs"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Ganti / Tambah Porsi</span>
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* EXPIRED WARNING BANNER */}
      {warrior?.is_expired && !isSegmentCompleted && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs animate-shake">
          <div className="flex items-start gap-2.5 text-rose-950">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold text-rose-900 block">Tantangan 20 Hari Telah Berakhir</span>
              <p className="text-[11px] text-rose-700 mt-0.5">
                Target 40 putaran belum tuntas dalam 20 hari. Ukhti dapat melakukan re-registrasi porsi untuk memulai siklus 20 hari yang baru.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setIsEnrollModalOpen(true)}
            className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shrink-0 shadow-xs"
          >
            Re-Registrasi Siklus Baru
          </Button>
        </div>
      )}

            {/* WAJIB MUROJAAH LOCKED WARNING BANNER */}
      {wajib_murojaah?.is_locked && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm animate-fadeIn">
          <div className="flex items-start gap-3 text-amber-950">
            <div className="w-10 h-10 rounded-xl bg-amber-200/70 border border-amber-300 flex items-center justify-center shrink-0 mt-0.5">
              <Lock className="w-5 h-5 text-amber-900" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-amber-950 text-sm">Murojaah 40x Terkunci Sementara</span>
                <span className="bg-amber-200 text-amber-900 font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                  {wajib_murojaah.wajib_completed}/{wajib_murojaah.wajib_total} Wajib Tuntas
                </span>
              </div>
              <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                Afwan Ukhti, sesuai kurikulum MTI, peserta angkatan berjalan wajib menuntaskan <strong>Murojaah Wajib Pekan 11 (M1 s.d. M7)</strong> di Jurnal Harian terlebih dahulu sebelum membuka porsi Murojaah 40x pasca-kelulusan.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            asChild
            className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shrink-0 shadow-xs"
          >
            <a href="/jurnal-harian">Isi Murojaah Wajib &rarr;</a>
          </Button>
        </div>
      )}

      {/* 2. MAIN 3-TABS NAVIGATION: Tracker vs Komunitas Simak vs Panduan */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2 p-1.5 bg-gray-100 rounded-2xl border border-gray-200/80">
        <button
          type="button"
          onClick={() => setActiveMainTab('tracker')}
          className={`py-2.5 sm:py-3 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
            activeMainTab === 'tracker'
              ? 'bg-white text-emerald-900 shadow-sm border border-gray-200/80'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <BookOpen className="w-4 h-4 text-emerald-700" />
          <span>Tracker 40x</span>
          <span className="hidden sm:inline-block px-2 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] rounded-full font-black">
            {currentCompletedCount}/40
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('komunitas')}
          className={`py-2.5 sm:py-3 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
            activeMainTab === 'komunitas'
              ? 'bg-white text-emerald-900 shadow-sm border border-gray-200/80'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Users className="w-4 h-4 text-emerald-700" />
          <span>Komunitas Simak</span>
          <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-800 text-[9px] rounded-full font-bold">
            7 Slot WIB
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('panduan')}
          className={`py-2.5 sm:py-3 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
            activeMainTab === 'panduan'
              ? 'bg-white text-emerald-900 shadow-sm border border-gray-200/80'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Info className="w-4 h-4 text-emerald-700" />
          <span>Ketentuan &amp; SOP</span>
        </button>
      </div>

      {/* TAB 1: TRACKER 40 PUTARAN */}
      {activeMainTab === 'tracker' && (
        <div className="space-y-6">
          {/* Segment Switcher (For Part B Participants) */}
          {juz_info?.is_part_b && (
            <div className="bg-gray-100 p-1.5 rounded-2xl flex items-center gap-2 max-w-xl">
              <button
                type="button"
                onClick={() => setActiveSegment('primary')}
                className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
                  activeSegment === 'primary'
                    ? 'bg-white text-emerald-900 shadow-md border border-gray-200/60'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <BookOpen className="w-4 h-4 text-emerald-700" />
                <span>Juz Utama ({juz_info.code})</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  activeSegment === 'primary' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
                }`}>
                  {primary_logs.length}/40 {primary_logs.length >= 40 ? '✓' : ''}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSegment('part_a_optional')}
                className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
                  activeSegment === 'part_a_optional'
                    ? 'bg-white text-emerald-900 shadow-md border border-gray-200/60'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Layers className="w-4 h-4 text-emerald-700" />
                <span>Bagian A ({juz_info.optional_part_a_code}) • Opsional</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  activeSegment === 'part_a_optional' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
                }`}>
                  {part_a_logs.length}/40 {part_a_logs.length >= 40 ? '✓' : ''}
                </span>
              </button>
            </div>
          )}

          {/* Action Bar & Input Button */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
            <div className="space-y-1">
              <h3 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
                <span>Rekap Putaran {activeSegment === 'primary' ? 'Juz Utama' : 'Bagian A'}</span>
                {activeSegment === 'primary' && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">
                    Syarat Naik Juz
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-500">
                Format 20 Hari dengan 2 kolom per hari (Target: 2 putaran/hari = 40 putaran).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* View Mode Switcher */}
              <div className="flex items-center bg-gray-100/90 p-1 rounded-xl border border-gray-200/60">
                <button
                  type="button"
                  onClick={() => setViewMode('daily')}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                    viewMode === 'daily'
                      ? "bg-white text-emerald-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-900"
                  )}
                >
                  <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Per Hari (2 Kolom)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                    viewMode === 'grid'
                      ? "bg-white text-emerald-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-900"
                  )}
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Grid 40</span>
                </button>
              </div>

              {currentCompletedCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={undoing}
                  onClick={handleUndoLastRound}
                  className="border-gray-200 text-gray-600 hover:text-rose-600 hover:border-rose-200 rounded-xl text-xs gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Batalkan Terakhir</span>
                </Button>
              )}

              {!isSegmentCompleted && (
                <Button
                  onClick={handleOpenLogModal}
                  disabled={wajib_murojaah?.is_locked}
                  className={cn(
                    "rounded-xl shadow-md font-bold text-xs sm:text-sm px-4 py-2 gap-1.5 transition-all",
                    wajib_murojaah?.is_locked
                      ? "bg-gray-200 text-gray-500 cursor-not-allowed shadow-none"
                      : "bg-emerald-800 hover:bg-emerald-700 text-white shadow-emerald-800/10"
                  )}
                >
                  {wajib_murojaah?.is_locked ? (
                    <>
                      <Lock className="w-4 h-4 text-gray-500" />
                      <span>Terkunci (Selesaikan Wajib)</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Catat Putaran ke-{nextRoundNumber}</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Konten Murojaah: Tampilan Per Hari (2 Kolom) atau Grid 40 Putaran */}
          <Card className="border border-gray-100 shadow-sm rounded-2xl bg-white overflow-hidden">
            <CardContent className="p-4 sm:p-6 space-y-6">
              {viewMode === 'daily' ? (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <div>
                      <h4 className="text-xs sm:text-sm font-extrabold text-gray-900 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-emerald-700" />
                        Jadwal Muroja'ah Per Hari
                      </h4>
                      <p className="text-[11px] text-gray-500">
                        Setiap hari terdapat 2 kolom putaran yang harus diisi.
                      </p>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 rounded-full">
                      {currentCompletedCount} / 40 Selesai
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {Array.from({ length: 20 }, (_, idx) => {
                      const dayIndex = idx + 1;
                      const round1Num = (dayIndex - 1) * 2 + 1;
                      const round2Num = (dayIndex - 1) * 2 + 2;
                      const log1 = logsMap.get(round1Num);
                      const log2 = logsMap.get(round2Num);
                      const completedCount = (log1 ? 1 : 0) + (log2 ? 1 : 0);
                      const isCurrentDay = (round1Num === nextRoundNumber || round2Num === nextRoundNumber) && !isSegmentCompleted;

                      const renderRoundSlot = (roundNum: number, slotIndex: 1 | 2) => {
                        const log = logsMap.get(roundNum);
                        const isCompleted = !!log;
                        const isNext = roundNum === nextRoundNumber && !isSegmentCompleted;

                        if (isCompleted) {
                          return (
                            <button
                              key={roundNum}
                              type="button"
                              onClick={() => setSelectedRoundDetails(log)}
                              className="group relative w-full text-left p-3 sm:p-3.5 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-sm hover:shadow-md hover:scale-[1.01] transition-all cursor-pointer border border-emerald-500/50 flex flex-col justify-between gap-2.5"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs sm:text-sm font-black tracking-tight">Putaran {roundNum}</span>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-800/70 px-2 py-0.5 rounded text-emerald-100">
                                  Kolom {slotIndex}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-emerald-500/40">
                                <span className="text-emerald-100/90 font-medium flex items-center gap-1 text-[11px]">
                                  <Calendar className="w-3 h-3 text-emerald-200" />
                                  {new Date(log.completed_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                </span>
                                <span className="text-[10px] font-semibold text-emerald-200 group-hover:underline">
                                  Detail &rarr;
                                </span>
                              </div>
                            </button>
                          );
                        }

                        if (isNext) {
                          if (wajib_murojaah?.is_locked) {
                            return (
                              <div
                                key={roundNum}
                                className="w-full text-left p-3 sm:p-3.5 rounded-xl bg-gray-100 border border-gray-200 text-gray-500 flex flex-col justify-between gap-2 select-none"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <Lock className="w-3.5 h-3.5 text-gray-400" />
                                    <span className="text-xs sm:text-sm font-bold text-gray-600">Putaran {roundNum}</span>
                                  </div>
                                  <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-200 px-2 py-0.5 rounded text-gray-600">
                                    Kolom {slotIndex}
                                  </span>
                                </div>
                                <p className="text-[11px] text-gray-400 font-medium">Terkunci (Selesaikan Wajib)</p>
                              </div>
                            );
                          }

                          return (
                            <button
                              key={roundNum}
                              type="button"
                              onClick={handleOpenLogModal}
                              className="w-full text-left p-3 sm:p-3.5 rounded-xl bg-amber-50/90 border-2 border-amber-400 text-amber-950 shadow-sm hover:bg-amber-100 hover:border-amber-500 hover:scale-[1.01] transition-all cursor-pointer animate-pulse flex flex-col justify-between gap-2.5"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs sm:text-sm font-black text-amber-900 tracking-tight">Putaran {roundNum}</span>
                                  <span className="bg-amber-200/90 text-amber-900 text-[10px] font-black px-1.5 py-0.5 rounded">
                                    Siap Diisi
                                  </span>
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-200/70 px-2 py-0.5 rounded text-amber-900">
                                  Kolom {slotIndex}
                                </span>
                              </div>

                              <div className="flex items-center justify-between pt-1.5 border-t border-amber-200/60 text-xs font-bold text-amber-800">
                                <span className="flex items-center gap-1">
                                  <Plus className="w-3.5 h-3.5 text-amber-700" />
                                  Catat Sekarang
                                </span>
                                <span className="text-[10px] font-semibold text-amber-600">&rarr;</span>
                              </div>
                            </button>
                          );
                        }

                        return (
                          <div
                            key={roundNum}
                            className="w-full text-left p-3 sm:p-3.5 rounded-xl bg-gray-50/80 border border-gray-100 text-gray-400 flex flex-col justify-between gap-2.5 select-none"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs sm:text-sm font-semibold text-gray-400">Putaran {roundNum}</span>
                              <span className="text-[10px] font-medium uppercase tracking-wider bg-gray-100 px-2 py-0.5 rounded text-gray-400">
                                Kolom {slotIndex}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-400 font-normal">Belum diisi</p>
                          </div>
                        );
                      };

                      return (
                        <div
                          key={dayIndex}
                          className={cn(
                            "p-3.5 sm:p-4 rounded-2xl border transition-all",
                            isCurrentDay
                              ? "bg-amber-50/25 border-amber-300 ring-2 ring-amber-300/40 shadow-sm"
                              : completedCount === 2
                              ? "bg-white border-emerald-100 shadow-sm"
                              : "bg-white border-gray-100 shadow-sm"
                          )}
                        >
                          {/* Day Header */}
                          <div className="flex items-center justify-between pb-2.5 border-b border-gray-100 mb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-xs sm:text-sm text-gray-900">
                                Hari ke-{dayIndex}
                              </span>
                              <span className="text-[11px] text-gray-400 font-medium hidden sm:inline">
                                (Target: 2 Putaran)
                              </span>
                              {isCurrentDay && (
                                <span className="text-[10px] bg-amber-100 text-amber-900 font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Sparkles className="w-3 h-3 text-amber-600" /> Hari Berjalan
                                </span>
                              )}
                            </div>

                            {completedCount === 2 ? (
                              <span className="text-[10px] sm:text-[11px] bg-emerald-100 text-emerald-800 font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> 2/2 Selesai
                              </span>
                            ) : completedCount === 1 ? (
                              <span className="text-[10px] sm:text-[11px] bg-amber-100 text-amber-800 font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-600" /> 1/2 Selesai
                              </span>
                            ) : (
                              <span className="text-[10px] sm:text-[11px] bg-gray-100 text-gray-500 font-bold px-2.5 py-0.5 rounded-full">
                                0/2 Putaran
                              </span>
                            )}
                          </div>

                          {/* 2 Kolom Input: Kolom 1 & Kolom 2 */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                            {renderRoundSlot(round1Num, 1)}
                            {renderRoundSlot(round2Num, 2)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Visual Grid 40 Putaran */
                <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 sm:gap-2.5">
                  {Array.from({ length: 40 }, (_, idx) => {
                    const roundNum = idx + 1;
                    const log = logsMap.get(roundNum);
                    const isCompleted = !!log;
                    const isNext = roundNum === nextRoundNumber && !isSegmentCompleted;

                    if (isCompleted) {
                      return (
                        <button
                          key={roundNum}
                          type="button"
                          onClick={() => setSelectedRoundDetails(log)}
                          className="group relative flex flex-col items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-sm hover:shadow-md hover:scale-105 transition-all text-center cursor-pointer"
                        >
                          <div className="flex items-center gap-0.5 text-xs font-black">
                            <span>{roundNum}</span>
                            <CheckCircle2 className="w-3 h-3 text-emerald-200" />
                          </div>
                          <span className="text-[8px] opacity-80 mt-1 line-clamp-1">
                            {new Date(log.completed_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                          </span>
                        </button>
                      );
                    }

                    if (isNext) {
                      return (
                        <button
                          key={roundNum}
                          type="button"
                          onClick={handleOpenLogModal}
                          className={cn(
                            "flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all text-center",
                            wajib_murojaah?.is_locked
                              ? "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed"
                              : "bg-amber-50 border-amber-400 text-amber-900 shadow-sm hover:bg-amber-100 hover:scale-105 animate-pulse cursor-pointer"
                          )}
                        >
                          {wajib_murojaah?.is_locked ? (
                            <>
                              <Lock className="w-3.5 h-3.5 text-gray-400" />
                              <span className="text-[8px] font-bold text-gray-500 mt-0.5">Kunci</span>
                            </>
                          ) : (
                            <>
                              <span className="text-xs font-black text-amber-900">{roundNum}</span>
                              <span className="text-[9px] font-bold text-amber-700 mt-0.5">Input</span>
                            </>
                          )}
                        </button>
                      );
                    }

                    return (
                      <div
                        key={roundNum}
                        className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gray-50 border border-gray-100 text-gray-400 text-center select-none"
                      >
                        <span className="text-xs font-semibold">{roundNum}</span>
                        <span className="text-[8px] text-gray-300 mt-1">-</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Legend */}
              <div className="flex flex-wrap items-center justify-center gap-6 pt-6 text-xs font-medium text-gray-500 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-lg bg-emerald-600" />
                  <span>Selesai (Klik untuk rincian)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-lg bg-amber-50 border-2 border-amber-400" />
                  <span>Siap Diisi (Klik untuk catat)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-lg bg-gray-50 border border-gray-200" />
                  <span>Belum Terbuka</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: KOMUNITAS PASANGAN SIMAK (7 SLOT WIB) */}
      {activeMainTab === 'komunitas' && (
        <MurojaahCommunityDirectory 
          myProfile={{
            full_name: progress?.user?.full_name,
            juz_code: juz_info?.code,
            time_slot_main: progress?.time_slot_main,
            time_slot_main_label: progress?.time_slot_main_label
          }}
          onOpenEnrollModal={() => setIsEnrollModalOpen(true)}
        />
      )}

      {/* TAB 3: PANDUAN & KETENTUAN */}
      {activeMainTab === 'panduan' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-0 shadow-sm rounded-2xl bg-white p-6 space-y-4">
            <h4 className="font-extrabold text-sm text-gray-900 uppercase tracking-wide flex items-center gap-2">
              <Flame className="w-4 h-4 text-emerald-800" />
              4 Opsi Metode Murojaah 1/2 Juz
            </h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              Ukhti dapat memilih kombinasi metode sesuai kelonggaran waktu dan sarana yang tersedia:
            </p>
            <div className="space-y-3">
              {METHOD_OPTIONS.map(m => (
                <div key={m.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                    <m.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-800">{m.label}</h5>
                    <p className="text-gray-500 mt-0.5 leading-normal">{m.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border-0 shadow-sm rounded-2xl bg-white p-6 space-y-4">
            <h4 className="font-extrabold text-sm text-gray-900 uppercase tracking-wide flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              Ketentuan Badge &amp; Syarat Naik Juz
            </h4>
            <ul className="space-y-3 text-xs text-gray-600 leading-relaxed">
              <li className="flex gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                <span>
                  <strong>Murojaah Warrior:</strong> Khusus thalibah yang menyelesaikan 40 putaran 1/2 juz dalam <strong>≤ 20 hari</strong> sejak porsi diaktifkan.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                <span>
                  <strong>Fleksibilitas Harian:</strong> Ukhti diperbolehkan mengisi lebih dari 1 putaran per hari (misal 2 putaran/hari) agar target 20 hari tercapai.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                <span>
                  <strong>Bebas Biaya Porsi Berikutnya:</strong> Peserta yang menyelesaikan 40x dalam tempo ≤ 20 hari berhak langsung melanjutkan ke porsi/juz berikutnya secara <strong>100% Bebas Biaya (Gratis)</strong>.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                <span>
                  <strong>Syarat Wajib Naik Juz:</strong> Murojaah 40x wajib tuntas sebelum thalibah diizinkan mendaftar ke juz baru di Batch 3 atau Batch 4.
                </span>
              </li>
            </ul>
          </Card>
        </div>
      )}

      {/* MODAL INPUT PUTARAN */}
      <Dialog open={isLogModalOpen} onOpenChange={setIsLogModalOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-700" />
              Catat Putaran ke-{nextRoundNumber}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Segmen: <strong>{activeSegment === 'primary' ? `Juz Utama (${juz_info?.code || '30A'})` : `Bagian A (${juz_info?.optional_part_a_code || '30A'})`}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700">Tanggal Penyelesaian</Label>
              <input
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                className="w-full text-xs font-semibold p-2.5 border rounded-xl border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-700">
                Metode yang Digunakan <span className="text-rose-500">*</span>
              </Label>
              <div className="space-y-2">
                {METHOD_OPTIONS.map(m => {
                  const isChecked = selectedMethods.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleMethod(m.id)}
                      className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                        isChecked 
                          ? 'border-emerald-600 bg-emerald-50/50 shadow-sm' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isChecked ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500'
                        }`}>
                          <m.icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className={`text-xs font-bold ${isChecked ? 'text-emerald-900' : 'text-gray-800'}`}>
                            {m.label}
                          </div>
                          <div className="text-[10px] text-gray-500 line-clamp-1">
                            {m.desc}
                          </div>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                        isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-300 bg-white'
                      }`}>
                        {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700">Catatan Tambahan (Opsional)</Label>
              <Textarea
                placeholder="Misal: Selesai disimak partner ukhti Aisyah / dibaca saat qiyamul lail..."
                rows={2}
                value={logNotes}
                onChange={(e) => setLogNotes(e.target.value)}
                className="text-xs rounded-xl border-gray-200"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsLogModalOpen(false)}
              className="rounded-xl text-xs text-gray-500"
            >
              Batal
            </Button>
            <Button
              type="button"
              disabled={submitting}
              onClick={handleSaveLog}
              className="bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold px-5"
            >
              {submitting ? 'Menyimpan...' : `Simpan Putaran ke-${nextRoundNumber}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DETAIL PUTARAN */}
      <Dialog open={!!selectedRoundDetails} onOpenChange={(open) => !open && setSelectedRoundDetails(null)}>
        <DialogContent className="max-w-sm rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Putaran ke-{selectedRoundDetails?.round_number}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Segmen: {selectedRoundDetails?.juz_segment === 'primary' ? 'Juz Utama' : 'Bagian A (Opsional)'}
            </DialogDescription>
          </DialogHeader>

          {selectedRoundDetails && (
            <div className="space-y-4 my-2 text-xs">
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center justify-between">
                <span className="text-gray-500">Tanggal Selesai:</span>
                <span className="font-bold text-gray-800">
                  {new Date(selectedRoundDetails.completed_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
              </div>

              <div className="space-y-1.5">
                <span className="font-bold text-gray-700">Metode yang Digunakan:</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedRoundDetails.methods.map((m) => {
                    const found = METHOD_OPTIONS.find(opt => opt.id === m);
                    return (
                      <span key={m} className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[11px]">
                        {found?.label || m}
                      </span>
                    );
                  })}
                </div>
              </div>

              {selectedRoundDetails.notes && (
                <div className="space-y-1">
                  <span className="font-bold text-gray-700">Catatan:</span>
                  <p className="p-3 bg-gray-50 rounded-xl text-gray-600 italic">
                    "{selectedRoundDetails.notes}"
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              onClick={() => setSelectedRoundDetails(null)}
              className="w-full bg-gray-900 text-white rounded-xl text-xs"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL SELEBRASI WARRIOR */}
      <Dialog open={isWarriorModalOpen} onOpenChange={setIsWarriorModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 text-center space-y-4">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 to-yellow-500 text-amber-950 flex items-center justify-center text-4xl mx-auto shadow-xl shadow-amber-500/20 animate-bounce">
            🏆
          </div>

          <div className="space-y-2">
            <span className="bg-amber-100 text-amber-900 font-extrabold text-xs px-3 py-1 rounded-full uppercase tracking-wider">
              Pencapaian Luar Biasa!
            </span>
            <h3 className="text-2xl font-black text-gray-900">
              Selamat, Ukhti adalah Murojaah Warrior!
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed max-w-sm mx-auto">
              MasyaAllah Tabarakallah! Ukhti berhasil menuntaskan 40 putaran 1/2 juz dalam waktu <strong>kurang dari 20 hari</strong>. Ukhti kini berhak melanjutkan ke porsi berikutnya secara <strong>Bebas Biaya</strong>!
            </p>
          </div>

          <Button
            onClick={() => setIsWarriorModalOpen(false)}
            className="w-full bg-gradient-to-r from-emerald-800 to-teal-700 hover:from-emerald-700 hover:to-teal-600 text-white rounded-xl font-bold text-sm py-5 shadow-lg"
          >
            Alhamdulillah, Terima Kasih!
          </Button>
        </DialogContent>
      </Dialog>

      {/* MODAL ENROLLMENT / GANTI PORSI */}
      <MurojaahEnrollModal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        onSuccess={() => fetchData()}
        currentJuzCode={juz_info?.code || '30A'}
        isFreeEligible={true}
        isFreeExtension={warrior?.free_extension_unlocked || false}
      />
    </div>
  );
}
