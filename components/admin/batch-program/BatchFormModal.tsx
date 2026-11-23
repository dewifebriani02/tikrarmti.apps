'use client';

import { parseHolidayDates } from '@/lib/utils/holiday-helpers';

import { useState, useMemo } from 'react';
import { X, Calendar, Clock, Save, Sparkles, Wand2, Info, Layers, MessageCircle, Sliders, RotateCcw, ChevronDown, ChevronUp, Settings2 } from 'lucide-react';
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


export interface TimelineFormulaConfig {
  regStartDaysBefore: number;
  regEndDaysBefore: number;
  selectionStartDaysBefore: number;
  selectionEndDaysBefore: number;
  selectionResultDaysBefore: number;
  selectionResultTime: string;
  reEnrollDaysBefore: number;
  openingClassDaysBefore: number;
  openingClassTime: string;
  kbmRegularWeeks: number;
  transferScheduleDaysAfter: number;
}

export const DEFAULT_TIMELINE_FORMULA: TimelineFormulaConfig = {
  regStartDaysBefore: 35,
  regEndDaysBefore: 16,
  selectionStartDaysBefore: 15,
  selectionEndDaysBefore: 12,
  selectionResultDaysBefore: 11,
  selectionResultTime: '09:00',
  reEnrollDaysBefore: 10,
  openingClassDaysBefore: 1,
  openingClassTime: '09:00',
  kbmRegularWeeks: 11,
  transferScheduleDaysAfter: 13,
};

