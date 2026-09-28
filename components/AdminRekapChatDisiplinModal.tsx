'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Copy,
  Check,
  RefreshCw,
  Save,
  MessageSquare,
  AlertTriangle,
  Ban,
  UserX,
  FileCheck2,
  Sparkles,
  ChevronRight,
  Plus,
  Trash2,
  Share2,
  Calendar,
  Layers
} from 'lucide-react';
import { toast } from 'sonner';

export interface WeekEvaluationItem {
  week_number: number;
  label?: string;
  special_status?: string;
  sp1_names: string[];
  sp2_names: string[];
  do_names: string[];
  blacklist_names: string[];
  custom_note?: string;
}

interface BatchOption {
  id: string;
  name: string;
  is_active: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultBatchId?: string;
}

export function formatEvaluationToChat(weeks: WeekEvaluationItem[]): string {
  const sections: string[] = [];

  weeks.forEach((w) => {
    const hasContent =
      Boolean(w.special_status?.trim()) ||
      (w.sp1_names && w.sp1_names.length > 0) ||
      (w.sp2_names && w.sp2_names.length > 0) ||
      (w.do_names && w.do_names.length > 0) ||
      (w.blacklist_names && w.blacklist_names.length > 0) ||
      Boolean(w.custom_note?.trim());

    if (!hasContent) return;

    const lines: string[] = [];
    const pekanHeader = w.week_number === 1 ? '🧱Pekan 1' : `🧱Pekan ke ${w.week_number}`;
    lines.push(pekanHeader);
    lines.push('-----------------------------------');

    if (w.special_status?.trim()) {
      lines.push(w.special_status.trim());
      lines.push('');
    }

    if (w.blacklist_names && w.blacklist_names.length > 0) {
      lines.push('❌ Blacklist');
      w.blacklist_names.forEach((name, idx) => {
        lines.push(w.blacklist_names.length === 1 ? name : `${idx + 1}. ${name}`);
      });
      lines.push('');
    }

    if (w.do_names && w.do_names.length > 0) {
      lines.push('🚫DO');
      w.do_names.forEach((name, idx) => {
        lines.push(w.do_names.length === 1 ? name : `${idx + 1}. ${name}`);
      });
      lines.push('');
    }

    if (w.sp1_names && w.sp1_names.length > 0) {
      lines.push('🔺SP1');
      w.sp1_names.forEach((name, idx) => {
        lines.push(w.sp1_names.length === 1 ? name : `${idx + 1}. ${name}`);
      });
      lines.push('');
    }

    if (w.sp2_names && w.sp2_names.length > 0) {
      lines.push('🔺🔺SP2');
      w.sp2_names.forEach((name, idx) => {
        lines.push(w.sp2_names.length === 1 ? name : `${idx + 1}. ${name}`);
      });
      lines.push('');
    }

    if (w.custom_note?.trim()) {
      lines.push(w.custom_note.trim());
      lines.push('');
    }

    while (lines.length > 0 && lines[lines.length - 1] === '') {
      lines.pop();
    }

    sections.push(lines.join('\n'));
  });

  return sections.join('\n\n-----------------------------------\n');
}

