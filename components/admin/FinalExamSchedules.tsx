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
  start_time: string;
  end_time: string;
  examiner_id: string;
  max_quota: number;
  current_count: number;
  location_link: string;
  status: string;
  examiner?: { full_name: string };
}

export function FinalExamSchedules() {
  const { batches } = useBatches();
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
        let dateFormatted = schedule.exam_date;
        try {
          dateFormatted = new Intl.DateTimeFormat('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            timeZone: 'Asia/Jakarta'
          }).format(new Date(schedule.exam_date));
        } catch (e) {}

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
    sessions: [{ exam_date: '', start_time: '', end_time: '' }]
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
      // Mengambil daftar muallimah otomatis dari gabungan pendaftaran dan penugasan halaqah
      const response = await fetch(`/api/admin/examiners`, { cache: 'no-store' });
      const result = await response.json();
      
      if (result.success && result.data) {
        const staff = result.data.map((m: any) => ({
          id: m.id,
          full_name: m.full_name.toLowerCase().includes('ustadzah') ? m.full_name : `Ustadzah ${m.full_name}`
        }));
        console.log('Fetched muallimah for examiners:', staff.length);
        setExaminers(staff);
      } else {
        setExaminers([]);
      }
    } catch (error) {
      console.error('Fetch examiners error:', error);
      setExaminers([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.examiner_id) {
      toast.error('Harap pilih penguji (examiner)');
      return;
    }

    const hasEmptySession = formData.sessions.some(s => !s.exam_date || !s.start_time || !s.end_time);
    if (hasEmptySession) {
      toast.error('Harap lengkapi tanggal dan jam pada semua sesi ujian');
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
            examiner_id: formData.examiner_id,
            max_quota: formData.max_quota,
            location_link: formData.location_link,
            exam_date: session.exam_date,
            start_time: session.start_time,
            end_time: session.end_time
          })
        });

        if (response.ok) {
          toast.success('Jadwal berhasil diperbarui');
          setShowAddForm(false);
          resetForm();
          fetchSchedules();
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
              examiner_id: formData.examiner_id,
              max_quota: formData.max_quota,
              location_link: formData.location_link,
              exam_date: session.exam_date,
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
      sessions: [{ exam_date: '', start_time: '', end_time: '' }]
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
        start_time: schedule.start_time, 
        end_time: schedule.end_time 
      }]
    });
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addSession = () => {
    setFormData({
      ...formData,
      sessions: [...formData.sessions, { exam_date: '', start_time: '', end_time: '' }]
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
    newSessions[index] = { ...newSessions[index], [field]: value };
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
                    onValueChange={(v) => setFormData({...formData, batch_id: v})}
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
                  <Label>Penguji (Examiner)</Label>
                  <Select 
                    value={formData.examiner_id} 
                    onValueChange={(v) => setFormData({...formData, examiner_id: v})}
                    required
                  >
                    <SelectTrigger className={`rounded-xl border-gray-200 ${!formData.examiner_id ? "text-gray-500" : ""}`}>
                      <SelectValue placeholder="Pilih Penguji" />
                    </SelectTrigger>
                    <SelectContent>
                      {examiners.map(examiner => (
                        <SelectItem key={examiner.id} value={examiner.id}>{formatMuallimahName(examiner.full_name)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Jenis Ujian</Label>
                  <Select 
                    value={formData.exam_type} 
                    onValueChange={(v) => setFormData({...formData, exam_type: v})}
                  >
                    <SelectTrigger className="rounded-xl border-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="oral">Ujian Lisan (Oral)</SelectItem>
                      <SelectItem value="written">Ujian Tulisan (Written)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Maksimal Quota per Sesi</Label>
                  <Input 
                    type="number" 
                    className="rounded-xl border-gray-200" 
                    value={formData.max_quota}
                    onChange={(e) => setFormData({...formData, max_quota: parseInt(e.target.value)})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Link Zoom / Lokasi (Opsional)</Label>
                  <Input 
                    placeholder="https://zoom.us/j/..." 
                    className="rounded-xl border-gray-200" 
                    value={formData.location_link}
                    onChange={(e) => setFormData({...formData, location_link: e.target.value})}
                  />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-6">
                <div className="flex justify-between items-center mb-4">
                  <Label className="text-base font-bold">Sesi Ujian</Label>
                  {!editingId && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={addSession}
                      className="rounded-xl"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Tambah Sesi
                    </Button>
                  )}
                </div>

                <div className="space-y-4">
                  {formData.sessions.map((session, index) => (
                    <div key={index} className="flex flex-col sm:flex-row items-end gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="flex-1 space-y-2 w-full">
                        <Label>Tanggal</Label>
                        <Input 
                          type="date" 
                          className="rounded-xl bg-white" 
                          value={session.exam_date}
                          onChange={(e) => updateSession(index, 'exam_date', e.target.value)}
                          required
                        />
                      </div>
                      <div className="flex-1 space-y-2 w-full">
                        <Label>Waktu Mulai</Label>
                        <Input 
                          type="time" 
                          className="rounded-xl bg-white" 
                          value={session.start_time}
                          onChange={(e) => updateSession(index, 'start_time', e.target.value)}
                          required
                        />
                      </div>
                      <div className="flex-1 space-y-2 w-full">
                        <Label>Waktu Selesai</Label>
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
                      {schedule.exam_type === 'oral' ? 'Lisan' : 'Tulis'}
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
                <h3 className="text-base font-black text-gray-900 tracking-tight leading-snug">
                  {new Intl.DateTimeFormat('id-ID', { dateStyle: 'full', timeZone: 'Asia/Jakarta' }).format(new Date(schedule.exam_date))}
                </h3>
                
                <div className="space-y-2 text-xs font-semibold text-gray-600">
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-md bg-white border border-gray-100 flex items-center justify-center text-gray-400">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <span>{schedule.start_time} - {schedule.end_time} WIB</span>
                  </div>
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
                    <span>Penguji: <span className="text-gray-950 font-bold">{formatMuallimahName(schedule.examiner?.full_name) || '-'}</span></span>
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
                    {viewingParticipantsSchedule.exam_type === 'oral' ? 'Ujian Lisan' : 'Ujian Tulisan'} • {new Intl.DateTimeFormat('id-ID', { dateStyle: 'full', timeZone: 'Asia/Jakarta' }).format(new Date(viewingParticipantsSchedule.exam_date))}
                    <div className="text-xs text-white/80 mt-1 font-bold">
                      Waktu: {viewingParticipantsSchedule.start_time} - {viewingParticipantsSchedule.end_time} WIB | Penguji: {formatMuallimahName(viewingParticipantsSchedule.examiner?.full_name) || '-'}
                    </div>
                  </DialogDescription>
                </div>
                {/* Background decorative details */}
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
