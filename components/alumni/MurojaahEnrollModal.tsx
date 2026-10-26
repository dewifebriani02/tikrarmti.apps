'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Sparkles, CheckCircle2, ShieldCheck, Clock, Copy, Check, HeartHandshake } from 'lucide-react';
import { toast } from 'sonner';
import { MUROJAAH_TIME_SLOTS, MUROJAAH_INFAQ_TIERS, MTI_OFFICIAL_BANK } from '@/lib/murojaah';

interface MurojaahEnrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentJuzCode?: string;
  isFreeEligible?: boolean;
  isFreeExtension?: boolean;
}

const COMMON_JUZ_OPTIONS = [
  { code: '30A', label: 'Juz 30 Bagian A (An-Naba s.d Al-Infitar)' },
  { code: '30B', label: 'Juz 30 Bagian B (Al-Muthaffifin s.d An-Nas)' },
  { code: '29A', label: 'Juz 29 Bagian A (Al-Mulk s.d Al-Jinn)' },
  { code: '29B', label: 'Juz 29 Bagian B (Al-Muzzammil s.d Al-Mursalat)' },
  { code: '28A', label: 'Juz 28 Bagian A (Al-Mujadilah s.d At-Talaq)' },
  { code: '28B', label: 'Juz 28 Bagian B (At-Tahrim s.d Al-Mulk)' },
];

