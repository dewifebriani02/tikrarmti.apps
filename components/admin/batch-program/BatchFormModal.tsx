'use client';

import { useState, useMemo } from 'react';
import { X, Calendar, Clock, ChevronRight, Save, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Batch, BATCH_STATUSES } from './types';

interface BatchFormModalProps {
  batch: Batch | null;
  programs?: import('./types').Program[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const extractDateTime = (value?: string | null, defaultTime: string = '00:01'): string => {
  if (!value) return '';
  if (value.includes('T')) {
    return value.substring(0, 16);
  }
  if (value.length === 10) {
    return `${value}T${defaultTime}`;
  }
  return '';
};

const calculateEndDate = (startDate: string, weeks: number): string => {
  if (!startDate || weeks <= 0) return '';
  const [datePart] = startDate.split('T');
  if (!datePart) return '';
  const start = new Date(`${datePart}T00:00:00Z`);
  const end = new Date(start);
  end.setDate(start.getDate() + weeks * 7 - 1);
  const endStr = end.toISOString().split('T')[0];
  return `${endStr}T23:59`;
};

export function BatchFormModal({ batch, programs = [], isOpen, onClose, onSuccess }: BatchFormModalProps) {
  const [formData, setFormData] = useState({
    id: batch?.id,
    name: batch?.name || '',
    description: batch?.description || '',
    start_date: extractDateTime(batch?.start_date, '00:01'),
    end_date: extractDateTime(batch?.end_date, '23:59'),
    registration_start_date: extractDateTime(batch?.registration_start_date, '00:01'),
    registration_end_date: extractDateTime(batch?.registration_end_date, '23:59'),
    duration_weeks: batch?.duration_weeks || 0,
    status: batch?.status || 'draft',
    program_type: batch?.program_type || '',
    total_quota: batch?.total_quota || 0,
    is_free: batch?.is_free ?? true,
    price: batch?.price || 0,
    min_exam_score: batch?.min_exam_score ?? (batch?.name ? (batch.name.match(/Batch\s*(\d+)/i) && parseInt(batch.name.match(/Batch\s*(\d+)/i)![1], 10) >= 3 ? 80 : 70) : 70),
    min_final_exam_score: batch?.min_final_exam_score ?? (batch?.name ? (batch.name.match(/Batch\s*(\d+)/i) && parseInt(batch.name.match(/Batch\s*(\d+)/i)![1], 10) >= 3 ? 80 : 70) : 70),
    whatsapp_group_link: batch?.whatsapp_group_link || '',
    group_reminder_link: batch?.group_reminder_link || '',
    group_diskusi_link: batch?.group_diskusi_link || '',
    selection_start_date: extractDateTime(batch?.selection_start_date, '00:01'),
    selection_end_date: extractDateTime(batch?.selection_end_date, '23:59'),
    selection_result_date: extractDateTime(batch?.selection_result_date, '00:01'),
    re_enrollment_date: extractDateTime(batch?.re_enrollment_date, '00:01'),
    opening_class_date: extractDateTime(batch?.opening_class_date, '00:01'),
    first_week_start_date: extractDateTime(batch?.first_week_start_date, '00:01'),
    first_week_end_date: extractDateTime(batch?.first_week_end_date, '23:59'),
    review_week_start_date: extractDateTime(batch?.review_week_start_date, '00:01'),
    review_week_end_date: extractDateTime(batch?.review_week_end_date, '23:59'),
    final_exam_start_date: extractDateTime(batch?.final_exam_start_date, '00:01'),
    final_exam_end_date: extractDateTime(batch?.final_exam_end_date, '23:59'),
    graduation_start_date: extractDateTime(batch?.graduation_start_date, '00:01'),
    graduation_end_date: extractDateTime(batch?.graduation_end_date, '23:59'),
    transfer_schedule_end_date: extractDateTime(batch?.transfer_schedule_end_date, '23:59'),
    holiday_dates: Array.isArray(batch?.holiday_dates) ? batch!.holiday_dates!.map(d => extractDateTime(d, '00:01').split('T')[0]) : [],
  });

  const [activeTab, setActiveTab] = useState<'batch' | 'tikrar' | 'pratikrar' | 'muallimah'>('batch');

  const getProgramData = (keyword: string) => {
    const p = (programs || []).find(p => p.name.toLowerCase().includes(keyword.toLowerCase()));
    return {
      id: p?.id,
      enabled: !!p,
      registration_start_date: extractDateTime(p?.registration_start_date, '00:01'),
      registration_end_date: extractDateTime(p?.registration_end_date, '23:59'),
      max_thalibah: p?.max_thalibah || 100,
    };
  };

  const [tikrarData, setTikrarData] = useState(() => getProgramData('tikrar'));
  const [pratikrarData, setPratikrarData] = useState(() => getProgramData('pra-tikrar'));
  const [muallimahData, setMuallimahData] = useState(() => getProgramData('muallimah'));

  const [saving, setSaving] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [holidayInput, setHolidayInput] = useState('');

  // Handle name change to automatically suggest defaults for batch 3+
  const handleNameChange = (name: string) => {
    const match = name.match(/Batch\s*(\d+)/i);
    let score = 70;
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= 3) {
        score = 80;
      }
    }
    setFormData(prev => ({
      ...prev,
      name,
      min_exam_score: prev.min_exam_score === 70 || prev.min_exam_score === 80 ? score : prev.min_exam_score,
      min_final_exam_score: prev.min_final_exam_score === 70 || prev.min_final_exam_score === 80 ? score : prev.min_final_exam_score,
    }));
  };

