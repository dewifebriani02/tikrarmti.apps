'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Calendar as CalendarIcon, Clock, Users, Link as LinkIcon, Save, X, Loader2, GraduationCap, Edit, MessageSquare, FileText, Copy, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useActiveBatch, useBatches } from '@/hooks/useBatches';
import { cn } from '@/lib/utils';
import { formatMuallimahName } from '@/lib/roles';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface Examiner {
  id: string;
  full_name: string;
}

interface Schedule {
  id: string;
  batch_id?: string;
  exam_type: string;
  exam_date: string;
  end_date?: string | null;
  start_time: string;
  end_time: string;
  examiner_id?: string | null;
  max_quota: number;
  current_count: number;
  location_link: string;
  status: string;
  examiner?: { full_name: string };
}

export function FinalExamSchedules() {
  const { batches, mutate: mutateBatches } = useBatches();
  const { activeBatch } = useActiveBatch();
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [examiners, setExaminers] = useState<Examiner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [viewingParticipantsSchedule, setViewingParticipantsSchedule] = useState<Schedule | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [isFetchingParticipants, setIsFetchingParticipants] = useState(false);
  const [isCopyingAll, setIsCopyingAll] = useState(false);
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [copiedText, setCopiedText] = useState('');
  const [hasCopied, setHasCopied] = useState(false);

  const formatDateFull = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    try {
      return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'full',
        timeZone: 'Asia/Jakarta'
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  const extractWibDateAndTime = (isoStr?: string | null, fallbackTime: string = '06:00') => {
    if (!isoStr) return { date: '', time: fallbackTime };
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) {
      return { date: String(isoStr).slice(0, 10), time: fallbackTime };
    }
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(d);
    const get = (t: string) => parts.find(p => p.type === t)?.value || '';
    const date = `${get('year')}-${get('month')}-${get('day')}`;
    const hour = get('hour') === '24' ? '00' : get('hour');
    const time = `${hour}:${get('minute')}`;
    return { date, time: time || fallbackTime };
  };

  const getBatchExamWindow = (batchId?: string | null) => {
    const b = batches.find(item => item.id === (batchId || selectedBatchId)) as any;
    if (!b) return null;
    const start = extractWibDateAndTime(b.final_exam_start_date, '06:00');
    const end = extractWibDateAndTime(b.final_exam_end_date, '23:59');
    return {
      batch: b,
      exam_date: start.date,
      end_date: end.date || start.date,
      start_time: start.time || '06:00',
      end_time: end.time || '23:59',
    };
  };

  const selectedBatchObj = batches.find(b => b.id === selectedBatchId) as any;

  const handleCopyAllOralSchedules = async () => {
    const oralSchedules = schedules
      .filter(s => s.exam_type === 'oral')
      .sort((a, b) => {
        const dateA = `${a.exam_date} ${a.start_time}`;
        const dateB = `${b.exam_date} ${b.start_time}`;
        return dateA.localeCompare(dateB);
      });

    if (oralSchedules.length === 0) {
      toast.error('Tidak ada jadwal ujian lisan untuk batch ini');
      return;
    }

    setIsCopyingAll(true);
    try {
      const batchParam = selectedBatchId ? `?batch_id=${selectedBatchId}` : '';
      let regMap: Record<string, any[]> = {};

      try {
        const res = await fetch(`/api/exams/final-exams/registrations/admin${batchParam}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          json.data.forEach((reg: any) => {
            const sId = reg.schedule_id;
            if (sId) {
              if (!regMap[sId]) regMap[sId] = [];
              regMap[sId].push(reg);
            }
          });
        }
      } catch (err) {
        console.warn('Could not fetch participants for copy:', err);
      }

      const currentBatchName = batches.find(b => b.id === selectedBatchId)?.name || 'Batch Ujian';

      let text = `📋 *DAFTAR LENGKAP JADWAL UJIAN LISAN*\n`;
      text += `🏛️ *Batch:* ${currentBatchName}\n`;
      text += `📊 *Total Sesi:* ${oralSchedules.length} Sesi\n`;
      text += `═════════════════════════════\n\n`;

      oralSchedules.forEach((schedule, idx) => {
        const dateFormatted = formatDateFull(schedule.exam_date);
        const examinerName = formatMuallimahName(schedule.examiner?.full_name) || 'Belum Ditentukan';
        const sessionParticipants = regMap[schedule.id] || [];

        text += `*SESI #${idx + 1}*\n`;
        text += `📅 *Hari/Tanggal:* ${dateFormatted}\n`;
        text += `⏰ *Waktu:* ${schedule.start_time.slice(0, 5)} - ${schedule.end_time.slice(0, 5)} WIB\n`;
        text += `🧕 *Penguji:* ${examinerName}\n`;
        text += `👥 *Kuota Terisi:* ${schedule.current_count} / ${schedule.max_quota} Peserta\n`;
        if (schedule.location_link) {
          text += `🔗 *Link Ujian/Zoom:* ${schedule.location_link}\n`;
        }

        text += `\n📝 *Daftar Peserta Terdaftar:*\n`;
        if (sessionParticipants.length > 0) {
          sessionParticipants.forEach((p, pIdx) => {
            const phone = p.user?.whatsapp ? ` (${p.user.whatsapp})` : '';
            text += `  ${pIdx + 1}. ${p.user?.full_name || 'Tanpa Nama'}${phone}\n`;
          });
        } else {
          text += `  _(Belum ada peserta terdaftar)_\n`;
        }

        text += `\n─────────────────────────────\n\n`;
      });

      const finalText = text.trim();
      setCopiedText(finalText);
      try {
        await navigator.clipboard.writeText(finalText);
        setHasCopied(true);
        toast.success('Jadwal ujian lisan lengkap berhasil disalin ke clipboard!');
        setTimeout(() => setHasCopied(false), 3000);
      } catch (clipErr) {
        toast.success('Jadwal ujian lisan berhasil disiapkan!');
      }
      setCopyModalOpen(true);
    } catch (error: any) {
      console.error('Error copying schedules:', error);
      toast.error('Gagal menyalin jadwal ujian lisan');
    } finally {
      setIsCopyingAll(false);
    }
  };

  useEffect(() => {
    if (viewingParticipantsSchedule) {
      fetchParticipants(viewingParticipantsSchedule.id);
    }
  }, [viewingParticipantsSchedule]);

  const fetchParticipants = async (scheduleId: string) => {
    setIsFetchingParticipants(true);
    try {
      const response = await fetch(`/api/exams/final-exams/registrations/admin?schedule_id=${scheduleId}`);
      const result = await response.json();
      if (result.success) {
        setParticipants(result.data || []);
      }
    } catch (error) {
      console.error('Fetch participants error:', error);
      toast.error('Gagal mengambil data pendaftar');
    } finally {
      setIsFetchingParticipants(false);
    }
  };

  const getWhatsAppLink = (phone?: string) => {
    if (!phone) return '#';
    let clean = phone.replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) {
      clean = '62' + clean.slice(1);
    }
    return `https://wa.me/${clean}`;
  };

  const [formData, setFormData] = useState({
    batch_id: '',
    exam_type: 'oral',
    examiner_id: '',
    max_quota: 5,
    location_link: '',
    sessions: [{ exam_date: '', end_date: '', start_time: '', end_time: '' }]
  });

  useEffect(() => {
    if (activeBatch && !selectedBatchId) {
      setSelectedBatchId(activeBatch.id);
    }
  }, [activeBatch, selectedBatchId]);

  useEffect(() => {
    if (selectedBatchId) {
      fetchSchedules();
    }
  }, [selectedBatchId]);

  useEffect(() => {
    fetchExaminers();
  }, []);

  const fetchSchedules = async () => {
    try {
      const url = selectedBatchId 
        ? `/api/exams/final-exams/schedules?batch_id=${selectedBatchId}`
        : '/api/exams/final-exams/schedules';
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

  const fetchExaminers = async () => {
    try {
      const response = await fetch(`/api/admin/examiners`, { cache: 'no-store' });
      const result = await response.json();
      
      if (result.success && result.data) {
        const staff = result.data.map((m: any) => ({
          id: m.id,
          full_name: m.full_name.toLowerCase().includes('ustadzah') ? m.full_name : `Ustadzah ${m.full_name}`
        }));
        setExaminers(staff);
      } else {
        setExaminers([]);
      }
    } catch (error) {
      console.error('Fetch examiners error:', error);
      setExaminers([]);
    }
  };

  const handleExamTypeChange = (newType: string) => {
    setFormData(prev => {
      const batchWin = getBatchExamWindow(prev.batch_id || selectedBatchId);
      return {
        ...prev,
        exam_type: newType,
        max_quota: newType === 'written' ? (prev.max_quota <= 10 ? 200 : prev.max_quota) : (prev.max_quota > 50 ? 10 : prev.max_quota),
        sessions: prev.sessions.map(s => ({
          ...s,
          exam_date: s.exam_date || (newType === 'written' && batchWin?.exam_date ? batchWin.exam_date : ''),
          end_date: s.end_date || (newType === 'written' && batchWin?.end_date ? batchWin.end_date : ''),
          start_time: s.start_time || (newType === 'written' ? (batchWin?.start_time || '06:00') : ''),
          end_time: s.end_time || (newType === 'written' ? (batchWin?.end_time || '23:59') : ''),
        }))
      };
    });
  };

  const applyBatchExamDatesToForm = (targetBatchId?: string | null) => {
    const batchWin = getBatchExamWindow(targetBatchId || formData.batch_id || selectedBatchId);
    if (!batchWin || !batchWin.exam_date) {
      toast.error('Batch ini belum memiliki pengaturan Tanggal Mulai/Selesai Ujian Akhir di Manajemen Batch.');
      return;
    }
    setFormData(prev => ({
      ...prev,
      sessions: prev.sessions.map(s => ({
        ...s,
        exam_date: batchWin.exam_date,
        end_date: batchWin.end_date || batchWin.exam_date,
        start_time: batchWin.start_time || '06:00',
        end_time: batchWin.end_time || '23:59',
      }))
    }));
    toast.success(`Tanggal ujian berhasil disinkronkan dari ${batchWin.batch.name}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isWritten = formData.exam_type === 'written';

    if (!isWritten && !formData.examiner_id) {
      toast.error('Harap pilih penguji (examiner) untuk ujian lisan');
      return;
    }

    const hasEmptySession = formData.sessions.some(
      s => !s.exam_date || (isWritten && !s.end_date) || !s.start_time || !s.end_time
    );
    if (hasEmptySession) {
      toast.error(
        isWritten
          ? 'Harap lengkapi Tanggal Dibuka, Tanggal Tutup Ujian, serta Jam Dibuka & Ditutup'
          : 'Harap lengkapi tanggal dan jam pada semua sesi ujian'
      );
      return;
    }

    const hasInvalidDateRange = formData.sessions.some(
      s => s.end_date && s.exam_date && s.end_date < s.exam_date
    );
    if (hasInvalidDateRange) {
      toast.error('Tanggal tutup ujian tidak boleh lebih awal dari tanggal dibuka ujian');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        const session = formData.sessions[0];
        const response = await fetch('/api/exams/final-exams/schedules', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            id: editingId,
            batch_id: formData.batch_id || selectedBatchId,
            exam_type: formData.exam_type,
            examiner_id: formData.examiner_id === 'NONE' ? null : (formData.examiner_id || null),
            max_quota: formData.max_quota,
            location_link: formData.location_link,
            exam_date: session.exam_date,
            end_date: session.end_date || session.exam_date,
            start_time: session.start_time,
            end_time: session.end_time
          })
        });

        if (response.ok) {
          toast.success('Jadwal berhasil diperbarui');
          setShowAddForm(false);
          resetForm();
          fetchSchedules();
          mutateBatches();
        } else {
          toast.error('Gagal memperbarui jadwal');
        }
      } else {
        const promises = formData.sessions.map(session => 
          fetch('/api/exams/final-exams/schedules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              batch_id: formData.batch_id || selectedBatchId,
              exam_type: formData.exam_type,
              examiner_id: formData.examiner_id === 'NONE' ? null : (formData.examiner_id || null),
              max_quota: formData.max_quota,
              location_link: formData.location_link,
              exam_date: session.exam_date,
              end_date: session.end_date || session.exam_date,
              start_time: session.start_time,
              end_time: session.end_time
            })
          })
        );
        
        const results = await Promise.all(promises);
        const allSuccess = results.every(r => r.ok);

        if (allSuccess) {
          toast.success(`${formData.sessions.length} Jadwal berhasil ditambahkan`);
          setShowAddForm(false);
          resetForm();
          fetchSchedules();
          mutateBatches();
        } else {
          toast.error('Beberapa jadwal mungkin gagal ditambahkan');
          fetchSchedules();
        }
      }
    } catch (error) {
      toast.error('Terjadi kesalahan server');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      batch_id: selectedBatchId || '',
      exam_type: 'oral',
      examiner_id: '',
      max_quota: 5,
      location_link: '',
      sessions: [{ exam_date: '', end_date: '', start_time: '', end_time: '' }]
    });
    setEditingId(null);
  };

  const handleEdit = (schedule: Schedule) => {
    setEditingId(schedule.id);
    setFormData({
      batch_id: schedule.batch_id || selectedBatchId || '',
      exam_type: schedule.exam_type,
      examiner_id: schedule.examiner_id || '',
      max_quota: schedule.max_quota,
      location_link: schedule.location_link || '',
      sessions: [{ 
        exam_date: schedule.exam_date,
        end_date: schedule.end_date || schedule.exam_date,
        start_time: schedule.start_time, 
        end_time: schedule.end_time 
      }]
    });
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addSession = () => {
    const isWritten = formData.exam_type === 'written';
    setFormData({
      ...formData,
      sessions: [
        ...formData.sessions,
        {
          exam_date: '',
          end_date: '',
          start_time: isWritten ? '06:00' : '',
          end_time: isWritten ? '23:59' : ''
        }
      ]
    });
  };

  const removeSession = (index: number) => {
    if (formData.sessions.length <= 1) return;
    const newSessions = [...formData.sessions];
    newSessions.splice(index, 1);
    setFormData({ ...formData, sessions: newSessions });
  };

  const updateSession = (index: number, field: string, value: string) => {
    const newSessions = [...formData.sessions];
    const updated = { ...newSessions[index], [field]: value };
    // Auto-fill end_date if exam_date is picked and end_date is still empty
    if (field === 'exam_date' && !updated.end_date) {
      updated.end_date = value;
    }
    newSessions[index] = updated;
    setFormData({ ...formData, sessions: newSessions });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus jadwal ini?')) return;
    try {
      const response = await fetch(`/api/exams/final-exams/schedules?id=${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        toast.success('Jadwal berhasil dihapus');
        fetchSchedules();
      }
    } catch (error) {
      toast.error('Gagal menghapus jadwal');
    }
  };

  const isWrittenForm = formData.exam_type === 'written';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-gray-900">Daftar Jadwal Ujian</h2>
          <Select 
            value={selectedBatchId || ""} 
            onValueChange={(v) => setSelectedBatchId(v)}
          >
            <SelectTrigger className="w-[200px] rounded-xl border-gray-200 bg-white">
              <SelectValue placeholder="Pilih Batch" />
            </SelectTrigger>
            <SelectContent>
              {batches.map(batch => (
                <SelectItem key={batch.id} value={batch.id}>{batch.name.replace(/Tikrar Tahfidz MTI /gi, '')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button 
            type="button"
            onClick={handleCopyAllOralSchedules}
            disabled={isCopyingAll || isLoading}
            variant="outline"
            className="rounded-xl border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-bold transition-all shadow-sm active:scale-95 duration-200"
          >
            {isCopyingAll ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin text-green-700" />
            ) : (
              <Copy className="w-4 h-4 mr-2 text-green-800" />
            )}
            Copy Semua Jadwal Lisan
          </Button>

          <Button 
            onClick={() => {
              if (showAddForm) resetForm();
              else setFormData(prev => ({ ...prev, batch_id: selectedBatchId || '' }));
              setShowAddForm(!showAddForm);
            }}
            className="rounded-xl bg-green-900 hover:bg-green-800 text-white font-bold transition-all shadow-sm active:scale-95 duration-200"
          >
            {showAddForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            {showAddForm ? 'Batal' : 'Tambah Jadwal'}
          </Button>
        </div>
      </div>

      {/* Info Banner: Sinkronisasi Periode Ujian Akhir dengan Manajemen Batch */}
      {selectedBatchObj && (
        <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-blue-50/90 border border-blue-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-sm shrink-0 mt-0.5">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md border border-blue-200">
                  Terhubung ke Manajemen Batch
                </span>
                <span className="text-xs font-bold text-gray-700">
                  {selectedBatchObj.name}
                </span>
              </div>
              <p className="text-xs text-gray-800 font-semibold mt-1">
                Periode Ujian Akhir Batch (Buka – Tutup CBT):{' '}
                {selectedBatchObj.final_exam_start_date ? (
                  <span className="font-black text-blue-950">
                    {formatDateFull(selectedBatchObj.final_exam_start_date)} ({extractWibDateAndTime(selectedBatchObj.final_exam_start_date, '00:01').time} WIB)
                    {' s.d. '}
                    {formatDateFull(selectedBatchObj.final_exam_end_date || selectedBatchObj.final_exam_start_date)} ({extractWibDateAndTime(selectedBatchObj.final_exam_end_date, '23:59').time} WIB)
                  </span>
                ) : (
                  <span className="text-amber-700 font-bold">Belum diatur di Batch</span>
                )}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Mengubah Tanggal Dibuka & Tanggal Tutup Ujian Tulisan di sini otomatis memperbarui Periode Ujian Akhir pada Batch (dan sebaliknya).
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const existingWritten = schedules.find(s => s.exam_type === 'written');
              if (existingWritten) {
                handleEdit(existingWritten);
              } else {
                const win = getBatchExamWindow(selectedBatchId);
                setEditingId(null);
                setFormData({
                  batch_id: selectedBatchId || '',
                  exam_type: 'written',
                  examiner_id: 'NONE',
                  max_quota: 200,
                  location_link: '',
                  sessions: [{
                    exam_date: win?.exam_date || '',
                    end_date: win?.end_date || win?.exam_date || '',
                    start_time: win?.start_time || '06:00',
                    end_time: win?.end_time || '23:59',
                  }]
                });
                setShowAddForm(true);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className="rounded-xl border-blue-300 bg-white hover:bg-blue-50 text-blue-800 font-bold text-xs shrink-0 self-start sm:self-center"
          >
            <FileText className="w-3.5 h-3.5 mr-1.5 text-blue-700" />
            {schedules.some(s => s.exam_type === 'written') ? 'Edit Tanggal Buka/Tutup CBT' : 'Atur Tanggal Buka/Tutup CBT'}
          </Button>
        </div>
      )}

      {showAddForm && (
        <Card className="rounded-3xl border border-gray-100 bg-white shadow-xl animate-fadeInDown overflow-hidden">
          <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-5">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
              {editingId ? 'Edit Jadwal Ujian' : 'Input Jadwal Baru'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Batch Ujian</Label>
                  <Select 
                    value={formData.batch_id} 
                    onValueChange={(v) => {
                      const batchWin = getBatchExamWindow(v);
                      setFormData(prev => ({
                        ...prev,
                        batch_id: v,
                        sessions: prev.exam_type === 'written' && batchWin?.exam_date
                          ? prev.sessions.map(s => ({
                              ...s,
                              exam_date: batchWin.exam_date,
                              end_date: batchWin.end_date || batchWin.exam_date,
                              start_time: batchWin.start_time || s.start_time || '06:00',
                              end_time: batchWin.end_time || s.end_time || '23:59',
                            }))
                          : prev.sessions
                      }));
                    }}
                    required
                  >
                    <SelectTrigger className="rounded-xl border-gray-200">
                      <SelectValue placeholder="Pilih Batch" />
                    </SelectTrigger>
                    <SelectContent>
                      {batches.map(batch => (
                        <SelectItem key={batch.id} value={batch.id}>{batch.name.replace(/Tikrar Tahfidz MTI /gi, '')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Jenis Ujian</Label>
                  <Select 
                    value={formData.exam_type} 
                    onValueChange={handleExamTypeChange}
                  >
                    <SelectTrigger className="rounded-xl border-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="oral">Ujian Lisan (Oral)</SelectItem>
                      <SelectItem value="written">Ujian Tulisan (Written / Pilihan Ganda)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>
                    Penguji (Examiner){' '}
                    {isWrittenForm && <span className="text-xs font-normal text-gray-400">(Opsional untuk Ujian Tulisan)</span>}
                  </Label>
                  <Select 
                    value={formData.examiner_id} 
                    onValueChange={(v) => setFormData({...formData, examiner_id: v})}
                  >
                    <SelectTrigger className={`rounded-xl border-gray-200 ${!formData.examiner_id ? "text-gray-500" : ""}`}>
                      <SelectValue placeholder={isWrittenForm ? "Semua / Sistem CBT (Tanpa Penguji Spesifik)" : "Pilih Penguji"} />
                    </SelectTrigger>
                    <SelectContent>
                      {isWrittenForm && (
                        <SelectItem value="NONE">Sistem CBT Otomatis (Tanpa Penguji)</SelectItem>
                      )}
                      {examiners.map(examiner => (
                        <SelectItem key={examiner.id} value={examiner.id}>{formatMuallimahName(examiner.full_name)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Maksimal Quota per Sesi</Label>
                  <Input 
                    type="number" 
                    className="rounded-xl border-gray-200" 
                    value={formData.max_quota}
                    onChange={(e) => setFormData({...formData, max_quota: parseInt(e.target.value) || 0})}
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Link Zoom / Lokasi (Opsional)</Label>
                  <Input 
                    placeholder={isWrittenForm ? "Kosongkan jika dikerjakan langsung di Portal CBT /ujian" : "https://zoom.us/j/..."} 
                    className="rounded-xl border-gray-200" 
                    value={formData.location_link}
                    onChange={(e) => setFormData({...formData, location_link: e.target.value})}
                  />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
                  <div>
                    <Label className="text-base font-bold">
                      {isWrittenForm ? 'Rentang Waktu & Sesi Ujian Tulisan (Tanggal Dibuka & Tanggal Tutup)' : 'Sesi Ujian Lisan'}
                    </Label>
                    {isWrittenForm && (
                      <p className="text-xs text-blue-700 mt-0.5">
                        💡 Terhubung otomatis dengan <strong>Periode Ujian Akhir Batch</strong> (`final_exam_start_date` & `final_exam_end_date`). Menyimpan tanggal dibuka & tutup di bawah otomatis meng-update tanggal ujian akhir pada Batch dan membuka/menutup CBT di Portal Thalibah.
                      </p>
                    )}
                  </div>
                  {isWrittenForm && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyBatchExamDatesToForm(formData.batch_id || selectedBatchId)}
                      className="rounded-xl border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-800 font-bold text-xs self-start sm:self-auto"
                    >
                      <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
                      Isi Otomatis dari Tanggal Batch
                    </Button>
                  )}
                  {!editingId && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={addSession}
                      className="rounded-xl self-start sm:self-auto"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Tambah Sesi
                    </Button>
                  )}
                </div>

                <div className="space-y-4">
                  {formData.sessions.map((session, index) => (
                    <div
                      key={index}
                      className={cn(
                        "p-4 rounded-2xl border",
                        isWrittenForm
                          ? "bg-blue-50/40 border-blue-100"
                          : "bg-gray-50 border-gray-100"
                      )}
                    >
                      {isWrittenForm ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                          <div className="space-y-2">
                            <Label className="text-xs font-bold text-blue-950">Tanggal Dibuka Ujian *</Label>
                            <Input 
                              type="date" 
                              className="rounded-xl bg-white border-blue-200" 
                              value={session.exam_date}
                              onChange={(e) => updateSession(index, 'exam_date', e.target.value)}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-bold text-blue-950">Jam Dibuka (WIB) *</Label>
                            <Input 
                              type="time" 
                              className="rounded-xl bg-white border-blue-200" 
                              value={session.start_time}
                              onChange={(e) => updateSession(index, 'start_time', e.target.value)}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-bold text-rose-900">Tanggal Tutup Ujian *</Label>
                            <Input 
                              type="date" 
                              min={session.exam_date || undefined}
                              className="rounded-xl bg-white border-rose-200" 
                              value={session.end_date}
                              onChange={(e) => updateSession(index, 'end_date', e.target.value)}
                              required
                            />
                          </div>
                          <div className="flex items-end gap-2">
                            <div className="flex-1 space-y-2">
                              <Label className="text-xs font-bold text-rose-900">Jam Ditutup (WIB) *</Label>
                              <Input 
                                type="time" 
                                className="rounded-xl bg-white border-rose-200" 
                                value={session.end_time}
                                onChange={(e) => updateSession(index, 'end_time', e.target.value)}
                                required
                              />
                            </div>
                            {formData.sessions.length > 1 && (
                              <Button 
                                type="button" 
                                variant="ghost" 
                                onClick={() => removeSession(index)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl"
                              >
                                <Trash2 className="w-5 h-5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                          <div className="space-y-2">
                            <Label>Tanggal Mulai Sesi *</Label>
                            <Input 
                              type="date" 
                              className="rounded-xl bg-white" 
                              value={session.exam_date}
                              onChange={(e) => updateSession(index, 'exam_date', e.target.value)}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Tanggal Akhir Sesi (Opsional)</Label>
                            <Input 
                              type="date" 
                              min={session.exam_date || undefined}
                              className="rounded-xl bg-white" 
                              value={session.end_date || session.exam_date}
                              onChange={(e) => updateSession(index, 'end_date', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Waktu Mulai (WIB) *</Label>
                            <Input 
                              type="time" 
                              className="rounded-xl bg-white" 
                              value={session.start_time}
                              onChange={(e) => updateSession(index, 'start_time', e.target.value)}
                              required
                            />
                          </div>
                          <div className="flex items-end gap-2">
                            <div className="flex-1 space-y-2">
                              <Label>Waktu Selesai (WIB) *</Label>
                              <Input 
                                type="time" 
                                className="rounded-xl bg-white" 
                                value={session.end_time}
                                onChange={(e) => updateSession(index, 'end_time', e.target.value)}
                                required
                              />
                            </div>
                            {formData.sessions.length > 1 && (
                              <Button 
                                type="button" 
                                variant="ghost" 
                                onClick={() => removeSession(index)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl"
                              >
                                <Trash2 className="w-5 h-5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="rounded-xl bg-green-900 hover:bg-green-800 text-white font-bold transition-all shadow-sm active:scale-95 duration-200 px-8"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  {editingId ? 'Update Jadwal' : 'Simpan Jadwal'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center p-20">
          <Loader2 className="w-10 h-10 text-green-600 animate-spin" />
        </div>
      ) : schedules.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {schedules.map(schedule => {
            const current = schedule.current_count;
            const max = schedule.max_quota;
            const isFull = current >= max;
            const isAlmostFull = !isFull && (current >= max * 0.7 || max - current <= 2);
            const hasMultiDayRange = Boolean(schedule.end_date && schedule.end_date !== schedule.exam_date);
            const isWrittenSchedule = schedule.exam_type === 'written';

            let cardBgBorderClass = "";
            let quotaTextClass = "";

            if (isFull) {
              cardBgBorderClass = "bg-rose-50/40 border-rose-100 hover:bg-rose-50/60 hover:border-rose-200";
              quotaTextClass = "text-rose-600 font-extrabold";
            } else if (isAlmostFull) {
              cardBgBorderClass = "bg-amber-50/40 border-amber-100 hover:bg-amber-50/60 hover:border-amber-200";
              quotaTextClass = "text-amber-600 font-extrabold";
            } else {
              cardBgBorderClass = "bg-emerald-50/30 border-emerald-100 hover:bg-emerald-50/50 hover:border-emerald-200";
              quotaTextClass = "text-emerald-600 font-extrabold";
            }

            return (
              <div 
                key={schedule.id} 
                onClick={() => setViewingParticipantsSchedule(schedule)}
                className={cn(
                  "p-5 rounded-2xl border transition-all duration-300 hover:shadow-md hover:-translate-y-1 cursor-pointer group active:scale-[0.98]",
                  cardBgBorderClass
                )}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100/50 group-hover:scale-110 transition-transform duration-300">
                    {schedule.exam_type === 'oral' ? (
                      <Clock className="h-5 w-5 text-amber-600" />
                    ) : (
                      <FileText className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <div className={cn(
                      "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border",
                      schedule.exam_type === 'oral' 
                        ? "bg-amber-100/60 text-amber-800 border-amber-200/50" 
                        : "bg-blue-100/60 text-blue-800 border-blue-200/50"
                    )}>
                      {schedule.exam_type === 'oral' ? 'Lisan' : 'Tulisan'}
                    </div>

                    {isFull ? (
                      <div className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border bg-rose-100/60 text-rose-800 border-rose-200/50">
                        Penuh
                      </div>
                    ) : isAlmostFull ? (
                      <div className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border bg-amber-100/60 text-amber-800 border-amber-200/50">
                        Hampir Penuh
                      </div>
                    ) : (
                      <div className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border bg-emerald-100/60 text-emerald-800 border-emerald-200/50">
                        Tersedia
                      </div>
                    )}
                    
                    <div className="flex gap-0.5">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(schedule);
                      }}
                      className="h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-gray-100 shadow-none"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(schedule.id);
                      }}
                      className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-gray-100 shadow-none"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {isWrittenSchedule || hasMultiDayRange ? (
                  <div className="space-y-1.5 bg-white/80 rounded-xl p-3 border border-gray-100">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">
                        Dibuka Ujian:
                      </span>
                      <p className="text-xs font-black text-gray-900">
                        {formatDateFull(schedule.exam_date)} • {schedule.start_time?.slice(0, 5)} WIB
                      </p>
                    </div>
                    <div className="pt-1 border-t border-gray-100">
                      <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 block">
                        Ditutup Ujian:
                      </span>
                      <p className="text-xs font-black text-gray-900">
                        {formatDateFull(schedule.end_date || schedule.exam_date)} • {schedule.end_time?.slice(0, 5)} WIB
                      </p>
                    </div>
                  </div>
                ) : (
                  <h3 className="text-base font-black text-gray-900 tracking-tight leading-snug">
                    {formatDateFull(schedule.exam_date)}
                  </h3>
                )}
                
                <div className="space-y-2 text-xs font-semibold text-gray-600">
                  {!isWrittenSchedule && !hasMultiDayRange && (
                    <div className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-md bg-white border border-gray-100 flex items-center justify-center text-gray-400">
                        <Clock className="w-3.5 h-3.5" />
                      </div>
                      <span>{schedule.start_time} - {schedule.end_time} WIB</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-md bg-white border border-gray-100 flex items-center justify-center text-gray-400">
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <span>Kuota: <span className={cn(quotaTextClass)}>{schedule.current_count} / {schedule.max_quota}</span></span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-md bg-white border border-gray-100 flex items-center justify-center text-gray-400">
                      <GraduationCap className="w-3.5 h-3.5" />
                    </div>
                    <span>
                      Penguji:{' '}
                      <span className="text-gray-950 font-bold">
                        {schedule.examiner?.full_name
                          ? formatMuallimahName(schedule.examiner.full_name)
                          : isWrittenSchedule
                          ? 'Sistem CBT Otomatis'
                          : '-'}
                      </span>
                    </span>
                  </div>
                  {schedule.location_link && (
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-5 h-5 rounded-md bg-white border border-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                        <LinkIcon className="w-3.5 h-3.5" />
                      </div>
                      <a 
                        href={schedule.location_link} 
                        target="_blank" 
                        onClick={(e) => e.stopPropagation()} 
                        className="text-blue-600 hover:underline truncate"
                      >
                        {schedule.location_link}
                      </a>
                    </div>
                  )}
                  {isWrittenSchedule && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="pt-2.5 mt-2 border-t border-blue-100 flex flex-col gap-1.5"
                    >
                      <a
                        href={`/admin/whatsapp?tab=broadcast&batchId=${encodeURIComponent(schedule.batch_id || selectedBatchId || '')}&tmpl=pembukaan_ujian_tulisan&filter=all`}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition-all shadow-xs"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Kirim Notifikasi Pembukaan Ujian (WA)
                      </a>
                      <a
                        href={`/admin/whatsapp?tab=broadcast&batchId=${encodeURIComponent(schedule.batch_id || selectedBatchId || '')}&tmpl=batas_akhir_ujian_tulisan&filter=missing_written_exam`}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition-all"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        Pengingat Batas Akhir (Belum Ujian)
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        </div>
      ) : (
        <div className="text-center p-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <CalendarIcon className="w-16 h-16 mx-auto mb-4 opacity-10" />
          <p className="text-gray-400 font-bold">Belum ada jadwal ujian yang dibuat.</p>
        </div>
      )}

      <Dialog 
        open={!!viewingParticipantsSchedule} 
        onOpenChange={(open) => {
          if (!open) {
            setViewingParticipantsSchedule(null);
            setParticipants([]);
          }
        }}
      >
        <DialogContent className="max-w-xl rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
          {viewingParticipantsSchedule && (
            <>
              <DialogHeader className={cn(
                "p-6 text-white bg-gradient-to-br relative overflow-hidden",
                viewingParticipantsSchedule.exam_type === 'oral' ? "from-amber-500 to-orange-600" : "from-blue-500 to-indigo-600"
              )}>
                <div className="relative z-10">
                  <DialogTitle className="text-xl font-black flex items-center gap-2 mb-1 text-white">
                    <Users className="w-6 h-6" />
                    Daftar Pendaftar Ujian
                  </DialogTitle>
                  <DialogDescription className="text-white/95 font-medium leading-relaxed">
                    {viewingParticipantsSchedule.exam_type === 'oral' ? 'Ujian Lisan' : 'Ujian Tulisan'} •{' '}
                    {viewingParticipantsSchedule.end_date && viewingParticipantsSchedule.end_date !== viewingParticipantsSchedule.exam_date
                      ? `${formatDateFull(viewingParticipantsSchedule.exam_date)} s.d. ${formatDateFull(viewingParticipantsSchedule.end_date)}`
                      : formatDateFull(viewingParticipantsSchedule.exam_date)}
                    <div className="text-xs text-white/80 mt-1 font-bold">
                      Waktu: {viewingParticipantsSchedule.start_time} - {viewingParticipantsSchedule.end_time} WIB | Penguji: {formatMuallimahName(viewingParticipantsSchedule.examiner?.full_name) || (viewingParticipantsSchedule.exam_type === 'written' ? 'Sistem CBT Otomatis' : '-')}
                    </div>
                  </DialogDescription>
                </div>
                <div className="absolute top-0 right-0 -mr-12 -mt-12 w-36 h-36 bg-white/10 rounded-full blur-2xl" />
                <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-36 h-36 bg-black/10 rounded-full blur-2xl" />
              </DialogHeader>
              
              <div className="p-6 max-h-[50vh] overflow-y-auto bg-gray-50/50 space-y-4">
                <div className="flex justify-between items-center bg-white border border-gray-100 p-4 rounded-2xl shadow-sm">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Sisa Kuota Sesi</span>
                  <span className="text-sm font-black text-gray-950">
                    {viewingParticipantsSchedule.max_quota - viewingParticipantsSchedule.current_count} / {viewingParticipantsSchedule.max_quota} Kursi
                  </span>
                </div>

                {isFetchingParticipants ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-green-600" />
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Memuat Peserta...</p>
                  </div>
                ) : participants.length > 0 ? (
                  <div className="space-y-3">
                    {participants.map((p) => (
                      <div 
                        key={p.id} 
                        className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between shadow-sm hover:shadow transition-shadow"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                            <Users className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900 leading-tight">{p.user?.full_name || 'Tanpa Nama'}</h4>
                            <p className="text-xs text-gray-500 font-semibold">{p.user?.whatsapp || '-'}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                                p.status === 'completed' || p.status === 'graded' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                              )}>
                                {p.status === 'graded' ? 'Sudah Dinilai' : p.status}
                              </span>
                              {p.score_lisan !== null && (
                                <span className="text-[9px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                                  Nilai: {p.score_lisan}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {p.user?.whatsapp && (
                          <a 
                            href={getWhatsAppLink(p.user.whatsapp)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-green-600 hover:text-green-700 font-bold text-xs bg-green-50 hover:bg-green-100 px-3 py-2 rounded-xl border border-green-100 transition-colors"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            Hubungi
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400 bg-white border border-gray-100 rounded-2xl p-6">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-10" />
                    <p className="text-sm font-bold">Belum ada peserta terdaftar.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Preview & Copy Semua Jadwal Ujian Lisan */}
      <Dialog open={copyModalOpen} onOpenChange={setCopyModalOpen}>
        <DialogContent className="max-w-2xl rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
          <DialogHeader className="p-6 text-white bg-gradient-to-br from-emerald-600 to-green-700 relative overflow-hidden">
            <div className="relative z-10">
              <DialogTitle className="text-xl font-black flex items-center gap-2 mb-1 text-white">
                <Copy className="w-6 h-6" />
                Daftar Jadwal Ujian Lisan Lengkap
              </DialogTitle>
              <DialogDescription className="text-emerald-100 text-xs font-medium">
                Teks jadwal ujian lisan lengkap di bawah telah disalin otomatis ke clipboard. Mimin dapat langsung menempelkannya (paste) ke grup WhatsApp, atau menyalin ulang di bawah.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Preview Teks Jadwal Ujian (Siap Kirim WhatsApp / Broadcast)
              </Label>
              <textarea
                value={copiedText}
                onChange={(e) => setCopiedText(e.target.value)}
                rows={14}
                className="w-full p-4 text-xs font-mono bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 leading-relaxed resize-y"
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2">
              <span className="text-xs text-gray-500 font-medium">
                💡 Bisa diedit langsung sebelum disalin ulang jika perlu catatan khusus
              </span>
              <div className="flex gap-2 w-full sm:w-auto justify-end">
                <Button
                  variant="outline"
                  onClick={() => setCopyModalOpen(false)}
                  className="rounded-xl border-gray-200 text-xs font-bold"
                >
                  Tutup
                </Button>
                <Button
                  onClick={async () => {
                    await navigator.clipboard.writeText(copiedText);
                    setHasCopied(true);
                    toast.success('Berhasil disalin ulang ke clipboard!');
                    setTimeout(() => setHasCopied(false), 2500);
                  }}
                  className="rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md active:scale-95 transition-all"
                >
                  {hasCopied ? (
                    <>
                      <Check className="w-4 h-4 mr-1.5 text-emerald-200" />
                      Tersalin!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1.5" />
                      Salin ke Clipboard
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
