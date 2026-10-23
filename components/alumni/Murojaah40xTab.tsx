'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  BookOpen
} from 'lucide-react';
import { MurojaahMethod, MurojaahSegment, Murojaah40xLog, Murojaah40xProgress } from '@/types/database';

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
  
  // Modal states
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRoundDetails, setSelectedRoundDetails] = useState<Murojaah40xLog | null>(null);
  const [isWarriorModalOpen, setIsWarriorModalOpen] = useState(false);
  const [undoing, setUndoing] = useState(false);

  // Form states
  const [selectedMethods, setSelectedMethods] = useState<MurojaahMethod[]>(['pasangan']);
  const [logDate, setLogDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [logNotes, setLogNotes] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/alumni/murojaah-40x');
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
        toast.error(json.error || 'Gagal menyimpan putaran');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan koneksi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUndoLastRound = async () => {
    if (!data?.progress?.id) return;
    const confirmUndo = window.confirm('Apakah Ukhti yakin ingin membatalkan putaran terakhir?');
    if (!confirmUndo) return;

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
    } catch (err) {
      toast.error('Gagal menghubungi server');
    } finally {
      setUndoing(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-800 mx-auto mb-3"></div>
        <p className="text-emerald-800 font-medium text-sm">Memuat Progres Murojaah 40X...</p>
      </div>
    );
  }

  const progress: Murojaah40xProgress = data?.progress;
  const primaryLogs: Murojaah40xLog[] = data?.primary_logs || [];
  const partALogs: Murojaah40xLog[] = data?.part_a_logs || [];
  const warrior = data?.warrior;
  const juzInfo = data?.juz_info;

  const currentLogs = activeSegment === 'primary' ? primaryLogs : partALogs;
  const currentCompletedCount = currentLogs.length;
  const nextRoundNumber = currentCompletedCount + 1;
  const isSegmentCompleted = currentCompletedCount >= 40;
  const percentage = Math.round((currentCompletedCount / 40) * 100);

  // Map rounds 1..40 to existing logs
  const logsMap = new Map<number, Murojaah40xLog>();
  currentLogs.forEach(l => logsMap.set(l.round_number, l));

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. HERO CHALLENGE & BADGE CARD */}
      <Card className="border-0 shadow-xl rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-850 to-teal-950 text-white relative">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute left-0 bottom-0 -translate-x-12 translate-y-12 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl" />
        
        <CardContent className="p-6 sm:p-8 relative z-10 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-emerald-800/80 border border-emerald-500/40 text-emerald-100 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Program Pasca-Kelulusan MTI
                </span>
                <span className="bg-amber-500/20 border border-amber-400/40 text-amber-200 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-400" /> Bebas &gt;1 Putaran/Hari
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Murojaah 40X 1/2 Juz {activeSegment === 'primary' ? `(${juzInfo?.code || '28B'})` : `(${juzInfo?.optional_part_a_code || '28A'})`}
              </h2>
              <p className="text-emerald-100/90 text-sm max-w-xl leading-relaxed">
                Dimulai tepat setelah Pekan Murojaah Batch 2. Selesaikan 40 putaran sebagai <strong>syarat wajib naik juz</strong> berikutnya (dapat dicicil hingga pembukaan Batch 4).
              </p>
            </div>

            {/* Warrior Badge Box */}
            <div className={`p-5 rounded-2xl border backdrop-blur-md flex items-center gap-4 transition-all ${
              warrior?.has_badge 
                ? 'bg-gradient-to-br from-amber-500/25 to-yellow-500/10 border-amber-400/50 shadow-lg shadow-amber-500/10' 
                : 'bg-white/10 border-white/20'
            }`}>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner ${
                warrior?.has_badge ? 'bg-amber-400 text-amber-950 shadow-amber-300' : 'bg-white/20 text-white'
              }`}>
                {warrior?.has_badge ? '🏆' : '🛡️'}
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Tantangan 20 Hari</p>
                <h4 className="text-base font-extrabold text-white">
                  {warrior?.has_badge ? 'Murojaah Warrior' : 'Badge Murojaah Warrior'}
                </h4>
                <p className="text-xs text-emerald-100">
                  {warrior?.has_badge ? (
                    <span className="text-amber-200 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> Telah Diraih! Barakallahu fiik.
                    </span>
                  ) : (
                    <span>
                      Hari ke-{warrior?.days_elapsed || 1} • <span className="text-amber-300 font-bold">Sisa {warrior?.days_remaining || 0} hari lagi</span>
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Progress Bar & Counter */}
          <div className="bg-black/20 backdrop-blur-md rounded-2xl p-5 border border-white/10 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
              <span className="font-semibold text-emerald-200">
                Progres {activeSegment === 'primary' ? 'Juz Utama' : 'Bagian A (Opsional)'}:
              </span>
              <span className="text-sm font-black text-white">
                {currentCompletedCount} / 40 Putaran Selesai ({percentage}%)
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden p-0.5">
              <div 
                className="bg-gradient-to-r from-emerald-400 to-teal-300 h-full rounded-full transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-emerald-200/80">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                {isSegmentCompleted ? 'Alhamdulillah, target 40 putaran telah tuntas!' : `Sisa ${40 - currentCompletedCount} putaran lagi`}
              </span>
              <span className="text-amber-300 font-medium">
                Syarat Naik Juz: Tuntas 40x sebelum pembukaan Batch 4
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. SEGMENT SWITCHER (For Part B Participants) */}
      {juzInfo?.is_part_b && (
        <div className="bg-gray-100 p-1.5 rounded-2xl flex items-center gap-2 max-w-xl">
          <button
            type="button"
            onClick={() => setActiveSegment('primary')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
              activeSegment === 'primary'
                ? 'bg-white text-emerald-900 shadow-md border border-gray-200/60'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <BookOpen className="w-4 h-4 text-emerald-700" />
            <span>Juz Utama ({juzInfo.code})</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeSegment === 'primary' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
            }`}>
              {primaryLogs.length}/40 {primaryLogs.length >= 40 ? '✓' : ''}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSegment('part_a_optional')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
              activeSegment === 'part_a_optional'
                ? 'bg-white text-emerald-900 shadow-md border border-gray-200/60'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Layers className="w-4 h-4 text-emerald-700" />
            <span>Bagian A ({juzInfo.optional_part_a_code}) • Opsional</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeSegment === 'part_a_optional' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
            }`}>
              {partALogs.length}/40 {partALogs.length >= 40 ? '✓' : ''}
            </span>
          </button>
        </div>
      )}

      {/* 3. ACTION BAR & INTRO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
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
            Klik nomor putaran yang telah selesai untuk melihat rincian tanggal dan metode setoran.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {currentCompletedCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              disabled={undoing}
              onClick={handleUndoLastRound}
              className="border-gray-200 text-gray-600 hover:text-rose-600 hover:border-rose-200 rounded-xl text-xs gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Batalkan Terakhir</span>
            </Button>
          )}

          {!isSegmentCompleted && (
            <Button
              onClick={handleOpenLogModal}
              className="bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-800/10 font-bold text-xs sm:text-sm px-4 py-2 gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Catat Putaran ke-{nextRoundNumber}</span>
            </Button>
          )}
        </div>
      </div>

      {/* 4. VISUAL GRID 40 PUTARAN */}
      <Card className="border-0 shadow-lg rounded-3xl bg-white overflow-hidden">
        <CardContent className="p-6 sm:p-8">
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-3">
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
                    className="group relative flex flex-col items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-sm hover:shadow-md hover:scale-105 transition-all text-center"
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
                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-amber-50 border-2 border-amber-400 text-amber-900 shadow-sm hover:bg-amber-100 hover:scale-105 transition-all text-center animate-pulse"
                  >
                    <span className="text-xs font-black text-amber-900">{roundNum}</span>
                    <span className="text-[9px] font-bold text-amber-700 mt-0.5">Input</span>
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

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-8 text-xs font-medium text-gray-550 border-t border-gray-100 mt-8">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-lg bg-emerald-600" />
              <span>Selesai (Klik untuk rincian)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-lg bg-amber-50 border-2 border-amber-400" />
              <span>Putaran Berikutnya</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-lg bg-gray-50 border border-gray-200" />
              <span>Belum Selesai</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. METODE & KETENTUAN MURAJAAH INFO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-md rounded-2xl bg-white p-6 space-y-4">
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

        <Card className="border-0 shadow-md rounded-2xl bg-white p-6 space-y-4">
          <h4 className="font-extrabold text-sm text-gray-900 uppercase tracking-wide flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            Ketentuan Badge &amp; Syarat Naik Juz
          </h4>
          <ul className="space-y-3 text-xs text-gray-600 leading-relaxed">
            <li className="flex gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
              <span>
                <strong>Murojaah Warrior:</strong> Khusus thalibah yang menyelesaikan 40 putaran 1/2 juz dalam <strong>≤ 20 hari</strong> sejak program dibuka.
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
                <strong>Syarat Naik Juz:</strong> Murojaah 40x wajib tuntas sebelum thalibah diizinkan mendaftar ke juz baru di Batch 3 atau Batch 4.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
              <span>
                <strong>Khusus Peserta Bagian B:</strong> Murojaah bagian A disediakan sebagai penguatan opsional dan tidak membatalkan syarat kelulusan juz utama.
              </span>
            </li>
          </ul>
        </Card>
      </div>

      {/* 6. MODAL INPUT PUTARAN */}
      <Dialog open={isLogModalOpen} onOpenChange={setIsLogModalOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-700" />
              Catat Putaran ke-{nextRoundNumber}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Segmen: <strong>{activeSegment === 'primary' ? `Juz Utama (${juzInfo?.code || '28B'})` : `Bagian A (${juzInfo?.optional_part_a_code || '28A'})`}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            {/* Tanggal */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700">Tanggal Penyelesaian</Label>
              <input
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                className="w-full text-xs font-semibold p-2.5 border rounded-xl border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>

            {/* Checkbox Metode */}
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

            {/* Catatan */}
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

      {/* 7. MODAL DETAIL PUTARAN */}
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

      {/* 8. MODAL SELEBRASI WARRIOR */}
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
              MasyaAllah Tabarakallah! Ukhti berhasil menuntaskan 40 putaran 1/2 juz dalam waktu <strong>kurang dari 20 hari</strong>. Badge kehormatan telah resmi disematkan pada profil Ukhti.
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
    </div>
  );
}