  const handleStartDateChange = (value: string) => {
    const newData = { ...formData, start_date: value };
    if (formData.duration_weeks > 0) {
      newData.end_date = calculateEndDate(value, formData.duration_weeks);
    }
    setFormData(newData);
  };

  const handleDurationChange = (weeks: number) => {
    const newData = { ...formData, duration_weeks: weeks };
    if (formData.start_date) {
      newData.end_date = calculateEndDate(formData.start_date, weeks);
    }
    setFormData(newData);
  };

  const handleAddHoliday = () => {
    if (!holidayInput) return;
    if (formData.holiday_dates.includes(holidayInput)) return;
    setFormData({
      ...formData,
      holiday_dates: [...formData.holiday_dates, holidayInput].sort(),
    });
    setHolidayInput('');
  };

  const dateWarnings = useMemo(() => {
    const warnings: string[] = [];
    const dates = [
      { name: 'Mulai Pendaftaran', value: formData.registration_start_date },
      { name: 'Selesai Pendaftaran', value: formData.registration_end_date },
      { name: 'Mulai Penilaian Seleksi', value: formData.selection_start_date },
      { name: 'Selesai Penilaian Seleksi', value: formData.selection_end_date },
      { name: 'Pengumuman Seleksi', value: formData.selection_result_date },
      { name: 'Mulai Daftar Ulang', value: formData.re_enrollment_date },
      { name: 'Opening Class', value: formData.opening_class_date },
    ];

    for (let i = 0; i < dates.length - 1; i++) {
      const current = dates[i];
      const next = dates[i + 1];
      if (current.value && next.value) {
        if (new Date(current.value) > new Date(next.value)) {
          warnings.push(`Tanggal ${current.name} tidak boleh lebih lambat dari ${next.name}.`);
        }
      }
    }
    return warnings;
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/admin/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error?.message || result.error || 'Gagal menyimpan batch');
        setSaving(false);
        return;
      }
      
      const batchId = result.data?.id || batch?.id;
      