const calculateTimelineDates = (
  kbmStartDateStr: string,
  holidays: string[],
  formula: TimelineFormulaConfig = DEFAULT_TIMELINE_FORMULA
) => {
  const datePart = kbmStartDateStr.split('T')[0];
  if (!datePart) return null;

  const base = new Date(datePart + 'T00:00:00Z');
  if (isNaN(base.getTime())) return null;

  const formatOffset = (days: number, timeStr: string = '00:01') => {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + days);
    const iso = d.toISOString().split('T')[0];
    return iso + 'T' + timeStr;
  };

  // Dinamis sesuai rumus yang diatur / diedit mimin
  const regStart = formatOffset(-Math.abs(formula.regStartDaysBefore), '00:01');
  const regEnd = formatOffset(-Math.abs(formula.regEndDaysBefore), '23:59');
  const selStart = formatOffset(-Math.abs(formula.selectionStartDaysBefore), '00:01');
  const selEnd = formatOffset(-Math.abs(formula.selectionEndDaysBefore), '23:59');
  const selResult = formatOffset(-Math.abs(formula.selectionResultDaysBefore), formula.selectionResultTime || '09:00');
  const reEnroll = formatOffset(-Math.abs(formula.reEnrollDaysBefore), '00:01');
  const openingClass = formatOffset(-Math.abs(formula.openingClassDaysBefore), formula.openingClassTime || '09:00');

  // KBM Pekan 1
  const week1Start = formatOffset(0, '00:01');
  const week1End = formatOffset(6, '23:59');
  const transferEnd = formatOffset(formula.transferScheduleDaysAfter, '23:59');

  // Hitung jumlah hari libur yang jatuh pada atau setelah Pekan 1 KBM
  const sortedHolidays = parseHolidayDates(holidays);
  const kbmStartIso = datePart;
  const holidaysInKBM = sortedHolidays.filter(h => h >= kbmStartIso);
  const holidayShiftDays = holidaysInKBM.length;

  // KBM reguler = formula.kbmRegularWeeks * 7 hari
  const regKbmDays = Math.max(1, formula.kbmRegularWeeks) * 7;
  const revStartDay = regKbmDays + holidayShiftDays;
  const revEndDay = revStartDay + 6;
  const examStartDay = revEndDay + 1;
  const examEndDay = examStartDay + 6;

  const revWeekStart = formatOffset(revStartDay, '00:01');
  const revWeekEnd = formatOffset(revEndDay, '23:59');
  const examStart = formatOffset(examStartDay, '00:01');
  const examEnd = formatOffset(examEndDay, '23:59');

  const extraWeeks = Math.ceil(holidayShiftDays / 7);
  const durationWeeks = formula.kbmRegularWeeks + 2 + extraWeeks; // kbmRegularWeeks + Review(1) + Ujian Akhir(1) + extraWeeks

  return {
    start_date: week1Start,
    end_date: examEnd,
    duration_weeks: durationWeeks,
    registration_start_date: regStart,
    registration_end_date: regEnd,
    selection_start_date: selStart,
    selection_end_date: selEnd,
    selection_result_date: selResult,
    re_enrollment_date: reEnroll,
    opening_class_date: openingClass,
    first_week_start_date: week1Start,
    first_week_end_date: week1End,
    review_week_start_date: revWeekStart,
    review_week_end_date: revWeekEnd,
    final_exam_start_date: examStart,
    final_exam_end_date: examEnd,
    graduation_start_date: '',
    graduation_end_date: '',
    transfer_schedule_end_date: transferEnd,
    holidayShiftDays,
  };
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
    duration_weeks: batch?.duration_weeks || 13,
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
    selection_result_date: extractDateTime(batch?.selection_result_date, '09:00'),
    re_enrollment_date: extractDateTime(batch?.re_enrollment_date, '00:01'),
    opening_class_date: extractDateTime(batch?.opening_class_date, '09:00'),
    first_week_start_date: extractDateTime(batch?.first_week_start_date, '00:01'),
    first_week_end_date: extractDateTime(batch?.first_week_end_date, '23:59'),
    review_week_start_date: extractDateTime(batch?.review_week_start_date, '00:01'),
    review_week_end_date: extractDateTime(batch?.review_week_end_date, '23:59'),
    final_exam_start_date: extractDateTime(batch?.final_exam_start_date, '00:01'),
    final_exam_end_date: extractDateTime(batch?.final_exam_end_date, '23:59'),
    graduation_start_date: '',
    graduation_end_date: '',
    transfer_schedule_end_date: extractDateTime(batch?.transfer_schedule_end_date, '23:59'),
    holiday_dates: parseHolidayDates(batch?.holiday_dates),
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
  const [formulaConfig, setFormulaConfig] = useState<TimelineFormulaConfig>(DEFAULT_TIMELINE_FORMULA);
  const [showFormulaEditor, setShowFormulaEditor] = useState(false);
  const [holidayMode, setHolidayMode] = useState<'range' | 'single'>('range');
  const [holidayInput, setHolidayInput] = useState('');
  const [holidayRangeStart, setHolidayRangeStart] = useState('');
  const [holidayRangeEnd, setHolidayRangeEnd] = useState('');
  
  // Anchor date defaults to first_week_start_date, or start_date, or next Monday
  const [autoGenerateAnchorDate, setAutoGenerateAnchorDate] = useState(() => {
    const existing = (
      extractDateTime(batch?.first_week_start_date, '00:01').split('T')[0] ||
      extractDateTime(batch?.start_date, '00:01').split('T')[0] ||
      ''
    );
    if (existing) return existing;
    const d = new Date();
    const day = d.getDay();
    const diff = (8 - day) % 7 || 7;
    d.setDate(d.getDate() + diff);
    return d.toISOString().split('T')[0];
  });

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
    const newData = { ...formData, start_date: value, first_week_start_date: value };
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

  
  // Auto-shift KBM review, final exam, and end_date whenever holidays are modified
  const updateHolidaysWithAutoShift = (newHolidays: string[], successMsg?: string) => {
    const sorted = parseHolidayDates(newHolidays);
    const kbmStart = formData.first_week_start_date || formData.start_date;
    if (kbmStart) {
      const calc = calculateTimelineDates(kbmStart, sorted, formulaConfig);
      if (calc) {
        setFormData(prev => ({
          ...prev,
          holiday_dates: sorted,
          review_week_start_date: calc.review_week_start_date,
          review_week_end_date: calc.review_week_end_date,
          final_exam_start_date: calc.final_exam_start_date,
          final_exam_end_date: calc.final_exam_end_date,
          end_date: calc.end_date,
          duration_weeks: calc.duration_weeks,
          graduation_start_date: '',
          graduation_end_date: '',
        }));
        if (successMsg) toast.success(successMsg);
        return;
      }
    }

    setFormData(prev => ({
      ...prev,
      holiday_dates: sorted,
    }));
    if (successMsg) toast.success(successMsg);
  };

  const handleAddHoliday = () => {
    if (!holidayInput) return;
    if (formData.holiday_dates.includes(holidayInput)) {
      toast.info('Tanggal libur tersebut sudah terdaftar.');
      return;
    }
    const merged = [...formData.holiday_dates, holidayInput];
    updateHolidaysWithAutoShift(merged, '1 tanggal libur ditambahkan. Jadwal Pekan 12 Review, Ujian Akhir, dan Selesai Batch otomatis disesuaikan.');
    setHolidayInput('');
  };

  const handleAddHolidayRange = () => {
    if (!holidayRangeStart || !holidayRangeEnd) {
      toast.error('Silakan isi tanggal mulai dan tanggal selesai rentang libur.');
      return;
    }

    const [startY, startM, startD] = holidayRangeStart.split('-').map(Number);
    const [endY, endM, endD] = holidayRangeEnd.split('-').map(Number);
    const current = new Date(Date.UTC(startY, startM - 1, startD, 12, 0, 0));
    const end = new Date(Date.UTC(endY, endM - 1, endD, 12, 0, 0));

    if (current > end) {
      toast.error('Tanggal mulai tidak boleh lebih lambat dari tanggal selesai.');
      return;
    }

    const newDates: string[] = [];
    while (current <= end) {
      const y = current.getUTCFullYear();
      const m = String(current.getUTCMonth() + 1).padStart(2, '0');
      const d = String(current.getUTCDate()).padStart(2, '0');
      newDates.push(`${y}-${m}-${d}`);
      current.setUTCDate(current.getUTCDate() + 1);
    }

    const merged = Array.from(new Set([...formData.holiday_dates, ...newDates])).sort();
    const addedCount = merged.length - formData.holiday_dates.length;

    const startFormatted = new Date(holidayRangeStart + 'T12:00:00Z').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    const endFormatted = new Date(holidayRangeEnd + 'T12:00:00Z').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    updateHolidaysWithAutoShift(
      merged,
      `Berhasil menambahkan rentang libur ${startFormatted} - ${endFormatted} (${newDates.length} hari, ${addedCount} tanggal baru). Jadwal Pekan 12 Review, Ujian Akhir, dan Selesai Batch otomatis digeser!`
    );
    setHolidayRangeStart('');
    setHolidayRangeEnd('');
  };

  const handleClearAllHolidays = () => {
    if (window.confirm(`Hapus semua ${formData.holiday_dates.length} tanggal libur?`)) {
      updateHolidaysWithAutoShift([], 'Semua tanggal libur telah dikosongkan. Jadwal otomatis kembali ke standar 13 pekan.');
    }
  };

  // Auto-Generate complete, standardized MTI timeline (13 Pekan tanpa tasyakkur)
  const handleAutoGenerateTimeline = (customStartDate?: string) => {
    const rawDate = customStartDate || autoGenerateAnchorDate || formData.first_week_start_date || formData.start_date || '';
    const calc = calculateTimelineDates(rawDate, formData.holiday_dates, formulaConfig);

    if (!calc) {
      toast.error('Silakan tentukan Tanggal Mulai Pekan 1 (Senin KBM) yang valid.');
      return;
    }

    setFormData(prev => ({
      ...prev,
      start_date: calc.start_date,
      end_date: calc.end_date,
      duration_weeks: calc.duration_weeks,
      registration_start_date: calc.registration_start_date,
      registration_end_date: calc.registration_end_date,
      selection_start_date: calc.selection_start_date,
      selection_end_date: calc.selection_end_date,
      selection_result_date: calc.selection_result_date,
      re_enrollment_date: calc.re_enrollment_date,
      opening_class_date: calc.opening_class_date,
      first_week_start_date: calc.first_week_start_date,
      first_week_end_date: calc.first_week_end_date,
      review_week_start_date: calc.review_week_start_date,
      review_week_end_date: calc.review_week_end_date,
      final_exam_start_date: calc.final_exam_start_date,
      final_exam_end_date: calc.final_exam_end_date,
      graduation_start_date: '',
      graduation_end_date: '',
      transfer_schedule_end_date: calc.transfer_schedule_end_date,
    }));

    // Auto sync program registration dates
    setTikrarData(prev => ({
      ...prev,
      registration_start_date: calc.registration_start_date,
      registration_end_date: calc.registration_end_date,
    }));
    setPratikrarData(prev => ({
      ...prev,
      registration_start_date: calc.registration_start_date,
      registration_end_date: calc.registration_end_date,
    }));
    setMuallimahData(prev => ({
      ...prev,
      registration_start_date: calc.registration_start_date,
      registration_end_date: calc.registration_end_date,
    }));

    if (calc.holidayShiftDays > 0) {
      toast.success(`⚡ Jadwal 13 pekan berhasil dihitung otomatis (+${calc.holidayShiftDays} hari penyesuaian libur)!`);
    } else {
      toast.success('⚡ Seluruh alur jadwal standar 13 pekan (KBM 1-12 & Ujian Akhir) berhasil dihitung otomatis!');
    }
  };

  const dateWarnings = useMemo(() => {
    const warnings: string[] = [];
    const sequence = [
      { name: 'Pendaftaran Mulai', value: formData.registration_start_date },
      { name: 'Pendaftaran Selesai', value: formData.registration_end_date },
      { name: 'Mulai Penilaian Seleksi', value: formData.selection_start_date },
      { name: 'Selesai Penilaian Seleksi', value: formData.selection_end_date },
      { name: 'Pengumuman Seleksi', value: formData.selection_result_date },
      { name: 'Mulai Daftar Ulang', value: formData.re_enrollment_date },
      { name: 'Opening Class', value: formData.opening_class_date },
      { name: 'Pekan 1 Mulai (KBM)', value: formData.first_week_start_date },
      { name: 'Pekan 1 Selesai', value: formData.first_week_end_date },
      { name: 'Pekan 12 Review Mulai', value: formData.review_week_start_date },
      { name: 'Pekan 12 Review Selesai', value: formData.review_week_end_date },
      { name: 'Ujian Akhir Mulai', value: formData.final_exam_start_date },
      { name: 'Ujian Akhir Selesai', value: formData.final_exam_end_date },
    ];

    for (let i = 0; i < sequence.length - 1; i++) {
      const current = sequence[i];
      const next = sequence[i + 1];
      if (current.value && next.value) {
        if (new Date(current.value).getTime() > new Date(next.value).getTime()) {
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
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
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
            className={cn("px-4 py-3 text-sm font-medium border-b-2 transition-colors", activeTab === 'batch' ? "border-green-600 text-green-600 font-bold" : "border-transparent text-gray-500 hover:text-gray-700")}
          >
            General Info (Batch)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tikrar')}
            className={cn("px-4 py-3 text-sm font-medium border-b-2 transition-colors", activeTab === 'tikrar' ? "border-green-600 text-green-600 font-bold" : "border-transparent text-gray-500 hover:text-gray-700")}
          >
            Tikrar Tahfidz
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pratikrar')}
            className={cn("px-4 py-3 text-sm font-medium border-b-2 transition-colors", activeTab === 'pratikrar' ? "border-green-600 text-green-600 font-bold" : "border-transparent text-gray-500 hover:text-gray-700")}
          >
            Pra-Tikrar
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('muallimah')}
            className={cn("px-4 py-3 text-sm font-medium border-b-2 transition-colors", activeTab === 'muallimah' ? "border-green-600 text-green-600 font-bold" : "border-transparent text-gray-500 hover:text-gray-700")}
          >
            Muallimah
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 sm:p-8 space-y-8">
            <div className={cn(activeTab === 'batch' ? 'block space-y-8' : 'hidden')}>
              
              {/* TOP BANNER: Auto-Generate Timeline Praktis (1-Klik) + Editor Rumus Fleksibel Mimin */}
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-green-50 p-5 rounded-2xl border-2 border-emerald-300 shadow-sm relative overflow-hidden space-y-4">
                <div className="absolute -right-10 -bottom-10 w-36 h-36 bg-emerald-200/40 rounded-full blur-2xl pointer-events-none" />
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
                  <div className="flex items-start gap-3.5">
                    <button
                      type="button"
                      onClick={() => setShowFormulaEditor(prev => !prev)}
                      title="Klik untuk membuka/menutup pengaturan rumus fleksibel"
                      className="w-11 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/30 mt-0.5 cursor-pointer transition-all active:scale-95"
                    >
                      <Wand2 className="w-5 h-5" />
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-600 text-white uppercase tracking-wider">
                          Fitur Otomatis
                        </span>
                        <span className="text-xs font-semibold text-emerald-800">
                          Standar MTI (13 Pekan Fleksibel)
                        </span>
                      </div>
                      <h4 className="text-base font-black text-gray-900 mt-1">
                        Hitung Jadwal &amp; Timeline Otomatis (1-Klik)
                      </h4>
                      <p className="text-xs text-gray-600 mt-1 max-w-xl leading-relaxed">
                        Tentukan tanggal <strong>Senin Pekan 1 (Mulai KBM)</strong>. Mimin dapat langsung menghitung jadwal otomatis atau menyesuaikan parameter rumus fleksibel di bawah.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto shrink-0">
                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold text-emerald-800 uppercase mb-1">
                        Senin Pekan 1 KBM
                      </label>
                      <input
                        type="date"
                        value={autoGenerateAnchorDate}
                        onChange={(e) => setAutoGenerateAnchorDate(e.target.value)}
                        className="px-3.5 py-2 rounded-xl border border-emerald-300 bg-white text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 shadow-sm"
                      />
                    </div>
                    <div className="flex items-center gap-2 sm:self-end">
                      <button
                        type="button"
                        onClick={() => setShowFormulaEditor(prev => !prev)}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-emerald-300 bg-white hover:bg-emerald-100/50 text-emerald-900 font-bold text-xs shadow-xs transition-all whitespace-nowrap"
                      >
                        <Sliders className="w-3.5 h-3.5 text-emerald-700" />
                        <span>{showFormulaEditor ? 'Tutup Rumus' : '⚙️ Rumus Fleksibel'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAutoGenerateTimeline(autoGenerateAnchorDate)}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-bold text-xs shadow-md shadow-emerald-700/25 transition-all duration-200 whitespace-nowrap"
                      >
                        <Sparkles className="w-4 h-4" />
                        Hitung Jadwal Otomatis
                      </button>
                    </div>
                  </div>
                </div>

                {/* PANEL PENGATURAN RUMUS FLEKSIBEL (BISA DIEDIT MIMIN) */}
                {showFormulaEditor && (
                  <div className="relative z-10 pt-4 mt-2 border-t border-emerald-200/90 bg-white/80 backdrop-blur-sm p-4 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between border-b border-emerald-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Settings2 className="w-4 h-4 text-emerald-700" />
                        <h5 className="text-xs font-black uppercase tracking-wider text-emerald-950">
                          Pengaturan Parameter Rumus Fleksibel Jadwal
                        </h5>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFormulaConfig(DEFAULT_TIMELINE_FORMULA);
                          toast.info('Parameter rumus dikembalikan ke Standar MTI (13 Pekan).');
                        }}
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Reset ke Standar MTI
                      </button>
                    </div>

                    <p className="text-[11px] text-gray-600 leading-normal">
                      Mimin dapat mengubah jumlah hari mundur (H-...) sebelum KBM dimulai atau durasi KBM. Tanggal seluruh alur akan otomatis dihitung ulang sesuai rumus yang mimin tentukan di sini.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-2xs">
                        <label className="block text-[10px] font-extrabold text-gray-700 uppercase mb-1">
                          Pendaftaran Buka (H-...)
                        </label>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-emerald-800">H-</span>
                          <input
                            type="number"
                            min="1"
                            max="120"
                            value={formulaConfig.regStartDaysBefore}
                            onChange={(e) => setFormulaConfig(prev => ({ ...prev, regStartDaysBefore: parseInt(e.target.value) || 0 }))}
                            className="w-full px-2 py-1 text-xs font-bold rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                          <span className="text-[10px] text-gray-500">hari</span>
                        </div>
                      </div>

                      <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-2xs">
                        <label className="block text-[10px] font-extrabold text-gray-700 uppercase mb-1">
                          Pendaftaran Tutup (H-...)
                        </label>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-emerald-800">H-</span>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={formulaConfig.regEndDaysBefore}
                            onChange={(e) => setFormulaConfig(prev => ({ ...prev, regEndDaysBefore: parseInt(e.target.value) || 0 }))}
                            className="w-full px-2 py-1 text-xs font-bold rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                          <span className="text-[10px] text-gray-500">hari</span>
                        </div>
                      </div>

                      <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-2xs">
                        <label className="block text-[10px] font-extrabold text-gray-700 uppercase mb-1">
                          Mulai Seleksi (H-...)
                        </label>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-emerald-800">H-</span>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={formulaConfig.selectionStartDaysBefore}
                            onChange={(e) => setFormulaConfig(prev => ({ ...prev, selectionStartDaysBefore: parseInt(e.target.value) || 0 }))}
                            className="w-full px-2 py-1 text-xs font-bold rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                          <span className="text-[10px] text-gray-500">hari</span>
                        </div>
                      </div>

                      <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-2xs">
                        <label className="block text-[10px] font-extrabold text-gray-700 uppercase mb-1">
                          Selesai Seleksi (H-...)
                        </label>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-emerald-800">H-</span>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={formulaConfig.selectionEndDaysBefore}
                            onChange={(e) => setFormulaConfig(prev => ({ ...prev, selectionEndDaysBefore: parseInt(e.target.value) || 0 }))}
                            className="w-full px-2 py-1 text-xs font-bold rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                          <span className="text-[10px] text-gray-500">hari</span>
                        </div>
                      </div>

                      <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-2xs">
                        <label className="block text-[10px] font-extrabold text-gray-700 uppercase mb-1">
                          Pengumuman Seleksi (H-...)
                        </label>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-emerald-800">H-</span>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={formulaConfig.selectionResultDaysBefore}
                            onChange={(e) => setFormulaConfig(prev => ({ ...prev, selectionResultDaysBefore: parseInt(e.target.value) || 0 }))}
                            className="w-full px-2 py-1 text-xs font-bold rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                          <span className="text-[10px] text-gray-500">hari</span>
                        </div>
                      </div>

                      <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-2xs">
                        <label className="block text-[10px] font-extrabold text-gray-700 uppercase mb-1">
                          Mulai Daftar Ulang (H-...)
                        </label>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-emerald-800">H-</span>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={formulaConfig.reEnrollDaysBefore}
                            onChange={(e) => setFormulaConfig(prev => ({ ...prev, reEnrollDaysBefore: parseInt(e.target.value) || 0 }))}
                            className="w-full px-2 py-1 text-xs font-bold rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                          <span className="text-[10px] text-gray-500">hari</span>
                        </div>
                      </div>

                      <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-2xs">
                        <label className="block text-[10px] font-extrabold text-gray-700 uppercase mb-1">
                          Opening Class (H-...)
                        </label>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-emerald-800">H-</span>
                          <input
                            type="number"
                            min="0"
                            max="60"
                            value={formulaConfig.openingClassDaysBefore}
                            onChange={(e) => setFormulaConfig(prev => ({ ...prev, openingClassDaysBefore: parseInt(e.target.value) || 0 }))}
                            className="w-full px-2 py-1 text-xs font-bold rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                          <span className="text-[10px] text-gray-500">hari</span>
                        </div>
                      </div>

                      <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-2xs">
                        <label className="block text-[10px] font-extrabold text-gray-700 uppercase mb-1">
                          KBM Reguler (Pekan)
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="1"
                            max="52"
                            value={formulaConfig.kbmRegularWeeks}
                            onChange={(e) => setFormulaConfig(prev => ({ ...prev, kbmRegularWeeks: parseInt(e.target.value) || 11 }))}
                            className="w-full px-2 py-1 text-xs font-bold rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                          <span className="text-[10px] text-gray-500">+2 Pekan</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          handleAutoGenerateTimeline(autoGenerateAnchorDate);
                          setShowFormulaEditor(false);
                        }}
                        className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Terapkan Rumus &amp; Hitung Ulang Jadwal
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 1. Informasi Dasar & Ketentuan Kelas */}
              <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-200/80 space-y-4">
                <div className="flex items-center gap-2 text-gray-800 font-bold text-sm border-b border-gray-200/60 pb-2.5">
                  <Info className="w-4 h-4 text-green-700" />
                  <h3>1. Informasi Dasar &amp; Ketentuan Program</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                      Nama Batch <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="cth. Batch 4 - Tahun 2026"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 transition-all text-sm font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                      Status Batch <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 text-sm font-medium"
                    >
                      <option value="open">Open (Otomatis: Masa Registrasi)</option>
                      <option value="ongoing">Ongoing (Otomatis: Kelas Berjalan)</option>
                      <option value="closed">Closed (Otomatis: Siklus Selesai)</option>
                      <option value="archived">Archived (Manual: Diarsipkan Admin)</option>
                      <option value="draft">Draft (Persiapan)</option>
                    </select>
                    <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                      ℹ️ Status otomatis bergerak sesuai tanggal: <b>Open</b> (Registrasi) ➔ <b>Ongoing</b> (KBM/Ujian) ➔ <b>Closed</b> (Siklus Selesai). Pilih <b>Archived</b> jika ingin mengarsipkan batch ini secara manual.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Deskripsi Batch</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    placeholder="Keterangan singkat mengenai batch ini..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 transition-all text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Kuota Total Peserta</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.total_quota || ''}
                      onChange={(e) => setFormData({ ...formData, total_quota: parseInt(e.target.value) || 0 })}
                      placeholder="cth. 100"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Biaya Pendaftaran / Program</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, is_free: !formData.is_free, price: formData.is_free ? formData.price : 0 })}
                        className={cn(
                          'px-4 py-2.5 rounded-xl border text-xs font-extrabold transition-all',
                          formData.is_free
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-sm'
                            : 'bg-white border-gray-300 text-gray-600'
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
                          placeholder="Nominal Rp"
                          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 text-sm font-semibold"
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Nilai Minimum Seleksi Masuk</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      required
                      value={formData.min_exam_score}
                      onChange={(e) => setFormData({ ...formData, min_exam_score: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 text-sm font-bold"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">Ambang batas kelulusan tes tulis seleksi masuk</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Nilai Minimum Ujian Akhir (Kelulusan)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      required
                      value={formData.min_final_exam_score}
                      onChange={(e) => setFormData({ ...formData, min_final_exam_score: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 text-sm font-bold"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">Ambang batas kelulusan program (Pekan 13)</p>
                  </div>
                </div>
              </div>

              {/* 2. Periode Utama Batch (KBM) */}
              <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-200/80 space-y-4">
                <div className="flex items-center gap-2 text-gray-800 font-bold text-sm border-b border-gray-200/60 pb-2.5">
                  <Calendar className="w-4 h-4 text-green-700" />
                  <h3>2. Periode Utama Batch</h3>
                  <span className="text-[11px] text-gray-500 font-normal ml-auto">(Rentang Waktu KBM sampai Ujian Akhir)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                      Mulai KBM (Pekan 1) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.start_date}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 text-sm font-semibold"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">Hari Senin dimulainya halaqah Pekan 1</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                      Durasi Batch (Pekan) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="52"
                      value={formData.duration_weeks || ''}
                      onChange={(e) => handleDurationChange(parseInt(e.target.value) || 0)}
                      placeholder="13"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 text-sm font-bold text-center"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">Standar MTI: 13 Pekan (12 KBM & Muraja'ah + 1 Ujian Akhir)</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                      Selesai Batch (Akhir Pekan 13) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.end_date}
                      readOnly
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 bg-gray-100 text-gray-700 text-sm font-semibold"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">Dihitung otomatis (Mulai + Durasi pekan)</p>
                  </div>
                </div>
              </div>

              {/* 3. Alur Timeline Runtut (Kronologis & Tanpa Pengulangan) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <div className="flex items-center gap-2 text-gray-800 font-bold text-sm">
                    <Layers className="w-4 h-4 text-green-700" />
                    <h3>3. Rincian Alur Timeline (Runtut &amp; Anti-Bentrok)</h3>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-green-100 text-green-800 font-bold">
                    Kronologis
                  </span>
                </div>

                {/* Fase 1: Pendaftaran & Seleksi Masuk */}
                <div className="bg-blue-50/60 p-4 sm:p-5 rounded-2xl border border-blue-200 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-black flex items-center justify-center">
                        1
                      </span>
                      <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                        Fase Pendaftaran &amp; Seleksi (Pra-KBM)
                      </h4>
                    </div>
                    <span className="text-[10px] text-blue-700 font-semibold">H-35 s.d. H-1 sebelum KBM</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                        Pendaftaran Mulai (H-35)
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.registration_start_date}
                        onChange={(e) => setFormData({ ...formData, registration_start_date: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-xs font-medium focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                        Pendaftaran Selesai (H-16)
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.registration_end_date}
                        onChange={(e) => setFormData({ ...formData, registration_end_date: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-xs font-medium focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1 border-t border-blue-100">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                        Mulai Penilaian Seleksi (H-15)
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.selection_start_date}
                        onChange={(e) => setFormData({ ...formData, selection_start_date: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-xs font-medium focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                        Selesai Penilaian Seleksi (H-12)
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.selection_end_date}
                        onChange={(e) => setFormData({ ...formData, selection_end_date: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-xs font-medium focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                        Pengumuman Hasil Seleksi (H-11)
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.selection_result_date}
                        onChange={(e) => setFormData({ ...formData, selection_result_date: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-xs font-medium focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1 border-t border-blue-100">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                        Mulai Daftar Ulang (H-10)
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.re_enrollment_date}
                        onChange={(e) => setFormData({ ...formData, re_enrollment_date: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-xs font-medium focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                        Kelas Pembuka / Opening Class (H-1)
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.opening_class_date}
                        onChange={(e) => setFormData({ ...formData, opening_class_date: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-xs font-medium focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Fase 2: KBM Halaqah (Pekan 1 - 12) */}
                <div className="bg-purple-50/60 p-4 sm:p-5 rounded-2xl border border-purple-200 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[11px] font-black flex items-center justify-center">
                        2
                      </span>
                      <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                        Fase KBM Halaqah (Pekan 1 s.d. 12)
                      </h4>
                    </div>
                    <span className="text-[10px] text-purple-700 font-semibold">12 Pekan Pembelajaran</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                        Pekan 1 Mulai
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.first_week_start_date}
                        onChange={(e) => setFormData({ ...formData, first_week_start_date: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-xs font-medium focus:ring-2 focus:ring-purple-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                        Pekan 1 Selesai
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.first_week_end_date}
                        onChange={(e) => setFormData({ ...formData, first_week_end_date: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-xs font-medium focus:ring-2 focus:ring-purple-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                        Batas Akhir Mutasi Halaqah
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.transfer_schedule_end_date}
                        onChange={(e) => setFormData({ ...formData, transfer_schedule_end_date: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-xs font-medium focus:ring-2 focus:ring-purple-500/20"
                      />
                      <p className="text-[9px] text-purple-700 mt-1 font-semibold">Ahad Pekan ke-2</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1 border-t border-purple-100">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                        Pekan 12 (Review / Muraja&apos;ah) Mulai
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.review_week_start_date}
                        onChange={(e) => setFormData({ ...formData, review_week_start_date: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-xs font-medium focus:ring-2 focus:ring-purple-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                        Pekan 12 (Review / Muraja&apos;ah) Selesai
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.review_week_end_date}
                        onChange={(e) => setFormData({ ...formData, review_week_end_date: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-xs font-medium focus:ring-2 focus:ring-purple-500/20"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-purple-700 italic">* Pekan 2 s/d 11 dihitung otomatis berkelanjutan setiap pekan.</p>
                </div>

                {/* Fase 3: Evaluasi Akhir (Pekan 13) */}
                <div className="bg-amber-50/60 p-4 sm:p-5 rounded-2xl border border-amber-200 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-600 text-white text-[11px] font-black flex items-center justify-center">
                        3
                      </span>
                      <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                        Fase Evaluasi Akhir (Pekan 13)
                      </h4>
                    </div>
                    <span className="text-[10px] text-amber-700 font-semibold">Ujian Akhir Tahfidz</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                        Pekan 13 (Ujian Akhir) Mulai
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.final_exam_start_date}
                        onChange={(e) => setFormData({ ...formData, final_exam_start_date: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-xs font-medium focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                        Pekan 13 (Ujian Akhir) Selesai
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.final_exam_end_date}
                        onChange={(e) => setFormData({ ...formData, final_exam_end_date: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-xs font-medium focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Fase 4: Tanggal Libur & Break */}
                <div className="bg-red-50/50 p-4 sm:p-5 rounded-2xl border border-red-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h4 className="text-xs font-bold text-red-900 uppercase tracking-wider flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-red-600" />
                      Tanggal Libur &amp; Break (Opsional)
                    </h4>
                    <span className="text-[10px] text-red-600 italic">Pekan KBM akan bergeser otomatis</span>
                  </div>

                  {/* Mode Selector */}
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-[11px] font-bold text-gray-600">Metode Input:</span>
                    <div className="flex items-center bg-white p-0.5 rounded-lg border border-red-200 text-xs">
                      <button
                        type="button"
                        onClick={() => setHolidayMode('range')}
                        className={cn(
                          'px-3 py-1 rounded-md font-semibold transition-all',
                          holidayMode === 'range'
                            ? 'bg-red-600 text-white shadow-xs'
                            : 'text-gray-600 hover:text-gray-900'
                        )}
                      >
                        Rentang Tanggal (cth. 1 - 21 Maret)
                      </button>
                      <button
                        type="button"
                        onClick={() => setHolidayMode('single')}
                        className={cn(
                          'px-3 py-1 rounded-md font-semibold transition-all',
                          holidayMode === 'single'
                            ? 'bg-red-600 text-white shadow-xs'
                            : 'text-gray-600 hover:text-gray-900'
                        )}
                      >
                        Satu Tanggal
                      </button>
                    </div>
                  </div>

                  {/* Input by Range */}
                  {holidayMode === 'range' ? (
                    <div className="bg-white p-3 rounded-xl border border-red-200 space-y-2.5 shadow-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                            Mulai Libur (Dari Tanggal)
                          </label>
                          <input
                            type="date"
                            value={holidayRangeStart}
                            onChange={(e) => setHolidayRangeStart(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                            Selesai Libur (Sampai Tanggal)
                          </label>
                          <input
                            type="date"
                            value={holidayRangeEnd}
                            onChange={(e) => setHolidayRangeEnd(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddHolidayRange}
                        className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Tambahkan Seluruh Hari Libur dalam Rentang Tanggal</span>
                      </button>
                    </div>
                  ) : (
                    /* Input Single Date */
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={holidayInput}
                        onChange={(e) => setHolidayInput(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl border border-gray-300 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20"
                      />
                      <button
                        type="button"
                        onClick={handleAddHoliday}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                      >
                        Tambah
                      </button>
                    </div>
                  )}

                  {/* Header list & Clear all */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] font-bold text-red-950">
                      Daftar Tanggal Libur ({formData.holiday_dates.length} Hari) {formData.holiday_dates.length > 0 && <span className="text-emerald-700 font-normal">· Jadwal otomatis digeser +{formData.holiday_dates.length} hari</span>}
                    </span>
                    {formData.holiday_dates.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAllHolidays}
                        className="text-[10px] font-bold text-red-600 hover:text-red-800 underline cursor-pointer"
                      >
                        Hapus Semua
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-0.5 max-h-40 overflow-y-auto p-1">
                    {formData.holiday_dates.length === 0 ? (
                      <p className="text-[11px] text-gray-400 italic">Belum ada tanggal libur yang ditambahkan.</p>
                    ) : (
                      formData.holiday_dates.map((date) => (
                        <div key={date} className="flex items-center gap-1.5 bg-white border border-red-200 px-2.5 py-1 rounded-full text-[11px] font-semibold text-red-800 shadow-xs">
                          <span>{new Date(date + 'T12:00:00Z').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' })}</span>
                          <button
                            type="button"
                            onClick={() => updateHolidaysWithAutoShift(formData.holiday_dates.filter(d => d !== date), 'Tanggal libur dihapus. Jadwal otomatis disesuaikan.')}
                            className="text-red-400 hover:text-red-700 ml-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Link Komunikasi WhatsApp */}
                <div className="bg-gray-50/50 p-4 sm:p-5 rounded-2xl border border-gray-200/80 space-y-3">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                    <MessageCircle className="w-3.5 h-3.5 text-green-700" />
                    Link Komunikasi &amp; Grup WhatsApp (Opsional)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Grup Utama Batch</label>
                      <input
                        type="url"
                        value={formData.whatsapp_group_link}
                        onChange={(e) => setFormData({ ...formData, whatsapp_group_link: e.target.value })}
                        placeholder="https://chat.whatsapp.com/..."
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Grup Pengingat (Reminder)</label>
                      <input
                        type="url"
                        value={formData.group_reminder_link}
                        onChange={(e) => setFormData({ ...formData, group_reminder_link: e.target.value })}
                        placeholder="https://chat.whatsapp.com/..."
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Grup Diskusi</label>
                      <input
                        type="url"
                        value={formData.group_diskusi_link}
                        onChange={(e) => setFormData({ ...formData, group_diskusi_link: e.target.value })}
                        placeholder="https://chat.whatsapp.com/..."
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-xs"
                      />
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {activeTab === 'tikrar' && renderProgramTab('Tikrar Tahfidz', tikrarData, setTikrarData)}
            {activeTab === 'pratikrar' && renderProgramTab('Pra-Tikrar', pratikrarData, setPratikrarData)}
            {activeTab === 'muallimah' && renderProgramTab('Muallimah', muallimahData, setMuallimahData)}
          </div>

          {/* Footer */}
          <div className="px-6 sm:px-8 py-5 border-t border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex-1">
              {dateWarnings.length > 0 && (
                <div className="bg-amber-50 text-amber-900 text-xs px-3.5 py-2.5 rounded-xl border border-amber-200 mr-0 sm:mr-4 shadow-sm">
                  <p className="font-bold mb-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    Perhatian Urutan Tanggal:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    {dateWarnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-sm font-bold text-gray-700 transition-all shadow-sm"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-green-700 hover:bg-green-800 disabled:bg-gray-300 text-white text-sm font-bold transition-all shadow-md shadow-green-700/20 flex items-center gap-2"
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
