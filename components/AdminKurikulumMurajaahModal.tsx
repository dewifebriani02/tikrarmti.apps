'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BookOpen, Copy, CheckCircle2, Calendar, Sparkles, GraduationCap, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { 
  MURAJAAH_SCHEDULE, 
  generateMurajaahDailyText, 
  generateMurajaahWeeklyRecap,
  generatePengumumanUjianAkhir,
  generatePanduanMurajaah40x,
  getDefaultMurajaahStartDate,
  getMurajaahDate,
  JuzOptionLike,
  MurajaahScheduleItem
} from '@/lib/kurikulum-murajaah';

interface AdminKurikulumMurajaahModalProps {
  isOpen: boolean;
  onClose: () => void;
  juzOptions?: JuzOptionLike[];
}

export function AdminKurikulumMurajaahModal({
  isOpen,
  onClose,
  juzOptions: initialJuzOptions,
}: AdminKurikulumMurajaahModalProps) {
  const [juzList, setJuzList] = useState<JuzOptionLike[]>(initialJuzOptions || []);
  const [selectedMode, setSelectedMode] = useState<'recap' | 'ujian' | 'panduan40x' | string>('recap');
  const [customText, setCustomText] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [weekStartDate, setWeekStartDate] = useState<string>(() => {
    const d = getDefaultMurajaahStartDate();
    return d.toISOString().split('T')[0];
  });

  // Fetch juz options if not provided
  useEffect(() => {
    if (!initialJuzOptions || initialJuzOptions.length === 0) {
      fetch('/api/juz')
        .then(res => res.json())
        .then(data => {
          if (data?.data) {
            setJuzList(data.data);
          }
        })
        .catch(err => console.error('Error fetching juz options in modal:', err));
    } else {
      setJuzList(initialJuzOptions);
    }
  }, [initialJuzOptions]);

  // Generate text whenever selectedMode or weekStartDate or juzList changes
  useEffect(() => {
    const mondayObj = new Date(weekStartDate + 'T12:00:00');
    if (selectedMode === 'recap') {
      const text = generateMurajaahWeeklyRecap({ startDate: mondayObj, juzOptions: juzList });
      setCustomText(text);
    } else if (selectedMode === 'ujian') {
      const text = generatePengumumanUjianAkhir();
      setCustomText(text);
    } else if (selectedMode === 'panduan40x') {
      const text = generatePanduanMurajaah40x();
      setCustomText(text);
    } else {
      const scheduleItem = MURAJAAH_SCHEDULE.find(m => m.code === selectedMode) || MURAJAAH_SCHEDULE[0];
      const targetDate = getMurajaahDate(mondayObj, scheduleItem.code);
      const text = generateMurajaahDailyText({ item: scheduleItem, date: targetDate, juzOptions: juzList });
      setCustomText(text);
    }
  }, [selectedMode, weekStartDate, juzList]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(customText);
      setIsCopied(true);
      toast.success('Teks berhasil disalin ke clipboard!');
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      toast.error('Gagal menyalin teks ke clipboard');
    }
  };

  const mondayDate = new Date(weekStartDate + 'T12:00:00');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-4 sm:p-6 rounded-2xl overflow-hidden">
        <DialogHeader className="space-y-1 pb-2 border-b border-gray-100">
          <div className="flex items-center gap-2 text-amber-600 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Template Broadcast & Kurikulum WhatsApp</span>
          </div>
          <DialogTitle className="text-lg sm:text-xl font-black text-gray-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-700" />
            Template Chat & Kurikulum Muraja'ah
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500">
            Pilih template kurikulum muraja'ah, pengumuman ujian akhir, atau panduan 40x untuk disalin langsung ke WhatsApp.
          </DialogDescription>
        </DialogHeader>

        {/* Tab Mode Selector */}
        <div className="space-y-2.5 pt-3">
          {/* Main Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-gray-100 pb-2">
            <button
              type="button"
              onClick={() => setSelectedMode('recap')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedMode === 'recap'
                  ? 'bg-emerald-800 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
              }`}
            >
              📢 Muraja'ah Sepekan (M1–M7)
            </button>

            <button
              type="button"
              onClick={() => setSelectedMode('ujian')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedMode === 'ujian'
                  ? 'bg-purple-800 text-white shadow-sm'
                  : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200/60'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Pengumuman Ujian Akhir</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedMode('panduan40x')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedMode === 'panduan40x'
                  ? 'bg-teal-800 text-white shadow-sm'
                  : 'bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200/60'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Panduan Muraja'ah 40x</span>
            </button>
          </div>

          {/* Date Picker Selector for Start of Muraja'ah Week */}
          {['recap', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7'].includes(selectedMode) && (
            <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-emerald-50/70 border border-emerald-200/60 rounded-xl text-xs">
              <div className="flex items-center gap-2 text-emerald-950 font-semibold">
                <Calendar className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Mulai Pekan Muraja'ah (Senin / M1):</span>
              </div>
              <input
                type="date"
                value={weekStartDate}
                onChange={(e) => setWeekStartDate(e.target.value)}
                className="bg-white border border-emerald-300 rounded-lg px-2 py-0.5 text-xs font-bold text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
          )}

          {/* Daily Sub-buttons (M1 - M7) */}
          <div className="space-y-1">
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
              <span>Target Harian Pekan Muraja'ah:</span>
              <span className="text-[10px] text-gray-400 font-normal">Tanggal otomatis bergeser per hari</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {MURAJAAH_SCHEDULE.map((m) => {
                const dayDate = getMurajaahDate(mondayDate, m.code);
                const dayDateStr = dayDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'numeric' });
                return (
                  <button
                    key={m.code}
                    type="button"
                    onClick={() => setSelectedMode(m.code)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      selectedMode === m.code
                        ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-500/20'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent'
                    }`}
                  >
                    {m.code} ({m.day.slice(0, 3)}, {dayDateStr})
                  </button>
                );
              })}
            </div>
          </div>

          {!['recap', 'ujian', 'panduan40x'].includes(selectedMode) && (
            <div className="flex items-center gap-2 text-xs bg-amber-50/70 text-amber-900 px-3 py-1.5 rounded-xl border border-amber-200/50">
              <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="font-semibold">
                {MURAJAAH_SCHEDULE.find(m => m.code === selectedMode)?.desc} • Target {MURAJAAH_SCHEDULE.find(m => m.code === selectedMode)?.target}
              </span>
            </div>
          )}
        </div>

        {/* Textarea Area */}
        <div className="flex-1 min-h-[260px] sm:min-h-[340px] pt-2 relative">
          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            className="w-full h-full min-h-[260px] sm:min-h-[340px] p-3.5 sm:p-4 bg-[#fdfbf7] border border-[#e8e4d9] rounded-xl text-xs sm:text-sm text-gray-800 font-mono leading-relaxed focus:ring-2 focus:ring-emerald-500/20 resize-none shadow-inner"
            placeholder="Teks template..."
          />
        </div>

        {/* Action Footer */}
        <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <p className="text-[11px] text-gray-400">
            *Teks dapat diedit langsung sebelum disalin ke WhatsApp.
          </p>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="rounded-xl text-xs font-semibold"
            >
              Tutup
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleCopy}
              className="rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm flex items-center gap-1.5"
            >
              {isCopied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{isCopied ? 'Tersalin!' : 'Salin Teks WhatsApp'}</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
