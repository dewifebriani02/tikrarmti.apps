'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  HeartHandshake, 
  Clock, 
  AlertTriangle, 
  ArrowRight, 
  X,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface InfaqStatusData {
  is_required: boolean;
  has_paid: boolean;
  payment_status: 'paid' | 'pending' | 'unpaid';
  phase: 'paid' | 'reminder' | 'warning' | 'suspended';
  is_suspended: boolean;
  current_day: number;
  current_month: number;
  current_year: number;
  month_name: string;
  days_left: number;
  days_overdue: number;
  commitment_amount: number;
  batch_name?: string;
  latest_donation?: any;
}

interface InfaqReminderBannerProps {
  status: InfaqStatusData | null;
}

export function InfaqReminderBanner({ status }: InfaqReminderBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!status || !status.is_required || status.has_paid) {
    return null;
  }

  if (dismissed) {
    return null;
  }

  const isSuspended = Boolean(status.is_suspended);
  const isWarning = status.phase === 'warning' || isSuspended;

  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 border transition-all duration-300 shadow-sm mb-6 ${
      isWarning 
        ? 'bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-amber-200 text-amber-950' 
        : 'bg-gradient-to-r from-emerald-50 via-teal-50 to-green-50 border-emerald-200 text-emerald-950'
    }`}>
      {/* Decorative Glow */}
      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl -translate-y-8 translate-x-8 pointer-events-none ${
        isWarning ? 'bg-amber-400/20' : 'bg-emerald-400/20'
      }`} />

      <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
            isWarning 
              ? 'bg-amber-500 text-white' 
              : 'bg-emerald-600 text-white'
          }`}>
            {isWarning ? <AlertTriangle className="w-5 h-5" /> : <HeartHandshake className="w-5 h-5" />}
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                isSuspended
                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                  : isWarning 
                  ? 'bg-amber-200/80 text-amber-900 border border-amber-300' 
                  : 'bg-emerald-200/80 text-emerald-900 border border-emerald-300'
              }`}>
                {isSuspended ? 'Konfirmasi Infaq Terlewat' : isWarning ? 'Peringatan Batas Akhir' : 'Pengingat Infaq Bulanan'}
              </span>

              <span className="text-xs font-semibold flex items-center gap-1 opacity-80">
                <Clock className="w-3.5 h-3.5" />
                Periode Bulan {status.month_name} {status.current_year}
              </span>
            </div>

            <p className="text-sm font-bold text-gray-900">
              {isSuspended ? (
                <span>
                  Batas waktu konfirmasi infaq bulanan (tanggal 10 {status.month_name}) telah terlewati.
                </span>
              ) : isWarning ? (
                <span>
                  Sisa waktu konfirmasi infaq tinggal <strong className="text-amber-800 underline font-black">{status.days_left} hari lagi</strong> (Maksimal tanggal 10 {status.month_name}).
                </span>
              ) : (
                <span>
                  Waktu pembayaran infaq bulanan telah dibuka (1–10 {status.month_name}).
                </span>
              )}
            </p>

            <p className="text-xs text-gray-600 leading-relaxed max-w-2xl">
              Komitmen infaq operasional: <strong>{formatIDR(status.commitment_amount)}</strong>. Mohon segera tunaikan dan unggah bukti transfer agar keberlangsungan program tetap terjaga.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto shrink-0 pt-2 md:pt-0">
          <Button
            asChild
            size="sm"
            className={`w-full md:w-auto rounded-xl text-xs font-bold shadow-sm transition-all h-9 px-4 gap-1.5 ${
              isSuspended
                ? 'bg-rose-700 hover:bg-rose-800 text-white'
                : isWarning
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-emerald-700 hover:bg-emerald-800 text-white'
            }`}
          >
            <Link href="/infaq-donasi">
              <span>Konfirmasi Infaq</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>

          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-black/5 transition-colors"
            title="Tutup pengingat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
