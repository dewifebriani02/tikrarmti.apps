'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowRightLeft, BookOpen, Clock, CheckCircle2, ChevronRight, Sparkles, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScheduleOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSitIn: () => void;
  onSelectTransfer: () => void;
  isTransferAllowed?: boolean;
}

export function ScheduleOptionsModal({
  isOpen,
  onClose,
  onSelectSitIn,
  onSelectTransfer,
  isTransferAllowed = true,
}: ScheduleOptionsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl rounded-3xl border-none shadow-2xl p-0 overflow-hidden bg-white">
        {/* Header */}
        <DialogHeader className="bg-gradient-to-br from-green-900 to-green-800 text-white p-6 sm:p-7 relative overflow-hidden">
          <div className="relative z-10 space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[10px] font-black uppercase tracking-wider text-green-200">
              <Sparkles className="w-3 h-3 text-amber-300" />
              Layanan Penyesuaian Jadwal
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Pilih Jenis Perubahan Jadwal
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-green-100/90 font-medium">
              Silakan pilih sesuai kebutuhan Ukhti: pengganti sementara (Sit-In) atau pindah kelompok resmi (Mutasi).
            </DialogDescription>
          </div>
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-28 h-28 bg-yellow-400/10 rounded-full blur-2xl pointer-events-none" />
        </DialogHeader>

        {/* Content Body: 2 Options */}
        <div className="p-5 sm:p-7 space-y-4 bg-gray-50/50">
          {/* Option 1: Sit-In Temporer */}
          <div 
            onClick={() => {
              onClose();
              onSelectSitIn();
            }}
            className="group relative bg-white rounded-2xl border-2 border-emerald-100 hover:border-emerald-500 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm sm:text-base font-black text-gray-900 group-hover:text-emerald-800 transition-colors">
                      Sit-In Kelas Pengganti
                    </h4>
                    <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full uppercase">
                      Temporer
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 font-medium">
                    Hanya berlaku 1 kali untuk pekan berjalan
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all shrink-0 mt-2" />
            </div>

            <p className="text-xs text-gray-600 leading-relaxed bg-emerald-50/40 p-3 rounded-xl border border-emerald-100/60">
              Gunakan jika berhalangan hadir di kelas utama pekan ini (misal sakit atau safar). Ukhti dapat menyimak dan setoran di jadwal halaqah lain yang masih memiliki kuota tanpa mengubah halaqah utama.
            </p>

            <div className="flex justify-end pt-1">
              <Button
                type="button"
                className="w-full sm:w-auto bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs py-2 px-4 shadow-sm"
              >
                Pilih Kelas Sit-In Pekan Ini &rarr;
              </Button>
            </div>
          </div>

          {/* Option 2: Mutasi Jadwal Permanen */}
          <div 
            onClick={() => {
              if (!isTransferAllowed) return;
              onClose();
              onSelectTransfer();
            }}
            className={cn(
              "group relative bg-white rounded-2xl border-2 p-5 shadow-sm transition-all space-y-3",
              isTransferAllowed 
                ? "border-blue-100 hover:border-blue-500 hover:shadow-md cursor-pointer" 
                : "border-gray-200 opacity-60 cursor-not-allowed bg-gray-50/80"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform",
                  isTransferAllowed 
                    ? "bg-blue-50 text-blue-700 border border-blue-200/60 group-hover:scale-105" 
                    : "bg-gray-100 text-gray-400 border border-gray-200"
                )}>
                  <ArrowRightLeft className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm sm:text-base font-black text-gray-900 group-hover:text-blue-800 transition-colors">
                      Mutasi Jadwal Halaqah
                    </h4>
                    <span className="text-[10px] font-black bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full uppercase">
                      Permanen
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 font-medium">
                    Berlaku seterusnya hingga akhir batch
                  </p>
                </div>
              </div>
              {isTransferAllowed && (
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0 mt-2" />
              )}
            </div>

            <p className="text-xs text-gray-600 leading-relaxed bg-blue-50/40 p-3 rounded-xl border border-blue-100/60">
              Gunakan jika rutinitas atau kesibukan harian Ukhti berubah secara permanen dan ingin berpindah kelompok halaqah resmi untuk seluruh sisa pekan yang ada (membutuhkan persetujuan Admin).
            </p>

            <div className="flex justify-end pt-1">
              <Button
                type="button"
                disabled={!isTransferAllowed}
                className="w-full sm:w-auto bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-xs py-2 px-4 shadow-sm"
              >
                {isTransferAllowed ? 'Ajukan Pindah Permanen →' : 'Periode Mutasi Ditutup'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