export function MurojaahEnrollModal({
  isOpen,
  onClose,
  onSuccess,
  currentJuzCode = '30A',
  isFreeEligible = true,
  isFreeExtension = false
}: MurojaahEnrollModalProps) {
  const [selectedJuz, setSelectedJuz] = useState<string>(currentJuzCode);
  const [timeSlotMain, setTimeSlotMain] = useState<string>('04-06');
  const [timeSlotBackup, setTimeSlotBackup] = useState<string>('06-09');
  const [partnerMatchingActive, setPartnerMatchingActive] = useState<boolean>(true);
  const [selectedInfaqAmount, setSelectedInfaqAmount] = useState<number>(25000);
  const [submitting, setSubmitting] = useState(false);
  const [copiedBank, setCopiedBank] = useState(false);

  const handleCopyBank = () => {
    navigator.clipboard.writeText(MTI_OFFICIAL_BANK.accountNumber);
    setCopiedBank(true);
    toast.success('Nomor rekening BSI tersalin!');
    setTimeout(() => setCopiedBank(false), 2000);
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const res = await fetch('/api/alumni/murojaah-40x/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          juz_code: selectedJuz,
          time_slot_main: timeSlotMain,
          time_slot_backup: timeSlotBackup,
          partner_matching_active: partnerMatchingActive,
          infaq_amount: (isFreeEligible || isFreeExtension) ? 0 : selectedInfaqAmount
        })
      });

      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(json.message);
        onSuccess();
        onClose();
      } else {
        toast.error(json.error || 'Gagal mengaktifkan porsi murojaah');
      }
    } catch (err) {
      console.error('Error enrolling murojaah 40x:', err);
      toast.error('Terjadi kesalahan saat pendaftaran');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-green-800 p-5 text-white">
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-white/10 backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-200">
              Pendaftaran &amp; Aktivasi Porsi
            </span>
          </div>
          <DialogTitle className="text-lg font-black text-white">
            Mulai Tantangan 20 Hari Murojaah 40x
          </DialogTitle>
          <DialogDescription className="text-xs text-emerald-100/90 mt-1">
            Pilih porsi hafalan yang akan dikuatkan dan tentukan jam luang setoran Ukhti.
          </DialogDescription>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Status Free Banner */}
          {(isFreeEligible || isFreeExtension) ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-xs text-emerald-950">
                <span className="font-extrabold text-emerald-800 block">
                  {isFreeExtension ? '🏆 Bebas Biaya (Warrior Finisher)' : '✨ 100% Bebas Biaya (Rp 0)'}
                </span>
                <p className="text-[11px] text-emerald-800/80 leading-relaxed">
                  {isFreeExtension
                    ? 'Alhamdulillah, keberhasilan menyelesaikan 40 putaran dalam ≤ 20 hari memberi Ukhti hak lanjut ke porsi berikutnya secara gratis!'
                    : 'Sebagai thalibah aktif MTI atau Muallimah, Ukhti berhak mengikuti program Murojaah 40x tanpa biaya.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-3">
              <HeartHandshake className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-xs text-amber-950">
                <span className="font-extrabold text-amber-900 block">Infaq Komitmen 20 Hari</span>
                <p className="text-[11px] text-amber-800/80 leading-relaxed">
                  Infaq komitmen sebagai pengikat kesungguhan menyelesaikan 40x dalam 20 hari. Peserta yang berhasil tuntas berhak lanjut porsi berikutnya secara gratis!
                </p>
              </div>
            </div>
          )}

          {/* 1. Pilih Porsi Juz */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-gray-800">1. Porsi 1/2 Juz yang Dimurojaah:</Label>
            <select
              value={selectedJuz}
              onChange={(e) => setSelectedJuz(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-gray-200 bg-white font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {COMMON_JUZ_OPTIONS.map(j => (
                <option key={j.code} value={j.code}>{j.label}</option>
              ))}
            </select>
          </div>

          {/* 2. Pilih 7 Slot Jam WIB */}
          <div className="space-y-2.5">
            <Label className="text-xs font-bold text-gray-800">
              2. Pilihan Waktu Luang (Standar WIB MTI):
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-gray-500 font-bold block mb-1">Slot Utama (Wajib):</span>
                <select
                  value={timeSlotMain}
                  onChange={(e) => setTimeSlotMain(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-gray-200 bg-white font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {MUROJAAH_TIME_SLOTS.map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-[10px] text-gray-500 font-bold block mb-1">Slot Cadangan:</span>
                <select
                  value={timeSlotBackup}
                  onChange={(e) => setTimeSlotBackup(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-gray-200 bg-white font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {MUROJAAH_TIME_SLOTS.map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 3. Komunitas Matchmaking Visibility */}
          <div className="p-3 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-gray-800 block">Cari Pasangan di Komunitas</span>
              <p className="text-[10px] text-gray-500">Tampilkan profil Ukhti di direktori agar mudah diajak simak.</p>
            </div>
            <input
              type="checkbox"
              checked={partnerMatchingActive}
              onChange={(e) => setPartnerMatchingActive(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
          </div>

          {/* 4. Infaq Tier Selection (Bila bukan gratis) */}
          {!(isFreeEligible || isFreeExtension) && (
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <Label className="text-xs font-bold text-gray-800">3. Pilih Nominal Infaq Komitmen:</Label>
              <div className="grid grid-cols-2 gap-2">
                {MUROJAAH_INFAQ_TIERS.map(tier => (
                  <button
                    key={tier.amount}
                    type="button"
                    onClick={() => setSelectedInfaqAmount(tier.amount)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      selectedInfaqAmount === tier.amount
                        ? 'border-emerald-600 bg-emerald-50/80 text-emerald-950 font-bold ring-1 ring-emerald-500'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-xs block font-black">{tier.label}</span>
                    <span className="text-[9px] text-gray-500">{tier.desc}</span>
                  </button>
                ))}
              </div>

              {/* Rekening Card */}
              <div className="bg-gray-50 border border-gray-200/80 rounded-2xl p-3 flex items-center justify-between gap-2 mt-2">
                <div>
                  <span className="text-[9px] text-gray-500 font-bold uppercase block">{MTI_OFFICIAL_BANK.bankName}</span>
                  <span className="text-xs font-black text-gray-900 font-mono tracking-wider">{MTI_OFFICIAL_BANK.accountNumber}</span>
                  <span className="text-[9px] text-gray-500 block">a.n. {MTI_OFFICIAL_BANK.accountHolder}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyBank}
                  className="px-2.5 py-1.5 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-emerald-50 hover:text-emerald-800 text-[10px] font-bold flex items-center gap-1 shadow-2xs"
                >
                  {copiedBank ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedBank ? 'Tersalin' : 'Salin Rek'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 bg-gray-50 border-t border-gray-100 flex flex-row gap-2 justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl text-xs font-bold"
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs px-5"
          >
            {submitting ? 'Memproses...' : 'Aktifkan Porsi 20 Hari'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
