'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, CheckCircle2, Clock, User, Award, MessageSquare, Save, Loader2, ChevronRight, PenTool } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { formatMuallimahName } from '@/lib/roles';

interface Registration {
  id: string;
  user_id: string;
  schedule_id: string;
  status: string;
  score_lisan: number | null;
  score_tulisan: number | null;
  feedback: string | null;
  user: { full_name: string; whatsapp: string };
  schedule: {
    batch_id?: string;
    batch?: { id: string; name: string };
    exam_type: string;
    exam_date: string;
    start_time: string;
    end_time?: string;
    examiner: { full_name: string };
  };
}

const formatExaminerName = (name: string) => formatMuallimahName(name) || '-';

export function FinalExamParticipants() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [batches, setBatches] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [gradingData, setGradingData] = useState({
    score_lisan: 0,
    score_tulisan: 0,
    feedback: ''
  });

  useEffect(() => {
    fetchRegistrations();
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      const res = await fetch('/api/admin/batches');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setBatches(json.data);
      }
    } catch (e) {
      console.error('Failed to fetch batches:', e);
    }
  };

  const fetchRegistrations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/exams/final-exams/registrations/admin');
      const result = await response.json();
      if (result.success) {
        setRegistrations(result.data || []);
      }
    } catch (error) {
      console.error('Fetch registrations error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenGrading = (reg: Registration) => {
    setSelectedReg(reg);
    setGradingData({
      score_lisan: reg.score_lisan !== null ? reg.score_lisan : 0,
      score_tulisan: reg.score_tulisan !== null ? reg.score_tulisan : 0,
      feedback: reg.feedback || ''
    });
  };

  const handleSaveGrade = async () => {
    if (!selectedReg) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/exams/final-exams/registrations/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registration_id: selectedReg.id,
          score_lisan: gradingData.score_lisan,
          score_tulisan: gradingData.score_tulisan,
          feedback: gradingData.feedback
        })
      });
      const result = await response.json();
      if (result.success) {
        toast.success('Penilaian berhasil disimpan');
        setSelectedReg(null);
        fetchRegistrations();
      } else {
        toast.error(result.error || 'Gagal menyimpan nilai');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan server');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = registrations.filter(r => {
    const matchesSearch = r.user.full_name.toLowerCase().includes(search.toLowerCase());
    const matchesBatch = selectedBatch === 'all' || 
      r.schedule?.batch_id === selectedBatch || 
      (selectedBatch === 'batch_1_2' && (r.schedule?.batch?.name?.toLowerCase().includes('batch 1') || r.schedule?.batch?.name?.toLowerCase().includes('batch 2')));
    return matchesSearch && matchesBatch;
  });

  const sorted = [...filtered].sort((a, b) => {
    const dateA = a.schedule?.exam_date || '';
    const dateB = b.schedule?.exam_date || '';
    if (dateA !== dateB) {
      return dateA.localeCompare(dateB);
    }
    const timeA = a.schedule?.start_time || '';
    const timeB = b.schedule?.start_time || '';
    return timeA.localeCompare(timeB);
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* List Column */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="Cari thalibah..." 
              className="pl-10 rounded-xl border-gray-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="w-full sm:w-60">
            <Select value={selectedBatch} onValueChange={setSelectedBatch}>
              <SelectTrigger className="rounded-xl border-gray-200 bg-white">
                <SelectValue placeholder="Pilih Angkatan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Angkatan</SelectItem>
                <SelectItem value="batch_1_2" className="font-bold text-amber-900">
                  ⚡ Khusus Batch 1 &amp; 2
                </SelectItem>
                {batches.map(b => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-20">
            <Loader2 className="w-10 h-10 text-green-900 animate-spin" />
          </div>
        ) : sorted.length > 0 ? (
          <div className="space-y-3">
            {sorted.map((reg) => (
              <div 
                key={reg.id} 
                onClick={() => handleOpenGrading(reg)}
                className={cn(
                  "p-4 sm:p-5 rounded-2xl border bg-white flex items-center justify-between cursor-pointer transition-all duration-300 active:scale-[0.99] group",
                  selectedReg?.id === reg.id 
                    ? "border-green-800 bg-green-50/15 shadow-sm" 
                    : "border-gray-100 shadow-sm hover:shadow-md"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-green-50 group-hover:text-green-900 group-hover:border-green-100 transition-colors">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-gray-900 leading-tight">{reg.user.full_name}</h4>
                      {reg.schedule?.batch?.name && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                          {reg.schedule.batch.name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">
                      {reg.schedule.exam_type === 'oral' ? 'Ujian Lisan' : 'Ujian Tulisan'} • {new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeZone: 'Asia/Jakarta' }).format(new Date(reg.schedule.exam_date))}
                      {reg.schedule.start_time && ` • ${reg.schedule.start_time} - ${reg.schedule.end_time || ''} WIB`}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                        reg.status === 'completed' || reg.status === 'graded' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {reg.status === 'graded' ? 'Sudah Dinilai' : reg.status}
                      </span>
                      {reg.score_lisan !== null && (
                        <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                          Lisan: {reg.score_lisan}
                        </span>
                      )}
                      {reg.score_tulisan !== null && (
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                          Tulisan: {reg.score_tulisan}
                        </span>
                      )}
                      {reg.schedule.examiner?.full_name && (
                        <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                          Penguji: {formatExaminerName(reg.schedule.examiner.full_name)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronRight className={cn(
                  "w-5 h-5 transition-transform",
                  selectedReg?.id === reg.id ? "translate-x-1 text-green-900" : "text-gray-300"
                )} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center p-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <User className="w-16 h-16 mx-auto mb-4 opacity-10" />
            <p className="text-gray-400 font-bold">Tidak ada pendaftar ditemukan.</p>
          </div>
        )}
      </div>

      {/* Grading Column */}
      <div className="lg:col-span-1">
        {selectedReg ? (
          <Card className="rounded-3xl border border-gray-100 bg-white shadow-xl sticky top-24 overflow-hidden animate-fadeInRight">
            <div className="bg-gradient-to-br from-green-900 to-emerald-800 p-6 text-white">
              <h3 className="text-lg font-black tracking-tight">Form Penilaian Ujian</h3>
              <p className="text-xs text-green-100 opacity-80 mt-1">Berikan penilaian untuk {selectedReg.user.full_name}</p>
              {selectedReg.schedule?.batch?.name && (
                <div className="mt-2 inline-block bg-white/20 text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded-full">
                  {selectedReg.schedule.batch.name}
                </div>
              )}
            </div>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                    <Award className="w-3.5 h-3.5 text-emerald-700" />
                    Nilai Ujian Lisan (0-100)
                  </Label>
                  <Input 
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0"
                    className="rounded-xl border-gray-200 h-12 text-lg font-black"
                    value={gradingData.score_lisan}
                    onChange={(e) => setGradingData({...gradingData, score_lisan: parseInt(e.target.value) || 0})}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-black uppercase tracking-widest text-blue-800 flex items-center gap-2">
                      <PenTool className="w-3.5 h-3.5 text-blue-600" />
                      Nilai Ujian Tulisan Manual (0-100)
                    </Label>
                    <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                      Khusus Batch 1 &amp; 2
                    </span>
                  </div>
                  <Input 
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0"
                    className="rounded-xl border-blue-200 bg-blue-50/20 h-12 text-lg font-black text-blue-950 focus:border-blue-500"
                    value={gradingData.score_tulisan}
                    onChange={(e) => setGradingData({...gradingData, score_tulisan: parseInt(e.target.value) || 0})}
                  />
                  <p className="text-[10px] text-gray-500">
                    Ruang input nilai ujian tertulis manual untuk peserta Batch 1 &amp; 2 atau penginputan susulan.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Catatan / Feedback
                  </Label>
                  <Textarea 
                    placeholder="Contoh: Tajwid sangat bagus, kelancaran perlu ditingkatkan di akhir juz."
                    className="rounded-xl border-gray-200 min-h-[100px] text-sm"
                    value={gradingData.feedback}
                    onChange={(e) => setGradingData({...gradingData, feedback: e.target.value})}
                  />
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <Button 
                  onClick={handleSaveGrade}
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-green-900 hover:bg-green-800 text-white font-bold h-12 shadow-md shadow-green-900/10 active:scale-95 duration-200 transition-all"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Simpan Penilaian
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setSelectedReg(null)}
                  className="w-full text-gray-400 hover:text-gray-600 font-bold"
                >
                  Batal
                </Button>
              </div>

              <div className="pt-6 border-t border-gray-100 space-y-3">
                <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  <Clock className="w-3 h-3" />
                  Informasi Jadwal
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Tanggal:</span>
                    <span className="font-bold text-gray-900">
                      {new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeZone: 'Asia/Jakarta' }).format(new Date(selectedReg.schedule.exam_date))}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Waktu:</span>
                    <span className="font-bold text-gray-900">
                      {selectedReg.schedule.start_time} - {selectedReg.schedule.end_time || ''} WIB
                    </span>
                  </div>
                  {selectedReg.schedule.examiner?.full_name && (
                    <div className="flex justify-between text-xs border-t border-gray-200/50 pt-2 mt-2">
                      <span className="text-gray-500">Penguji:</span>
                      <span className="font-bold text-indigo-700">
                        {formatExaminerName(selectedReg.schedule.examiner.full_name)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="hidden lg:flex flex-col items-center justify-center h-full border border-dashed border-gray-200 bg-white rounded-[2rem] p-10 text-center space-y-4 shadow-sm">
             <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100/50 flex items-center justify-center text-gray-300">
                <Award className="w-8 h-8" />
             </div>
             <div>
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Panel Penilaian</h4>
                <p className="text-xs text-gray-300 font-medium">Pilih salah satu thalibah di daftar untuk memberikan nilai ujian lisan dan tulisan.</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