export function AdminRekapChatDisiplinModal({
  isOpen,
  onClose,
  defaultBatchId
}: Props) {
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>(defaultBatchId || '');
  const [weeks, setWeeks] = useState<WeekEvaluationItem[]>([]);
  const [selectedWeekFilter, setSelectedWeekFilter] = useState<number | 'all'>('all');
  const [activeViewMode, setActiveViewMode] = useState<'editor' | 'raw_preview'>('editor');
  const [rawTextOverride, setRawTextOverride] = useState<string>('');
  const [isManualOverride, setIsManualOverride] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // New item input states
  const [inputCategory, setInputCategory] = useState<'sp1' | 'sp2' | 'do' | 'blacklist'>('sp1');
  const [inputName, setInputName] = useState('');
  const [activeWeekForInput, setActiveWeekForInput] = useState<number>(1);

  const fetchData = async (batchId?: string) => {
    try {
      setLoading(true);
      const url = new URL('/api/admin/evaluasi-pekanan', window.location.origin);
      if (batchId) url.searchParams.set('batch_id', batchId);

      const res = await fetch(url.toString(), { cache: 'no-store' });
      const json = await res.json();

      if (json.success && json.data) {
        setBatches(json.data.batches || []);
        if (!selectedBatchId && json.data.selected_batch_id) {
          setSelectedBatchId(json.data.selected_batch_id);
        }
        setWeeks(json.data.weeks || []);
        const formatted = json.data.formatted_chat || formatEvaluationToChat(json.data.weeks || []);
        setRawTextOverride(formatted);
        setIsManualOverride(false);
      }
    } catch (err: any) {
      console.error('Error loading evaluasi pekanan:', err);
      toast.error('Gagal memuat data evaluasi pekanan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData(selectedBatchId);
    }
  }, [isOpen, selectedBatchId]);

  // Keep raw preview synced if not manually overridden
  useEffect(() => {
    if (!isManualOverride && weeks.length > 0) {
      setRawTextOverride(formatEvaluationToChat(weeks));
    }
  }, [weeks, isManualOverride]);

  const handleCopyChat = (textToCopy?: string) => {
    const text = textToCopy || rawTextOverride;
    if (!text.trim()) {
      toast.error('Format chat masih kosong');
      return;
    }
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Format Rekap Chat WA berhasil disalin ke clipboard! 📋');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopySingleWeek = (weekItem: WeekEvaluationItem) => {
    const singleChat = formatEvaluationToChat([weekItem]);
    if (!singleChat.trim()) {
      toast.error(`Pekan ${weekItem.week_number} belum memiliki catatan`);
      return;
    }
    navigator.clipboard.writeText(singleChat);
    toast.success(`Rekap Chat Pekan ${weekItem.week_number} berhasil disalin! 📋`);
  };

  const handleSave = async () => {
    if (!selectedBatchId) {
      toast.error('Pilih batch terlebih dahulu');
      return;
    }
    try {
      setSaving(true);
      const res = await fetch('/api/admin/evaluasi-pekanan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch_id: selectedBatchId,
          weeks: weeks
        })
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Template rekap evaluasi pekanan berhasil disimpan! 💾');
      } else {
        toast.error(json.error || 'Gagal menyimpan');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Terjadi kesalahan saat menyimpan');
    } finally {
      setSaving(false);
    }
  };

  // Add name to list
  const handleAddName = (weekNum: number, category: 'sp1' | 'sp2' | 'do' | 'blacklist', name: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;

    setWeeks((prevWeeks) =>
      prevWeeks.map((w) => {
        if (w.week_number !== weekNum) return w;

        const updated = { ...w };
        if (category === 'sp1') {
          updated.sp1_names = [...(updated.sp1_names || []), cleanName];
        } else if (category === 'sp2') {
          updated.sp2_names = [...(updated.sp2_names || []), cleanName];
        } else if (category === 'do') {
          updated.do_names = [...(updated.do_names || []), cleanName];
        } else if (category === 'blacklist') {
          updated.blacklist_names = [...(updated.blacklist_names || []), cleanName];
        }
        return updated;
      })
    );
    setInputName('');
  };

  // Remove name from list
  const handleRemoveName = (weekNum: number, category: 'sp1' | 'sp2' | 'do' | 'blacklist', indexToRemove: number) => {
    setWeeks((prevWeeks) =>
      prevWeeks.map((w) => {
        if (w.week_number !== weekNum) return w;

        const updated = { ...w };
        if (category === 'sp1') {
          updated.sp1_names = updated.sp1_names.filter((_, idx) => idx !== indexToRemove);
        } else if (category === 'sp2') {
          updated.sp2_names = updated.sp2_names.filter((_, idx) => idx !== indexToRemove);
        } else if (category === 'do') {
          updated.do_names = updated.do_names.filter((_, idx) => idx !== indexToRemove);
        } else if (category === 'blacklist') {
          updated.blacklist_names = updated.blacklist_names.filter((_, idx) => idx !== indexToRemove);
        }
        return updated;
      })
    );
  };

  // Update special status (e.g. Tashih / Pemutihan / Catatan)
  const handleUpdateSpecialStatus = (weekNum: number, status: string) => {
    setWeeks((prevWeeks) =>
      prevWeeks.map((w) => (w.week_number === weekNum ? { ...w, special_status: status } : w))
    );
  };

  const filteredWeeks =
    selectedWeekFilter === 'all'
      ? weeks
      : weeks.filter((w) => w.week_number === selectedWeekFilter);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden flex flex-col p-0 rounded-3xl border-0 shadow-2xl bg-[#F8FAF9]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-800 p-6 text-white relative flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-emerald-300">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                  Template Rekap Chat Evaluasi Pekanan
                </DialogTitle>
                <DialogDescription className="text-emerald-200 text-xs sm:text-sm mt-0.5">
                  Format pesan WhatsApp otomatis untuk rekap mingguan Tashih, SP1, SP2, DO, Pemutihan, & Blacklist.
                </DialogDescription>
              </div>
            </div>

            {/* Batch Selector */}
            <div className="flex items-center gap-2">
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl px-3 py-2 border border-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id} className="text-gray-900 bg-white">
                    {b.name} {b.is_active ? '(Aktif)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/15">
            {/* View Switcher */}
            <div className="flex bg-black/20 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setActiveViewMode('editor')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeViewMode === 'editor'
                    ? 'bg-white text-emerald-950 shadow-md'
                    : 'text-emerald-100 hover:bg-white/10'
                }`}
              >
                <Layers className="w-3.5 h-3.5" /> Editor Interaktif
              </button>
              <button
                type="button"
                onClick={() => setActiveViewMode('raw_preview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeViewMode === 'raw_preview'
                    ? 'bg-white text-emerald-950 shadow-md'
                    : 'text-emerald-100 hover:bg-white/10'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" /> Pratinjau Teks WhatsApp
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => fetchData(selectedBatchId)}
                disabled={loading}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-xl text-xs font-bold h-9"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                Muat Ulang
              </Button>

              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || loading}
                className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold h-9 shadow-lg shadow-emerald-950/30"
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {saving ? 'Menyimpan...' : 'Simpan Data'}
              </Button>

              <Button
                size="sm"
                onClick={() => handleCopyChat()}
                className="bg-amber-500 hover:bg-amber-400 text-emerald-950 rounded-xl text-xs font-black h-9 shadow-lg shadow-amber-900/30"
              >
                {copied ? <Check className="w-4 h-4 mr-1.5 text-emerald-900" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                {copied ? 'Tersalin!' : 'Salin Semua Format Chat'}
              </Button>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeViewMode === 'editor' ? (
            <div className="space-y-6">
              {/* Week Selector Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                <span className="text-xs font-bold text-gray-500 flex-shrink-0 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Filter Pekan:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedWeekFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
                    selectedWeekFilter === 'all'
                      ? 'bg-emerald-800 text-white shadow-sm'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  Semua Pekan (1-14)
                </button>
                {weeks.map((w) => (
                  <button
                    key={w.week_number}
                    type="button"
                    onClick={() => setSelectedWeekFilter(w.week_number)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
                      selectedWeekFilter === w.week_number
                        ? 'bg-emerald-800 text-white shadow-sm'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    Pekan {w.week_number}
                    {w.special_status ? ` (${w.special_status})` : ''}
                  </button>
                ))}
              </div>

              {/* Quick Add Form */}
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs font-bold text-gray-500 flex-shrink-0">Tambah Entri ke:</span>
                  <select
                    value={activeWeekForInput}
                    onChange={(e) => setActiveWeekForInput(Number(e.target.value))}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {weeks.map((w) => (
                      <option key={w.week_number} value={w.week_number}>
                        Pekan {w.week_number}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={inputCategory}
                    onChange={(e) => setInputCategory(e.target.value as any)}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="sp1">🔺 SP1</option>
                    <option value="sp2">🔺🔺 SP2</option>
                    <option value="do">🚫 DO</option>
                    <option value="blacklist">❌ Blacklist</option>
                  </select>
                </div>

                <div className="flex-1 flex gap-2 w-full">
                  <Input
                    placeholder="Ketik nama thalibah lalu tekan Enter / Tambah..."
                    value={inputName}
                    onChange={(e) => setInputName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddName(activeWeekForInput, inputCategory, inputName);
                      }
                    }}
                    className="h-10 rounded-xl text-xs font-semibold"
                  />
                  <Button
                    type="button"
                    onClick={() => handleAddName(activeWeekForInput, inputCategory, inputName)}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold px-4"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Tambah
                  </Button>
                </div>
              </div>

              {/* Weekly Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredWeeks.map((week) => {
                  const isWeek1 = week.week_number === 1;
                  const isWeek6 = week.week_number === 6;

                  return (
                    <div
                      key={week.week_number}
                      className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group"
                    >
                      <div className="space-y-4">
                        {/* Card Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                          <div className="flex items-center gap-2">
                            <span className="text-base font-black text-gray-900 flex items-center gap-1.5">
                              🧱 Pekan {week.week_number === 1 ? '1' : `ke ${week.week_number}`}
                            </span>
                            {week.special_status && (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                {week.special_status}
                              </span>
                            )}
                          </div>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopySingleWeek(week)}
                            className="text-gray-500 hover:text-emerald-800 hover:bg-emerald-50 text-[11px] font-bold h-7 px-2 rounded-lg"
                            title={`Salin format chat pekan ${week.week_number}`}
                          >
                            <Copy className="w-3.5 h-3.5 mr-1" /> Salin Pekan Ini
                          </Button>
                        </div>

                        {/* Special Status Selector / Override */}
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-400 font-semibold text-[11px]">Status Khusus:</span>
                          <div className="flex gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleUpdateSpecialStatus(week.week_number, week.special_status === 'Tashih' ? '' : 'Tashih')}
                              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border transition-all ${
                                week.special_status === 'Tashih'
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-blue-50'
                              }`}
                            >
                              Tashih
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateSpecialStatus(week.week_number, week.special_status === 'Pemutihan' ? '' : 'Pemutihan')}
                              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border transition-all ${
                                week.special_status === 'Pemutihan'
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-emerald-50'
                              }`}
                            >
                              Pemutihan
                            </button>
                            {week.special_status && (
                              <button
                                type="button"
                                onClick={() => handleUpdateSpecialStatus(week.week_number, '')}
                                className="text-gray-400 hover:text-rose-500 text-[10px] underline ml-1"
                              >
                                Hapus
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Blacklist Section */}
                        {week.blacklist_names && week.blacklist_names.length > 0 && (
                          <div className="bg-red-50/60 p-3 rounded-xl border border-red-100 space-y-1.5">
                            <div className="text-xs font-black text-red-800 flex items-center gap-1.5">
                              <Ban className="w-3.5 h-3.5 text-red-600" />
                              ❌ Blacklist ({week.blacklist_names.length})
                            </div>
                            <div className="space-y-1 pl-1">
                              {week.blacklist_names.map((name, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs text-gray-800 font-semibold bg-white px-2.5 py-1 rounded-lg border border-red-100 shadow-2xl">
                                  <span>{week.blacklist_names.length === 1 ? name : `${idx + 1}. ${name}`}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveName(week.week_number, 'blacklist', idx)}
                                    className="text-gray-400 hover:text-red-600 ml-2"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* DO Section */}
                        {week.do_names && week.do_names.length > 0 && (
                          <div className="bg-rose-50/60 p-3 rounded-xl border border-rose-100 space-y-1.5">
                            <div className="text-xs font-black text-rose-800 flex items-center gap-1.5">
                              <UserX className="w-3.5 h-3.5 text-rose-600" />
                              🚫 DO ({week.do_names.length})
                            </div>
                            <div className="space-y-1 pl-1">
                              {week.do_names.map((name, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs text-gray-800 font-semibold bg-white px-2.5 py-1 rounded-lg border border-rose-100 shadow-2xl">
                                  <span>{week.do_names.length === 1 ? name : `${idx + 1}. ${name}`}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveName(week.week_number, 'do', idx)}
                                    className="text-gray-400 hover:text-rose-600 ml-2"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* SP1 Section */}
                        {week.sp1_names && week.sp1_names.length > 0 && (
                          <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-100 space-y-1.5">
                            <div className="text-xs font-black text-amber-800 flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                              🔺 SP1 ({week.sp1_names.length})
                            </div>
                            <div className="space-y-1 pl-1">
                              {week.sp1_names.map((name, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs text-gray-800 font-semibold bg-white px-2.5 py-1 rounded-lg border border-amber-100 shadow-2xl">
                                  <span>{week.sp1_names.length === 1 ? name : `${idx + 1}. ${name}`}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveName(week.week_number, 'sp1', idx)}
                                    className="text-gray-400 hover:text-amber-600 ml-2"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* SP2 Section */}
                        {week.sp2_names && week.sp2_names.length > 0 && (
                          <div className="bg-orange-50/60 p-3 rounded-xl border border-orange-100 space-y-1.5">
                            <div className="text-xs font-black text-orange-800 flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
                              🔺🔺 SP2 ({week.sp2_names.length})
                            </div>
                            <div className="space-y-1 pl-1">
                              {week.sp2_names.map((name, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs text-gray-800 font-semibold bg-white px-2.5 py-1 rounded-lg border border-orange-100 shadow-2xl">
                                  <span>{week.sp2_names.length === 1 ? name : `${idx + 1}. ${name}`}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveName(week.week_number, 'sp2', idx)}
                                    className="text-gray-400 hover:text-orange-600 ml-2"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Empty state for week without entries */}
                        {!week.special_status &&
                          (!week.blacklist_names || week.blacklist_names.length === 0) &&
                          (!week.do_names || week.do_names.length === 0) &&
                          (!week.sp1_names || week.sp1_names.length === 0) &&
                          (!week.sp2_names || week.sp2_names.length === 0) && (
                            <div className="py-4 text-center text-xs text-gray-400 italic bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                              Belum ada catatan SP / DO di pekan ini
                            </div>
                          )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Raw Text & Live Preview */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-gray-700 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  Pratinjau Teks Siap Kirim WhatsApp:
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsManualOverride(false);
                      setRawTextOverride(formatEvaluationToChat(weeks));
                      toast.success('Pratinjau di-reset sesuai data editor!');
                    }}
                    className="text-xs h-8 rounded-xl font-bold"
                  >
                    Reset Sesuai Editor
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleCopyChat(rawTextOverride)}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-8 rounded-xl font-bold"
                  >
                    <Copy className="w-3.5 h-3.5 mr-1" /> Salin Teks
                  </Button>
                </div>
              </div>

              {/* Chat Bubble Container */}
              <div className="bg-[#ECE5DD] p-4 sm:p-6 rounded-3xl border border-[#DAD2C8] shadow-inner relative">
                <div className="max-w-xl mx-auto bg-white p-5 rounded-2xl shadow-md border border-gray-200/80 font-mono text-xs sm:text-sm text-gray-900 leading-relaxed whitespace-pre-wrap select-all">
                  {rawTextOverride}
                </div>
              </div>

              {/* Editable Textarea */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-bold text-gray-600 block">
                  Edit Teks Manual Langsung (Opsional):
                </label>
                <Textarea
                  value={rawTextOverride}
                  onChange={(e) => {
                    setRawTextOverride(e.target.value);
                    setIsManualOverride(true);
                  }}
                  rows={12}
                  className="font-mono text-xs bg-white rounded-2xl border-gray-200 p-4 leading-relaxed focus:border-emerald-500"
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AdminRekapChatDisiplinModal;
