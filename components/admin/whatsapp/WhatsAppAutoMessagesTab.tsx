'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import {
  Clock,
  Bot,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle2,
  Power,
  PowerOff,
  Users,
  ShieldAlert,
  Loader2,
  CalendarClock,
  Webhook,
  Check,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface AutoMessageItem {
  key: string;
  title: string;
  category: 'cron' | 'webhook';
  scheduleLabel: string;
  recipientLabel: string;
  description: string;
  disabledBehavior: string;
  sourceLabel: string;
  enabled: boolean;
  templatePreview: string;
}

interface WhatsAppAutoMessagesTabProps {
  onCountChange?: (active: number, total: number) => void;
}

export function WhatsAppAutoMessagesTab({ onCountChange }: WhatsAppAutoMessagesTabProps) {
  const [items, setItems] = useState<AutoMessageItem[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [expandedPreviews, setExpandedPreviews] = useState<Record<string, boolean>>({});

  const hasLoadedRef = useRef(false);
  const onCountChangeRef = useRef(onCountChange);

  useEffect(() => {
    onCountChangeRef.current = onCountChange;
  }, [onCountChange]);

  const notifyCount = useCallback((list: AutoMessageItem[]) => {
    if (onCountChangeRef.current) {
      const active = list.filter((i) => i.enabled).length;
      onCountChangeRef.current(active, list.length);
    }
  }, []);

  const fetchAutoMessages = useCallback(async () => {
    if (!hasLoadedRef.current) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    try {
      const res = await fetch('/api/admin/whatsapp/auto-messages');
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        const list: AutoMessageItem[] = json.data.items || [];
        hasLoadedRef.current = true;
        setItems(list);
        setUpdatedAt(json.data.updatedAt || null);
        notifyCount(list);
      } else {
        toast.error(json.error?.message || 'Gagal memuat daftar pesan otomatis');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal terhubung ke server');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [notifyCount]);

  useEffect(() => {
    fetchAutoMessages();
  }, [fetchAutoMessages]);

  const handleToggleItem = async (item: AutoMessageItem) => {
    const nextValue = !item.enabled;
    setSavingKey(item.key);
    try {
      const res = await fetch('/api/admin/whatsapp/auto-messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [item.key]: nextValue }),
      });
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        const list: AutoMessageItem[] = json.data.items || [];
        setItems(list);
        setUpdatedAt(json.data.updatedAt || null);
        notifyCount(list);
        toast.success(
          `${item.title} ${nextValue ? 'diaktifkan' : 'dinonaktifkan'}`
        );
      } else {
        toast.error(json.error?.message || 'Gagal mengubah status pesan otomatis');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan');
    } finally {
      setSavingKey(null);
    }
  };

  const handleBulkToggle = async (enableAll: boolean) => {
    setBulkSaving(true);
    try {
      const res = await fetch('/api/admin/whatsapp/auto-messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enableAll }),
      });
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        const list: AutoMessageItem[] = json.data.items || [];
        setItems(list);
        setUpdatedAt(json.data.updatedAt || null);
        notifyCount(list);
        toast.success(
          enableAll
            ? 'Semua pesan otomatis WhatsApp telah diaktifkan'
            : 'Semua pesan otomatis WhatsApp telah dinonaktifkan'
        );
      } else {
        toast.error(json.error?.message || 'Gagal memperbarui semua pengaturan');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan');
    } finally {
      setBulkSaving(false);
    }
  };

  const togglePreview = (key: string) => {
    setExpandedPreviews((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const cronItems = items.filter((i) => i.category === 'cron');
  const webhookItems = items.filter((i) => i.category === 'webhook');
  const activeCount = items.filter((i) => i.enabled).length;

  const renderToggleCard = (item: AutoMessageItem) => {
    const isBusy = savingKey === item.key || bulkSaving;
    const isPreviewOpen = Boolean(expandedPreviews[item.key]);

    return (
      <div
        key={item.key}
        className={`rounded-2xl border transition-all bg-white ${
          item.enabled
            ? 'border-emerald-200/90 shadow-xs'
            : 'border-gray-200 bg-gray-50/50 opacity-90'
        }`}
      >
        <div className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-gray-900">
                {item.title}
              </h3>
              <Badge
                className={
                  item.enabled
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200 text-[11px] font-bold hover:bg-emerald-100'
                    : 'bg-gray-200 text-gray-700 border-gray-300 text-[11px] font-bold hover:bg-gray-200'
                }
              >
                {item.enabled ? 'AKTIF' : 'NONAKTIF'}
              </Badge>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-medium">
                {item.category === 'cron' ? (
                  <Clock className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Webhook className="w-3 h-3 text-blue-600" />
                )}
                {item.scheduleLabel}
              </span>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              {item.description}
            </p>

            <div className="flex flex-col gap-1 text-[11px] text-gray-500 pt-0.5">
              <div className="flex items-start gap-1.5">
                <Users className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-gray-700">Target:</strong> {item.recipientLabel}
                </span>
              </div>
              <div className="flex items-start gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span>{item.disabledBehavior}</span>
              </div>
            </div>

            <div className="pt-1 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => togglePreview(item.key)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/70 px-3 py-1.5 rounded-xl border border-emerald-200/80 transition-colors"
              >
                {isPreviewOpen ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    Tutup Preview Template
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    Lihat Template Pesan
                  </>
                )}
              </button>
              <span className="text-[10px] font-mono text-gray-400 truncate max-w-full">
                {item.sourceLabel}
              </span>
            </div>
          </div>

          {/* Right: ON/OFF Switch */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-gray-100">
            <button
              type="button"
              role="switch"
              aria-checked={item.enabled}
              aria-label={`Toggle ${item.title}`}
              disabled={isBusy}
              onClick={() => handleToggleItem(item)}
              className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                item.enabled ? 'bg-emerald-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-flex h-6 w-6 transform items-center justify-center rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  item.enabled ? 'translate-x-8' : 'translate-x-0.5'
                }`}
              >
                {isBusy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                ) : null}
              </span>
            </button>
            <span
              className={`text-[11px] font-bold tracking-wide ${
                item.enabled ? 'text-emerald-700' : 'text-gray-500'
              }`}
            >
              {isBusy
                ? 'Menyimpan...'
                : item.enabled
                ? 'ON • Aktif'
                : 'OFF • Mati'}
            </span>
          </div>
        </div>

        {/* Expandable WhatsApp Template Preview */}
        {isPreviewOpen && (
          <div className="px-5 pb-5 pt-1 border-t border-gray-100 bg-gray-50/70 rounded-b-2xl">
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 mt-2">
              Pratinjau Template Pesan di Aplikasi:
            </div>
            <div className="bg-[#ECE5DD] p-4 rounded-2xl border border-gray-200">
              <div className="bg-[#DCF8C6] p-3.5 rounded-2xl rounded-tr-none max-w-2xl ml-auto shadow-xs border border-emerald-200/70 text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">
                {item.templatePreview}
                <div className="flex items-center justify-end gap-1 text-[10px] text-gray-500 pt-1.5 font-mono">
                  <span>Contoh Template Resmi MTI</span>
                  <Check className="h-3 w-3 text-emerald-600" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary & Bulk Controls Card */}
      <Card className="border-gray-200/80 shadow-sm rounded-3xl overflow-hidden bg-white">
        <CardHeader className="border-b border-gray-100 px-6 py-5 bg-gradient-to-r from-emerald-50/60 via-white to-white">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Bot className="h-5 w-5 text-emerald-600" />
                Kontrol ON/OFF Pesan Otomatis WhatsApp (Template Bawaan)
                {!loading && (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">
                    {activeCount} / {items.length} Aktif
                  </Badge>
                )}
              </CardTitle>
              <p className="text-xs text-gray-600 leading-relaxed max-w-3xl">
                Aktifkan atau matikan setiap pengingat terjadwal (Cron) dan balasan otomatis Webhook
                yang sudah memiliki template di aplikasi. Setiap perubahan langsung disimpan ke
                database dan berlaku seketika tanpa perlu restart server.
              </p>
              {updatedAt && (
                <p className="text-[11px] text-gray-400 flex items-center gap-1 pt-0.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Terakhir diperbarui:{' '}
                  {new Date(updatedAt).toLocaleString('id-ID', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                    timeZone: 'Asia/Jakarta',
                  })}{' '}
                  WIB
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading || refreshing || bulkSaving}
                onClick={() => handleBulkToggle(true)}
                className="rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs font-bold gap-1.5"
              >
                <Power className="w-3.5 h-3.5" />
                Aktifkan Semua
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading || refreshing || bulkSaving}
                onClick={() => handleBulkToggle(false)}
                className="rounded-xl border-red-200 text-red-700 hover:bg-red-50 text-xs font-bold gap-1.5"
              >
                <PowerOff className="w-3.5 h-3.5" />
                Matikan Semua
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={loading || refreshing}
                onClick={fetchAutoMessages}
                className="rounded-xl text-gray-500 hover:text-gray-800 text-xs gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading || refreshing ? 'animate-spin' : ''}`} />
                Muat Ulang
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-8">
          {loading && items.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-xs flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
              <span>Memuat konfigurasi pesan otomatis WhatsApp...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-xs flex flex-col items-center justify-center gap-3">
              <span>Konfigurasi pesan otomatis belum tersedia atau gagal dimuat.</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={fetchAutoMessages}
                className="rounded-xl text-xs gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Coba Muat Ulang
              </Button>
            </div>
          ) : (
            <>
              {/* Section 1: Cron / Scheduled Reminders */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                  <CalendarClock className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Pengingat Terjadwal Otomatis (Cron Job Harian)
                  </h4>
                </div>
                <div className="space-y-3">{cronItems.map(renderToggleCard)}</div>
              </div>

              {/* Section 2: Real-time Webhook Auto-Replies */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                  <Webhook className="w-4 h-4 text-blue-600" />
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Balasan & Notifikasi Otomatis Real-Time (Webhook)
                  </h4>
                </div>
                <div className="space-y-3">{webhookItems.map(renderToggleCard)}</div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
