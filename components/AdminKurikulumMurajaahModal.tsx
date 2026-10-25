'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BookOpen, Copy, CheckCircle2, Calendar, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { 
  MURAJAAH_SCHEDULE, 
  generateMurajaahDailyText, 
  generateMurajaahWeeklyRecap,
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
  const [selectedMode, setSelectedMode] = useState<'recap' | string>('recap');
  const [customText, setCustomText] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

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

  // Generate text whenever selectedMode or selectedDate or juzList changes
  useEffect(() => {
    const dateObj = new Date(selectedDate);
    if (selectedMode === 'recap') {
      const text = generateMurajaahWeeklyRecap({ startDate: dateObj, juzOptions: juzList });
      setCustomText(text);
    } else {
      const scheduleItem = MURAJAAH_SCHEDULE.find(m => m.code === selectedMode) || MURAJAAH_SCHEDULE[0];
      const text = generateMurajaahDailyText({ item: scheduleItem, date: dateObj, juzOptions: juzList });
      setCustomText(text);
    }
  }, [selectedMode, selectedDate, juzList]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(customText);
      setIsCopied(true);
      toast.success('Teks Kurikulum Murajaah berhasil disalin!');
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      toast.error('Gagal menyalin teks ke clipboard');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-4 sm:p-6 rounded-2xl overflow-hidden">
        <DialogHeader className="space-y-1 pb-2 border-b border-gray-100">
          <div className="flex items-center gap-2 text-amber-600 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pekan 11 Kurikulum Tikrar</span>
          </div>
          <DialogTitle className="text-lg sm:text-xl font-black text-gray-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-700" />
            Generator Teks Kurikulum Muraja'ah
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500">
            Pilih target kurikulum M1–M7 atau rekap sepekan penuh untuk disalin dan dibagikan ke WhatsApp.
          </DialogDescription>
        </DialogHeader>

        {/* Tab Mode Selector */}
        <div className="space-y-3 pt-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedMode('recap')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedMode === 'recap'
                  ? 'bg-emerald-800 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
              }`}
            >
              📢 Sepekan (M1 – M7)
            </button>

            {MURAJAAH_SCHEDULE.map((m) => (
              <button
                key={m.code}
                type="button"
                onClick={() => setSelectedMode(m.code)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedMode === m.code
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent'
                }`}
              >
                {m.code} ({m.day.slice(0, 3)})
              </button>
            ))}
          </div>

          {selectedMode !== 'recap' && (
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
            placeholder="Teks kurikulum muraja'ah..."
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold gap-1.5 flex-1 sm:flex-initial shadow-sm"
            >
              {isCopied ? <CheckCircle2 className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
              <span>{isCopied ? 'Tersalin!' : 'Salin Teks WhatsApp'}</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
