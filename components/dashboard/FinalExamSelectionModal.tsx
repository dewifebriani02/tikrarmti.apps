'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, Users, GraduationCap, Loader2, CheckCircle2, AlertCircle, Award, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDateWithDayIndo } from '@/lib/utils/date-helpers';

interface Schedule {
  id: string;
  exam_type: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  examiner_id: string;
  max_quota: number;
  current_count: number;
  location_link: string;
  status: string;
  examiner?: { full_name: string };
}

const formatExaminerName = (name?: string) => {
  if (!name) return 'TBA';
  const cleanName = name.trim();
  const lower = cleanName.toLowerCase();
  if (
    lower.startsWith('ustadzah') || 
    lower.startsWith('ustd') || 
    lower.startsWith('ustz') || 
    lower.startsWith('ust.') ||
    lower.startsWith('ustz.') ||
    lower.startsWith('ustd.') ||
    lower.startsWith('ustad ') ||
    lower.startsWith('ustadz ')
  ) {
    return cleanName;
  }
  return `Ustadzah ${cleanName}`;
};

interface FinalExamSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  examType: 'oral' | 'written';
  batchId?: string;
}

export function FinalExamSelectionModal({ isOpen, onClose, examType, batchId }: FinalExamSelectionModalProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingRegistration, setExistingRegistration] = useState<any>(null);
  const [scheduleToConfirm, setScheduleToConfirm] = useState<Schedule | null>(null);

  useEffect(() => {
    if (isOpen) {
      setScheduleToConfirm(null);
      fetchSchedules();
      fetchExistingRegistration();
    }
  }, [isOpen, examType, batchId]);

  const fetchSchedules = async () => {
    setIsLoading(true);
    try {
      const url = `/api/exams/final-exams/schedules?type=${examType}${batchId ? `&batch_id=${batchId}` : ''}`;
      const response = await fetch(url);
      const result = await response.json();
      if (result.success) {
        setSchedules(result.data || []);
      }
    } catch (error) {
      console.error('Fetch schedules error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchExistingRegistration = async () => {
    try {
      const url = `/api/exams/final-exams/registrations?type=${examType}${batchId ? `&batch_id=${batchId}` : ''}`;
      const response = await fetch(url);
      const result = await response.json();
      if (result.success) {
        setExistingRegistration(result.data);
      }
    } catch (error) {
      console.error('Fetch registration error:', error);
    }
  };

  const handleRegister = async (scheduleId: string) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/exams/final-exams/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule_id: scheduleId })
      });
      const result = await response.json();
      if (result.success) {
        toast.success(existingRegistration ? 'Jadwal ujian berhasil dipindahkan!' : 'Pendaftaran jadwal berhasil!');
        await fetchExistingRegistration();
        await fetchSchedules();
        onClose();
      } else {
        toast.error(result.error || 'Gagal mendaftar');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan server');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:w-full sm:max-w-2xl max-h-[88vh] flex flex-col rounded-2xl sm:rounded-3xl border border-gray-100 shadow-2xl p-0 overflow-hidden relative bg-white [&>button]:text-white [&>button]:hover:text-white/80 [&>button]:top-4 [&>button]:right-4">
        {/* Header */}
        <DialogHeader className="bg-gradient-to-br from-green-700 via-emerald-700 to-green-800 text-white p-4 sm:p-5 shrink-0 text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                {examType === 'oral' ? 'Jadwal Ujian Lisan' : 'Jadwal Ujian Tulisan'}
              </DialogTitle>
              <DialogDescription className="text-green-100/90 text-xs font-medium mt-0.5">
                {existingRegistration?.status === 'registered'
                  ? 'Pilih salah satu jadwal di bawah jika Ukhti ingin mengubah atau memindahkan jadwal ujian.'
                  : 'Pilih salah satu jadwal ujian yang tersedia sesuai dengan waktu luang Ukhti.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 min-h-0 bg-gray-50/50 space-y-3">
          {existingRegistration?.status === 'graded' ? (
            /* Jika ujian sudah selesai dan dinilai */
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-inner border bg-amber-100 text-amber-600 border-amber-200">
                <Award className="w-8 h-8" />
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-gray-900">Hasil Ujian Keluar!</h3>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">
                    {examType === 'oral' ? 'Ujian Lisan' : 'Ujian Tulisan'}
                  </p>
                </div>

                <div className="bg-white rounded-2xl border border-amber-100 p-5 space-y-3 shadow-sm">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Nilai Akhir</p>
                    <p className="text-4xl font-black text-gray-900">{existingRegistration.score ?? existingRegistration.score_lisan ?? '-'}</p>
                  </div>
                  {existingRegistration.feedback && (
                    <div className="bg-amber-50/60 rounded-xl p-3.5 text-left border border-amber-100">
                      <p className="text-[10px] font-bold text-amber-800 uppercase mb-1 flex items-center gap-1.5">
                        <MessageSquare className="w-3 h-3" />
                        Feedback Penguji
                      </p>
                      <p className="text-xs text-amber-900 italic leading-relaxed">"{existingRegistration.feedback}"</p>
                    </div>
                  )}
                </div>
              </div>
              <Button onClick={onClose} variant="outline" className="rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50 text-xs">
                Tutup
              </Button>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 text-green-700 animate-spin" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Memuat Jadwal...</p>
            </div>
          ) : (
            <>
              {/* Banner Jadwal Terdaftar Saat Ini (jika ada) */}
              {existingRegistration?.status === 'registered' && existingRegistration.schedule && (
                <div className="p-3 sm:p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Jadwal Ukhti Saat Ini
                    </span>
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                      Terdaftar
                    </span>
                  </div>
                  <div className="text-xs text-emerald-950 font-bold flex flex-wrap gap-x-3 gap-y-0.5">
                    <span>📅 {formatDateWithDayIndo(existingRegistration.schedule.exam_date)}</span>
                    <span>⏰ {existingRegistration.schedule.start_time?.slice(0, 5)} - {existingRegistration.schedule.end_time?.slice(0, 5)} WIB</span>
                    <span>👤 {formatExaminerName(existingRegistration.schedule.examiner?.full_name)}</span>
                  </div>
                </div>
              )}

              {/* List Jadwal Tersedia */}
              {schedules.length > 0 ? (
                <div className="space-y-2.5">
                  {schedules.map((schedule) => {
                    const isRegisteredThis = existingRegistration?.schedule_id === schedule.id;
                    const isFull = schedule.current_count >= schedule.max_quota;

                    return (
                      <Card
                        key={schedule.id}
                        className={cn(
                          "rounded-xl border transition-all overflow-hidden",
                          isRegisteredThis
                            ? "bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-300 shadow-sm"
                            : isFull
                            ? "bg-gray-50 border-gray-100 opacity-60"
                            : "bg-white border-gray-200 hover:border-green-300 shadow-xs hover:shadow-sm"
                        )}
                      >
                        <CardContent className="p-3.5 sm:p-4">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-gray-900 font-bold text-xs sm:text-sm">
                                <Calendar className="w-3.5 h-3.5 text-green-700 shrink-0" />
                                <span>{formatDateWithDayIndo(schedule.exam_date)}</span>
                                {isRegisteredThis && (
                                  <span className="text-[9px] font-extrabold uppercase bg-emerald-600 text-white px-1.5 py-0.5 rounded">
                                    Aktif
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-medium text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-gray-400" />
                                  <span>{schedule.start_time?.slice(0, 5)} - {schedule.end_time?.slice(0, 5)} WIB</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Users className="w-3 h-3 text-gray-400" />
                                  <span>Sisa Kuota: <strong className={cn(isFull ? "text-rose-600" : "text-gray-700")}>{Math.max(0, schedule.max_quota - schedule.current_count)}</strong></span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800">
                                <GraduationCap className="w-3 h-3 shrink-0" />
                                <span>Penguji: {formatExaminerName(schedule.examiner?.full_name)}</span>
                              </div>
                            </div>

                            <div className="shrink-0 w-full sm:w-auto">
                              {isRegisteredThis ? (
                                <Button
                                  disabled
                                  size="sm"
                                  className="w-full sm:w-auto rounded-xl font-bold bg-emerald-100 text-emerald-800 text-xs py-2 px-4 border border-emerald-200 cursor-default"
                                >
                                  Jadwal Saat Ini
                                </Button>
                              ) : (
                                <Button
                                  disabled={isFull || isSubmitting}
                                  size="sm"
                                  onClick={() => setScheduleToConfirm(schedule)}
                                  className={cn(
                                    "w-full sm:w-auto rounded-xl font-bold text-xs py-2 px-4 shadow-sm transition-all",
                                    isFull
                                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                      : "bg-green-700 hover:bg-green-800 text-white shadow-green-700/20 active:scale-95"
                                  )}
                                >
                                  {isFull
                                    ? 'Penuh'
                                    : existingRegistration
                                    ? 'Pindah ke Sini'
                                    : 'Pilih Jadwal'}
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 space-y-3">
                  <AlertCircle className="w-10 h-10 mx-auto text-gray-300" />
                  <p className="text-gray-500 font-bold text-xs">
                    Maaf Ukhti, saat ini belum ada jadwal tersedia untuk {examType === 'oral' ? 'Ujian Lisan' : 'Ujian Tulisan'}.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Konfirmasi Pemilihan/Pemindahan Jadwal */}
        {scheduleToConfirm && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl p-4 sm:p-5 max-w-sm w-full shadow-2xl border border-gray-100 space-y-3.5 max-h-[90%] overflow-y-auto">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-xs border border-amber-200/60">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-gray-900 leading-tight">
                    {existingRegistration ? 'Konfirmasi Pindah Jadwal' : 'Konfirmasi Pilihan Jadwal'}
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-0.5 font-medium">
                    {existingRegistration
                      ? 'Apakah Ukhti yakin ingin memindahkan jadwal ujian ke sesi ini?'
                      : 'Apakah Ukhti yakin memilih jadwal ujian ini?'}
                  </p>
                </div>
              </div>

              <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3 space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-gray-900">
                  <Calendar className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>{formatDateWithDayIndo(scheduleToConfirm.exam_date)}</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium text-gray-700">
                  <Clock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>{scheduleToConfirm.start_time?.slice(0, 5)} - {scheduleToConfirm.end_time?.slice(0, 5)} WIB</span>
                </div>
                <div className="flex items-center gap-1.5 font-semibold text-emerald-900">
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>Penguji: {formatExaminerName(scheduleToConfirm.examiner?.full_name)}</span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 text-[11px] text-amber-900 space-y-0.5">
                <p className="font-extrabold flex items-center gap-1 text-amber-800">
                  <span>⚠️</span> Kuota Sesi Terbatas
                </p>
                <p className="leading-relaxed text-amber-900/90 font-medium">
                  Pastikan Ukhti benar-benar bisa hadir pada waktu tersebut.
                </p>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={() => setScheduleToConfirm(null)}
                  className="flex-1 rounded-xl border-gray-200 text-gray-700 font-bold hover:bg-gray-50 text-xs py-2"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={async () => {
                    await handleRegister(scheduleToConfirm.id);
                    setScheduleToConfirm(null);
                  }}
                  className="flex-1 rounded-xl bg-green-700 hover:bg-green-800 text-white font-bold text-xs py-2 shadow-sm shadow-green-700/20"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </div>
                  ) : existingRegistration ? (
                    'Ya, Pindahkan'
                  ) : (
                    'Ya, Pilih Jadwal'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