      // Save programs
      if (batchId) {
        const programConfigs = [
          { name: 'Tikrar Tahfidz', data: tikrarData },
          { name: 'Pra-Tikrar', data: pratikrarData },
          { name: 'Muallimah', data: muallimahData }
        ];

        for (const config of programConfigs) {
          if (config.data.enabled) {
            const payload = {
              batch_id: batchId,
              name: config.name,
              status: 'open',
              max_thalibah: config.data.max_thalibah,
              registration_start_date: config.data.registration_start_date ? new Date(config.data.registration_start_date).toISOString() : null,
              registration_end_date: config.data.registration_end_date ? new Date(config.data.registration_end_date).toISOString() : null,
            };
            
            const method = config.data.id ? 'PUT' : 'POST';
            const url = config.data.id ? `/api/program/${config.data.id}` : '/api/program';
            
            await fetch(url, {
              method,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
          }
        }
      }

      toast.success(batch ? 'Batch dan Program berhasil diperbarui' : 'Batch dan Program berhasil dibuat');
      onSuccess();
    } catch (error) {
      console.error('Error saving batch:', error);
      toast.error('Gagal menyimpan batch');
    } finally {
      setSaving(false);
    }
  };

  const renderProgramTab = (name: string, data: any, setData: any) => (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex items-center gap-3 bg-purple-50 p-4 rounded-xl border border-purple-100">
        <input 
          type="checkbox" 
          checked={data.enabled} 
          onChange={e => setData({...data, enabled: e.target.checked})}
          className="w-5 h-5 rounded border-purple-300 text-purple-600 focus:ring-purple-600"
          id={`enable-${name}`}
        />
        <label htmlFor={`enable-${name}`} className="font-bold text-purple-900 cursor-pointer">
          Buka Program {name} di Batch ini
        </label>
      </div>

      {data.enabled && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Mulai Pendaftaran</label>
              <input
                type="datetime-local"
                value={data.registration_start_date}
                onChange={e => setData({...data, registration_start_date: e.target.value})}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-600/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Selesai Pendaftaran</label>
              <input
                type="datetime-local"
                value={data.registration_end_date}
                onChange={e => setData({...data, registration_end_date: e.target.value})}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-600/20"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Target Kuota (Maks. Thalibah)</label>
            <input
              type="number"
              value={data.max_thalibah}
              onChange={e => setData({...data, max_thalibah: parseInt(e.target.value) || 0})}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-600/20"
            />
          </div>
        </div>
      )}
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-900 to-green-800 p-6 flex items-center justify-between text-white relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-yellow-300 uppercase tracking-[0.2em] mb-1 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Batch Management
              </div>
              <h2 className="text-2xl font-bold">{batch ? 'Edit Batch' : 'Tambah Batch Baru'}</h2>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-8 bg-gray-50/50">
          <button
            type="button"
            onClick={() => setActiveTab('batch')}
            className={cn("px-4 py-3 text-sm font-medium border-b-2 transition-colors", activeTab === 'batch' ? "border-green-600 text-green-600" : "border-transparent text-gray-500 hover:text-gray-700")}
          >
            General Info (Batch)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tikrar')}
            className={cn("px-4 py-3 text-sm font-medium border-b-2 transition-colors", activeTab === 'tikrar' ? "border-green-600 text-green-600" : "border-transparent text-gray-500 hover:text-gray-700")}
          >
            Tahfidz Tikrar
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pratikrar')}
            className={cn("px-4 py-3 text-sm font-medium border-b-2 transition-colors", activeTab === 'pratikrar' ? "border-green-600 text-green-600" : "border-transparent text-gray-500 hover:text-gray-700")}
          >
            Pra-Tikrar
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('muallimah')}
            className={cn("px-4 py-3 text-sm font-medium border-b-2 transition-colors", activeTab === 'muallimah' ? "border-green-600 text-green-600" : "border-transparent text-gray-500 hover:text-gray-700")}
          >
            Muallimah
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-8 space-y-6">
            <div className={cn(activeTab === 'batch' ? 'block' : 'hidden')}>
              {/* Basic Info */}
              <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Informasi Dasar</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Nama Batch</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 bg-white"
                  >
                    {BATCH_STATUSES.map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Deskripsi</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 transition-all"
                />
              </div>
            </div>

            {/* Schedule */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Jadwal Batch</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Tanggal Mulai</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.start_date}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Durasi (Pekan)</label>
                  <input
                    type="number"
                    min="1"
                    max="52"
                    value={formData.duration_weeks || ''}
                    onChange={(e) => handleDurationChange(parseInt(e.target.value) || 0)}
                    placeholder="cth. 13"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Tanggal Selesai</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.end_date}
                    readOnly
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-700"
                    placeholder="Otomatis"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Dihitung otomatis dari mulai + durasi</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Pendaftaran Mulai</label>
                  <input
                    type="datetime-local"
                    value={formData.registration_start_date}
                    onChange={(e) => setFormData({ ...formData, registration_start_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Pendaftaran Selesai</label>
                  <input
                    type="datetime-local"
                    value={formData.registration_end_date}
                    onChange={(e) => setFormData({ ...formData, registration_end_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Nilai Minimum Ujian Seleksi</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={formData.min_exam_score}
                    onChange={(e) => setFormData({ ...formData, min_exam_score: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Nilai minimum kelulusan ujian seleksi masuk (tulis)</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Nilai Minimum Ujian Akhir (Kelulusan)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={formData.min_final_exam_score}
                    onChange={(e) => setFormData({ ...formData, min_final_exam_score: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Nilai minimum kelulusan program (final exam)</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Kuota Total</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.total_quota || ''}
                    onChange={(e) => setFormData({ ...formData, total_quota: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Biaya</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, is_free: !formData.is_free, price: formData.is_free ? formData.price : 0 })}
                      className={cn(
                        'px-3 py-2.5 rounded-xl border text-xs font-bold transition-all',
                        formData.is_free
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-white border-gray-200 text-gray-600'
                      )}
                    >
                      {formData.is_free ? 'GRATIS' : 'BERBAYAR'}
                    </button>
                    {!formData.is_free && (
                      <input
                        type="number"
                        min="0"
                        value={formData.price || ''}
                        onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                        placeholder="Rp"
                        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline (collapsible) */}
            <div className="border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setShowTimeline(!showTimeline)}
                className="flex items-center gap-2 w-full text-left group"
              >
                <ChevronRight className={cn('h-5 w-5 text-gray-400 transition-transform', showTimeline && 'rotate-90')} />
                <h3 className="text-sm font-bold text-gray-700 group-hover:text-green-700 transition-colors">
                  Konfigurasi Timeline
                </h3>
                <span className="text-[10px] text-gray-400 italic">opsional — untuk halaman Perjalanan Saya</span>
              </button>

              {showTimeline && (
                <div className="mt-4 space-y-4 pl-7">
                  {/* Selection Phase */}
                  <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                    <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">Fase Seleksi</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Mulai</label>
                        <input type="datetime-local" value={formData.selection_start_date} onChange={(e) => setFormData({ ...formData, selection_start_date: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Selesai</label>
                        <input type="datetime-local" value={formData.selection_end_date} onChange={(e) => setFormData({ ...formData, selection_end_date: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Pengumuman</label>
                        <input type="datetime-local" value={formData.selection_result_date} onChange={(e) => setFormData({ ...formData, selection_result_date: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                      </div>
                    </div>
                  </div>

                  {/* Re-enrollment & Opening */}
                  <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                    <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-3">Daftar Ulang & Pembukaan</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Daftar Ulang</label>
                        <input type="datetime-local" value={formData.re_enrollment_date} onChange={(e) => setFormData({ ...formData, re_enrollment_date: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Kelas Pembuka</label>
                        <input type="datetime-local" value={formData.opening_class_date} onChange={(e) => setFormData({ ...formData, opening_class_date: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                      </div>
                    </div>
                  </div>

                  {/* Learning Weeks */}
                  <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100">
                    <h4 className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-3">Pekan Pembelajaran</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Pekan 1 Mulai</label>
                        <input type="datetime-local" value={formData.first_week_start_date} onChange={(e) => setFormData({ ...formData, first_week_start_date: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Pekan 1 Selesai</label>
                        <input type="datetime-local" value={formData.first_week_end_date} onChange={(e) => setFormData({ ...formData, first_week_end_date: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Pekan 12 (Review) Mulai</label>
                        <input type="datetime-local" value={formData.review_week_start_date} onChange={(e) => setFormData({ ...formData, review_week_start_date: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Pekan 12 Selesai</label>
                        <input type="datetime-local" value={formData.review_week_end_date} onChange={(e) => setFormData({ ...formData, review_week_end_date: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                      </div>
                    </div>
                    <p className="text-[10px] text-purple-700 mt-2 italic">Pekan 2-11 akan dihitung otomatis</p>
                  </div>

                  {/* Final Exam & Graduation */}
                  <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                    <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-3">Ujian & Wisuda</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Pekan 13 (Ujian) Mulai</label>
                        <input type="datetime-local" value={formData.final_exam_start_date} onChange={(e) => setFormData({ ...formData, final_exam_start_date: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Pekan 13 Selesai</label>
                        <input type="datetime-local" value={formData.final_exam_end_date} onChange={(e) => setFormData({ ...formData, final_exam_end_date: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Pekan 14 (Wisuda) Mulai</label>
                        <input type="datetime-local" value={formData.graduation_start_date} onChange={(e) => setFormData({ ...formData, graduation_start_date: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Pekan 14 Selesai</label>
                        <input type="datetime-local" value={formData.graduation_end_date} onChange={(e) => setFormData({ ...formData, graduation_end_date: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                      </div>
                    </div>
                  </div>

                  {/* Transfer Schedule */}
                  <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100">
                    <h4 className="text-xs font-bold text-orange-700 uppercase tracking-wider mb-3">Mutasi Halaqah</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Batas Akhir Pindah Jadwal</label>
                        <input type="datetime-local" value={formData.transfer_schedule_end_date} onChange={(e) => setFormData({ ...formData, transfer_schedule_end_date: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                      </div>
                    </div>
                  </div>

                  {/* Holidays */}
                  <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100">
                    <h4 className="text-xs font-bold text-red-700 uppercase tracking-wider mb-3 flex items-center justify-between">
                      <span>Tanggal Libur & Break</span>
                      <span className="text-[9px] font-normal italic text-red-600">Pekan akan bergeser otomatis</span>
                    </h4>
                    <div className="flex gap-2 mb-3">
                      <input
                        type="date"
                        value={holidayInput}
                        onChange={(e) => setHolidayInput(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20"
                      />
                      <button
                        type="button"
                        onClick={handleAddHoliday}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                      >
                        Tambah
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.holiday_dates.length === 0 ? (
                        <p className="text-[10px] text-gray-400 italic">Belum ada tanggal libur.</p>
                      ) : (
                        formData.holiday_dates.map((date) => (
                          <div key={date} className="flex items-center gap-2 bg-white border border-red-200 px-2.5 py-1 rounded-full text-xs font-semibold text-red-800 shadow-sm">
                            <Clock className="w-3 h-3" />
                            {new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' })}
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, holiday_dates: formData.holiday_dates.filter(d => d !== date) })}
                              className="text-red-400 hover:text-red-700"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            </div>

            {activeTab === 'tikrar' && renderProgramTab('Tikrar Tahfidz', tikrarData, setTikrarData)}
            {activeTab === 'pratikrar' && renderProgramTab('Pra-Tikrar', pratikrarData, setPratikrarData)}
            {activeTab === 'muallimah' && renderProgramTab('Muallimah', muallimahData, setMuallimahData)}
          </div>

          {/* Footer */}
          <div className="px-8 py-5 border-t border-gray-100 bg-gray-50/30 flex items-center justify-between gap-3">
            <div className="flex-1">
              {dateWarnings.length > 0 && (
                <div className="bg-yellow-50 text-yellow-800 text-xs px-3 py-2 rounded-lg border border-yellow-200 mr-4">
                  <p className="font-bold mb-1">Perhatian (Urutan Tanggal Kurang Pas):</p>
                  <ul className="list-disc list-inside">
                    {dateWarnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-bold text-gray-700 transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-green-700 hover:bg-green-800 disabled:bg-gray-300 text-white text-sm font-bold transition-all shadow-sm flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Menyimpan...' : 'Simpan Batch'}
            </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
