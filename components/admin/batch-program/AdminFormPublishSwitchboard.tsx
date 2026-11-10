'use client';

import React, { useState } from 'react';
import {
  Globe,
  Eye,
  EyeOff,
  ExternalLink,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useFormSettings } from '@/hooks/useFormSettings';
import {
  FORM_ITEMS_CONFIG,
  FormKey,
  FormPublicationSettings,
} from '@/lib/form-settings';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function AdminFormPublishSwitchboard() {
  const { settings, isLoading, updateSettings, mutate } = useFormSettings();
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const activeCount = Object.values(settings).filter(Boolean).length;
  const totalCount = FORM_ITEMS_CONFIG.length;
  const inactiveCount = totalCount - activeCount;

  const handleToggle = async (key: FormKey, currentVal: boolean) => {
    const nextVal = !currentVal;
    setUpdatingKey(key);
    const item = FORM_ITEMS_CONFIG.find(i => i.key === key);
    const itemLabel = item?.title || key;

    const res = await updateSettings({ [key]: nextVal });
    setUpdatingKey(null);

    if (res.success) {
      if (nextVal) {
        toast.success(`Formulir "${itemLabel}" kini DIPUBLIKASIKAN (dapat diakses thalibah).`);
      } else {
        toast.info(`Formulir "${itemLabel}" kini DISEMBUNYIKAN (tidak tampil di publik).`);
      }
    }
  };

  const handleBulkToggle = async (targetState: boolean) => {
    setIsBulkUpdating(true);
    const bulkPayload: Partial<FormPublicationSettings> = {
      tikrar_tahfidz: targetState,
      pra_tikrar: targetState,
      muallimah: targetState,
      musyrifah: targetState,
      kelas_berbayar: targetState,
      daftar_ulang: targetState,
    };

    const res = await updateSettings(bulkPayload);
    setIsBulkUpdating(false);

    if (res.success) {
      if (targetState) {
        toast.success('Semua formulir pendaftaran berhasil DIPUBLIKASIKAN!');
      } else {
        toast.info('Semua formulir pendaftaran berhasil DISEMBUNYIKAN!');
      }
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden mb-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 p-5 sm:p-7 text-white relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-purple-500/20 text-purple-200 border border-purple-400/30">
                <Globe className="w-3.5 h-3.5 text-purple-300" />
                Live Switchboard
              </span>
              <span className="text-xs font-medium text-purple-200/80">
                Kontrol Sentral Portal
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Status Publikasi Formulir (Publish / Unpublish)
            </h2>

            <p className="text-xs sm:text-sm text-purple-100/80 leading-relaxed font-normal">
              Atur ketersediaan dan visibilitas setiap formulir pendaftaran secara instan.
              Formulir yang disembunyikan tidak akan muncul di Registration Hub maupun daftar program pendaftaran publik.
            </p>
          </div>

          {/* Quick Metrics & Bulk Actions */}
          <div className="flex flex-wrap items-center gap-3 bg-black/25 backdrop-blur-md border border-white/10 rounded-2xl p-3 sm:p-4">
            <div className="flex items-center gap-3 pr-3 border-r border-white/10">
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold text-emerald-300">Dipublikasi</p>
                <p className="text-lg font-black text-emerald-400">{activeCount}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold text-gray-400">Draft/Tutup</p>
                <p className="text-lg font-black text-gray-300">{inactiveCount}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleBulkToggle(true)}
                disabled={isBulkUpdating || activeCount === totalCount}
                className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-200 border-emerald-500/30 text-xs font-bold rounded-xl h-9"
              >
                {isBulkUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Eye className="w-3.5 h-3.5 mr-1" />}
                Buka Semua
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleBulkToggle(false)}
                disabled={isBulkUpdating || inactiveCount === totalCount}
                className="bg-rose-600/20 hover:bg-rose-600/30 text-rose-200 border-rose-500/30 text-xs font-bold rounded-xl h-9"
              >
                {isBulkUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <EyeOff className="w-3.5 h-3.5 mr-1" />}
                Tutup Semua
              </Button>
              <button
                type="button"
                onClick={() => mutate()}
                title="Refresh Status"
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all ml-1"
              >
                <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Form Switches */}
      <div className="p-4 sm:p-6 lg:p-7 bg-stone-50/40">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {FORM_ITEMS_CONFIG.map((item) => {
            const isPublished = Boolean(settings[item.key]);
            const isItemUpdating = updatingKey === item.key || isBulkUpdating;

            return (
              <div
                key={item.key}
                className={cn(
                  'rounded-2xl border transition-all duration-200 p-5 flex flex-col justify-between bg-white relative group',
                  isPublished
                    ? 'border-emerald-300/80 shadow-xs hover:border-emerald-500 hover:shadow-md'
                    : 'border-gray-200 opacity-90 hover:opacity-100 hover:border-gray-300'
                )}
              >
                <div className="space-y-3">
                  {/* Category & Status Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn(
                      'text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border',
                      item.color.badgeBg,
                      item.color.badgeText,
                      item.color.badgeBorder
                    )}>
                      {item.badge}
                    </span>

                    {/* Live status badge */}
                    <div className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wide',
                      isPublished
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300/80'
                        : 'bg-gray-100 text-gray-500 border border-gray-200'
                    )}>
                      <span className={cn(
                        'w-2 h-2 rounded-full',
                        isPublished ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
                      )} />
                      {isPublished ? 'Dipublikasikan' : 'Disembunyikan'}
                    </div>
                  </div>

                  {/* Form Title & Category */}
                  <div>
                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                      {item.category}
                    </p>
                    <h3 className="text-base font-bold text-gray-900 group-hover:text-purple-900 transition-colors mt-0.5">
                      {item.title}
                    </h3>
                  </div>

                  {/* Form Description */}
                  <p className="text-xs text-gray-600 leading-relaxed min-h-[36px]">
                    {item.description}
                  </p>
                </div>

                {/* Bottom Toggle Bar & Preview Link */}
                <div className="pt-4 mt-3 border-t border-gray-100 flex items-center justify-between gap-3">
                  {/* Direct Preview Link */}
                  <Link
                    href={item.path}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-500 hover:text-purple-700 transition-colors"
                  >
                    <span>Buka Form</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>

                  {/* Toggle Switch */}
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'text-xs font-bold select-none cursor-pointer',
                      isPublished ? 'text-emerald-700' : 'text-gray-600'
                    )}
                    onClick={() => !isItemUpdating && handleToggle(item.key, isPublished)}
                    >
                      {isPublished ? 'Aktif' : 'Nonaktif'}
                    </span>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={isPublished}
                      disabled={isItemUpdating}
                      onClick={() => handleToggle(item.key, isPublished)}
                      className={cn(
                        'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
                        isPublished ? 'bg-emerald-600' : 'bg-gray-300'
                      )}
                    >
                      <span className="sr-only">Toggle {item.title}</span>
                      <span
                        aria-hidden="true"
                        className={cn(
                          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center',
                          isPublished ? 'translate-x-5' : 'translate-x-0'
                        )}
                      >
                        {isItemUpdating ? (
                          <Loader2 className="w-3 h-3 text-gray-400 animate-spin" />
                        ) : isPublished ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ) : null}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Informative Guidance */}
        <div className="mt-6 p-4 rounded-2xl bg-purple-50/70 border border-purple-200/70 flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-purple-700 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-purple-950 space-y-1">
            <p className="font-bold">
              Catatan Penggunaan Panel Publikasi Formulir:
            </p>
            <p className="text-purple-800 leading-relaxed font-normal">
              Perubahan switch saklar berlaku secara seketika (real-time). Ketika saklar sebuah formulir dimatikan (Disembunyikan), thalibah tidak akan melihat formulir tersebut di portal pendaftaran utama, dan akses langsung ke tautan formulir tersebut akan menampilkan pesan bahwa pendaftaran ditutup atau dinonaktifkan oleh administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminFormPublishSwitchboard;
