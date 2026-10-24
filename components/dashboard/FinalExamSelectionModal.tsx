'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, Users, GraduationCap, Loader2, CheckCircle2, AlertCircle, Award, MessageSquare } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

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

  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsEditing(false);
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
        setSchedules(result.data);
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
        toast.success('Pendaftaran berhasil!');
        fetchExistingRegistration();
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
      <DialogContent className="max-w-2xl rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="bg-gradient-to-br from-green-600 to-emerald-700 text-white p-8">
          <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
            <GraduationCap className="w-8 h-8" />
            {examType === 'oral' ? 'Jadwal Ujian Lisan' : 'Jadwal Ujian Tulisan'}
          </DialogTitle>
          <DialogDescription className="text-green-100 font-medium">
            Pilih salah satu jadwal ujian yang tersedia sesuai dengan waktu luang Ukhti.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 max-h-[60vh] overflow-y-auto bg-gray-50/50">
          {existingRegistration && !isEditing ? (
            <div className="text-center space-y-4 py-6">
              <div className={cn(
                "w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-inner border animate-bounce-slow",
                existingRegistration.status === 'graded' ? "bg-amber-100 text-amber-600 border-amber-200" : "bg-emerald-100 text-emerald-600 border-emerald-200"
              )}>
                {existingRegistration.status === 'graded' ? <Award className="w-10 h-10" /> : <CheckCircle2 className="w-10 h-10" />}
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-gray-900">
                    {existingRegistration.status === 'graded' ? 'Hasil Ujian Keluar!' : 'Ukhti Sudah Terdaftar'}
                  </h3>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">
                    {examType === 'oral' ? 'Ujian Lisan' : 'Ujian Tulisan'}
                  </p>
                </div>

                {existingRegistration.status === 'graded' ? (
                  <div className="bg-white rounded-[2rem] border-2 border-amber-100 p-6 space-y-4 shadow-xl shadow-amber-900/5">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em]">Nilai Akhir</p>
                      <p className="text-5xl font-black text-gray-900">{existingRegistration.score_lisan}</p>
                    </div>
                    {existingRegistration.feedback && (
                      <div className="bg-amber-50/50 rounded-2xl p-4 text-left border border-amber-100">
                        <p className="text-[10px] font-bold text-amber-800 uppercase mb-2 flex items-center gap-2">
                           <MessageSquare className="w-3 h-3" />
                           Feedback Penguji
                        </p>
                        <p className="text-sm text-amber-900 italic leading-relaxed">"{existingRegistration.feedback}"</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-600 font-medium bg-white rounded-2xl p-4 border border-gray-100">
                    <p>Jadwal: <span className="text-gray-900 font-bold">{new Intl.DateTimeFormat('id-ID', { dateStyle: 'full', timeZone: 'Asia/Jakarta' }).format(new Date(existingRegistration.schedule.exam_date))}</span></p>
                    <p>Waktu: <span className="text-gray-900 font-bold">{existingRegistration.schedule.start_time} - {existingRegistration.schedule.end_time} WIB</span></p>
                    <p>Penguji: <span className="text-gray-900 font-bold">{formatExaminerName(existingRegistration.schedule.examiner?.full_name)}</span></p>
                  </div>
                )}
              </div>
              <div className="flex justify-center gap-3">
                {existingRegistration.status === 'registered' && (
                  <Button 
                    onClick={() => setIsEditing(true)} 
                    className="rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-5 shadow-lg shadow-green-600/20 active:translate-y-1"
                  >
                    Ubah Jadwal
                  </Button>
                )}
                <Button onClick={onClose} variant="outline" className="rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50">Tutup</Button>
              </div>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-10 h-10 text-green-600 animate-spin" />
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Memuat Jadwal...</p>
            </div>
          ) : schedules.length > 0 ? (
            <div className="space-y-4">
              {isEditing && (
                <Button 
                  onClick={() => setIsEditing(false)} 
                  variant="ghost" 
                  className="text-gray-500 font-bold flex items-center gap-2 hover:bg-gray-100 mb-2"
                >
                  &larr; Kembali ke Jadwal Terdaftar
                </Button>
              )}
              {schedules.map((schedule) => {
                const isFull = schedule.current_count >= schedule.max_quota;
                return (
                  <Card key={schedule.id} className={cn(
                    "rounded-2xl border-2 transition-all overflow-hidden",
                    isFull ? "bg-gray-50 border-gray-100 opacity-60" : "bg-white border-green-50 hover:border-green-300 shadow-sm hover:shadow-md"
                  )}>
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-gray-900 font-black">
                            <Calendar className="w-4 h-4 text-green-600" />
                            <span>{new Intl.DateTimeFormat('id-ID', { dateStyle: 'full', timeZone: 'Asia/Jakarta' }).format(new Date(schedule.exam_date))}</span>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-gray-500 uppercase tracking-tighter">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              {schedule.start_time} - {schedule.end_time} WIB
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5" />
                              Sisa Kuota: {schedule.max_quota - schedule.current_count}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-700">
                             <GraduationCap className="w-3.5 h-3.5" />
                             Penguji: {formatExaminerName(schedule.examiner?.full_name)}
                          </div>
                        </div>
                        
                        <Button 
                          disabled={isFull || isSubmitting}
                          onClick={() => handleRegister(schedule.id)}
                          className={cn(
                            "rounded-xl font-bold px-6 py-5 shadow-lg transition-all",
                            isFull 
                              ? "bg-gray-200 text-gray-400" 
                              : "bg-green-600 hover:bg-green-700 text-white shadow-green-600/20 active:translate-y-1"
                          )}
                        >
                          {isFull ? 'Penuh' : isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Pilih Jadwal'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 space-y-4">
               <AlertCircle className="w-12 h-12 mx-auto text-gray-300" />
               <p className="text-gray-500 font-bold">Maaf Ukhti, saat ini belum ada jadwal tersedia untuk {examType === 'oral' ? 'Ujian Lisan' : 'Ujian Tulisan'}.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
