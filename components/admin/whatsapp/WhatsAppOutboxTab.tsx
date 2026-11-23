'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Phone,
  Send,
  Copy,
  ExternalLink,
  Clock,
  Users,
  User,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  ShieldCheck,
  Filter,
  Image as ImageIcon,
  FileText,
  MailCheck,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export interface OutboxRecord {
  id: string;
  recipientPhone: string;
  recipientName: string | null;
  recipientType: 'individual' | 'group';
  messageType: 'text' | 'image' | 'file' | 'group';
  messageBody: string;
  mediaUrl: string | null;
  status: 'sent' | 'failed';
  errorMessage: string | null;
  senderNumber: string | null;
  senderDisplayPhone: string | null;
  senderKeyMasked: string | null;
  senderSource: string | null;
  usedFallback: boolean;
  sourceTag: string;
  sourceLabel: string;
  watzapMessageId: string | null;
  provider: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  origin: 'outbox_log' | 'chat_history';
}

interface OutboxSummary {
  totalAll: number;
  sentToday: number;
  failedAll: number;
  fallbackAll: number;
}

interface DistinctSender {
  senderNumber: string;
  displayPhone: string;
  count: number;
}

interface DistinctSource {
  sourceTag: string;
  label: string;
  count: number;
}

interface WhatsAppOutboxTabProps {
  onSummaryChange?: (summary: OutboxSummary) => void;
  refreshSignal?: number;
}

const PAGE_SIZE = 25;

function getSourceBadgeClass(tag: string): string {
  switch (tag) {
    case 'cron_murojaah':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'cron_ujian_lisan':
      return 'bg-indigo-50 text-indigo-800 border-indigo-200';
    case 'cron_kelas_berbayar':
      return 'bg-violet-50 text-violet-800 border-violet-200';
    case 'broadcast':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'individual':
      return 'bg-sky-50 text-sky-800 border-sky-200';
    case 'individual_cc':
      return 'bg-slate-100 text-slate-700 border-slate-200';
    case 'group_manual':
      return 'bg-blue-50 text-blue-800 border-blue-200';
    case 'live_chat':
      return 'bg-teal-50 text-teal-800 border-teal-200';
    case 'ai_bot':
      return 'bg-purple-50 text-purple-800 border-purple-200';
    case 'ai_escalation':
      return 'bg-rose-50 text-rose-800 border-rose-200';
    case 'pendaftaran_notif':
      return 'bg-cyan-50 text-cyan-800 border-cyan-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

function formatWibShort(iso: string): string {
  try {
    return new Date(iso).toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatWibFull(iso: string): string {
  try {
    return (
      new Date(iso).toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        weekday: 'short',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }) + ' WIB'
    );
  } catch {
    return iso;
  }
}

function formatRecipientPhone(phone: string, recipientType: 'individual' | 'group'): string {
  if (recipientType === 'group') return phone;
  const digits = phone.replace(/[^0-9]/g, '');
  if (!digits) return phone;
  return `+${digits}`;
}

function formatSenderShort(senderNumber: string | null, displayPhone: string | null): string {
  if (!senderNumber) return 'Riwayat Chat';
  if (displayPhone) return displayPhone;
  return `+${senderNumber}`;
}

function isNonOfficialSender(senderNumber: string | null): boolean {
  if (!senderNumber) return false;
  const digits = senderNumber.replace(/[^0-9]/g, '');
  return digits.length > 0 && !digits.endsWith('4240');
}

export function WhatsAppOutboxTab({ onSummaryChange, refreshSignal }: WhatsAppOutboxTabProps) {
  const [items, setItems] = useState<OutboxRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<OutboxSummary>({
    totalAll: 0,
    sentToday: 0,
    failedAll: 0,
    fallbackAll: 0,
  });
  const [distinctSenders, setDistinctSenders] = useState<DistinctSender[]>([]);
  const [distinctSources, setDistinctSources] = useState<DistinctSource[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'failed'>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [senderFilter, setSenderFilter] = useState<string>('all');
  const [onlyFallback, setOnlyFallback] = useState<boolean>(false);
  const [page, setPage] = useState(0);

  // Selected item for right detail pane
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchOutbox = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (debouncedSearch) qs.set('search', debouncedSearch);
      if (statusFilter !== 'all') qs.set('status', statusFilter);
      if (sourceFilter !== 'all') qs.set('sourceTag', sourceFilter);
      if (senderFilter !== 'all') qs.set('senderNumber', senderFilter);
      if (onlyFallback) qs.set('onlyFallback', 'true');
      qs.set('limit', String(PAGE_SIZE));
      qs.set('offset', String(page * PAGE_SIZE));

      const res = await fetch(`/api/admin/whatsapp/outbox?${qs.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || json.message || 'Gagal memuat kotak keluar');
      }

      const data = json.data;
      const list: OutboxRecord[] = Array.isArray(data?.items) ? data.items : [];
      setItems(list);
      setTotal(Number(data?.total || 0));

      if (data?.summary) {
        setSummary(data.summary);
        onSummaryChange?.(data.summary);
      }
      if (Array.isArray(data?.distinctSenders)) {
        setDistinctSenders(data.distinctSenders);
      }
      if (Array.isArray(data?.distinctSources)) {
        setDistinctSources(data.distinctSources);
      }

      setSelectedId((prev) => {
        if (prev && list.some((i) => i.id === prev)) return prev;
        return list.length > 0 ? list[0].id : null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat riwayat Outbox');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, statusFilter, sourceFilter, senderFilter, onlyFallback, page, onSummaryChange]);

  useEffect(() => {
    fetchOutbox();
  }, [fetchOutbox, refreshSignal]);

  const selectedItem = items.find((i) => i.id === selectedId) || items[0] || null;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const resetFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setStatusFilter('all');
    setSourceFilter('all');
    setSenderFilter('all');
    setOnlyFallback(false);
    setPage(0);
  };

  const hasActiveFilters =
    Boolean(debouncedSearch) ||
    statusFilter !== 'all' ||
    sourceFilter !== 'all' ||
    senderFilter !== 'all' ||
    onlyFallback;

  const handleCopyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} disalin ke clipboard`);
    } catch {
      toast.error(`Gagal menyalin ${label.toLowerCase()}`);
    }
  };

  const handleResend = async (item: OutboxRecord) => {
    if (item.recipientType !== 'individual' || item.messageType !== 'text') return;
    setIsResending(true);
    try {
      const res = await fetch('/api/admin/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: item.recipientPhone,
          message: item.messageBody,
          recipientName: item.recipientName || undefined,
          sourceTag: item.sourceTag || 'individual',
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(`Pesan berhasil dikirim ulang ke ${item.recipientName || item.recipientPhone}`);
        fetchOutbox();
      } else {
        toast.error(json.error?.message || json.message || 'Gagal mengirim ulang pesan');
      }
    } catch {
      toast.error('Terjadi kesalahan jaringan saat mengirim ulang pesan');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={resetFilters}
          className="text-left bg-white border border-gray-200/80 hover:border-emerald-300 rounded-2xl p-4 shadow-xs transition-all"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Total Pesan Keluar
            </span>
            <MailCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-gray-900">{summary.totalAll.toLocaleString('id-ID')}</div>
          <p className="text-[11px] text-gray-400 mt-0.5">Semua kanal (Cron, Broadcast, Chat, AI)</p>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter('sent');
            setOnlyFallback(false);
            setPage(0);
          }}
          className="text-left bg-white border border-gray-200/80 hover:border-emerald-300 rounded-2xl p-4 shadow-xs transition-all"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Terkirim Hari Ini
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{summary.sentToday.toLocaleString('id-ID')}</div>
          <p className="text-[11px] text-gray-400 mt-0.5">Berhasil terkirim (WIB hari ini)</p>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter('failed');
            setOnlyFallback(false);
            setPage(0);
          }}
          className={`text-left bg-white border rounded-2xl p-4 shadow-xs transition-all ${
            summary.failedAll > 0
              ? 'border-rose-200 hover:border-rose-300'
              : 'border-gray-200/80 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Gagal Kirim
            </span>
            <XCircle className={`h-4 w-4 ${summary.failedAll > 0 ? 'text-rose-600' : 'text-gray-400'}`} />
          </div>
          <div className={`text-2xl font-black ${summary.failedAll > 0 ? 'text-rose-700' : 'text-gray-900'}`}>
            {summary.failedAll.toLocaleString('id-ID')}
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5">Klik untuk audit pesan gagal</p>
        </button>

        <button
          type="button"
          onClick={() => {
            setOnlyFallback((prev) => !prev);
            setPage(0);
          }}
          className={`text-left bg-white border rounded-2xl p-4 shadow-xs transition-all ${
            onlyFallback
              ? 'border-amber-400 bg-amber-50/40'
              : summary.fallbackAll > 0
              ? 'border-amber-200 hover:border-amber-300'
              : 'border-gray-200/80 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Pengiriman Fallback
            </span>
            {summary.fallbackAll > 0 ? (
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            ) : (
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            )}
          </div>
          <div
            className={`text-2xl font-black ${
              summary.fallbackAll > 0 ? 'text-amber-700' : 'text-emerald-700'
            }`}
          >
            {summary.fallbackAll.toLocaleString('id-ID')}
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {summary.fallbackAll > 0 ? 'Ada kiriman via nomor cadangan' : 'Aman — tidak ada fallback'}
          </p>
        </button>
      </div>

      {/* Main Outbox Console Card */}
      <Card className="border-gray-200/80 shadow-sm rounded-3xl overflow-hidden bg-white">
        {/* Toolbar & Filters */}
        <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/60 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Cari nama penerima, nomor WA, isi pesan, atau error..."
                className="pl-9 h-9 rounded-xl bg-white border-gray-200 text-xs"
              />
            </div>

            {/* Status Pills + Refresh */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-white border border-gray-200 rounded-xl p-0.5">
                {(['all', 'sent', 'failed'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      setStatusFilter(st);
                      setPage(0);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      statusFilter === st
                        ? st === 'failed'
                          ? 'bg-rose-600 text-white'
                          : 'bg-emerald-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {st === 'all' ? 'Semua' : st === 'sent' ? 'Terkirim' : 'Gagal'}
                  </button>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={fetchOutbox}
                disabled={isLoading}
                className="h-9 rounded-xl border-gray-200 text-xs font-semibold gap-1.5 bg-white"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Secondary Filters: Source & Sender Number */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-500">
              <Filter className="h-3.5 w-3.5" />
              Filter:
            </span>

            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setPage(0);
              }}
              className="h-8 rounded-xl border border-gray-200 bg-white px-2.5 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="all">Semua Sumber Pesan</option>
              {distinctSources.map((src) => (
                <option key={src.sourceTag} value={src.sourceTag}>
                  {src.label} ({src.count})
                </option>
              ))}
            </select>

            <select
              value={senderFilter}
              onChange={(e) => {
                setSenderFilter(e.target.value);
                setPage(0);
              }}
              className="h-8 rounded-xl border border-gray-200 bg-white px-2.5 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="all">Semua Nomor Pengirim</option>
              {distinctSenders.map((s) => (
                <option key={s.senderNumber} value={s.senderNumber}>
                  {s.displayPhone} ({s.count})
                </option>
              ))}
            </select>

            {onlyFallback && (
              <Badge className="bg-amber-100 text-amber-900 border border-amber-300 text-[11px] gap-1">
                <AlertTriangle className="h-3 w-3" />
                Hanya Fallback
                <button
                  type="button"
                  onClick={() => setOnlyFallback(false)}
                  className="ml-1 hover:text-rose-700 font-bold"
                >
                  ×
                </button>
              </Badge>
            )}

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-[11px] font-semibold text-emerald-700 hover:underline ml-auto"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>

        {/* Content Split View */}
        <CardContent className="p-0">
          {error ? (
            <div className="p-8 text-center space-y-3">
              <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto" />
              <p className="text-sm font-semibold text-gray-800">{error}</p>
              <Button size="sm" variant="outline" onClick={fetchOutbox} className="rounded-xl text-xs">
                Coba Lagi
              </Button>
            </div>
          ) : isLoading && items.length === 0 ? (
            <div className="p-12 text-center text-gray-500 text-xs flex flex-col items-center gap-2">
              <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
              <span>Memuat riwayat kotak keluar (Outbox)...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Send className="h-9 w-9 text-gray-300 mx-auto" />
              <p className="text-sm font-bold text-gray-700">
                {hasActiveFilters ? 'Tidak ada pesan keluar yang cocok dengan filter' : 'Belum ada riwayat pesan keluar'}
              </p>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                Setiap pesan WhatsApp yang dikirim oleh sistem (Pengingat Otomatis, Broadcast, Perorangan, Live Chat, dan Asisten AI) akan otomatis tercatat di sini lengkap dengan nomor pengirimnya.
              </p>
              {hasActiveFilters && (
                <Button size="sm" variant="outline" onClick={resetFilters} className="rounded-xl text-xs mt-2">
                  Tampilkan Semua
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
              {/* Left List (7 cols) */}
              <div className="lg:col-span-7 flex flex-col">
                <div className="divide-y divide-gray-100 max-h-[680px] overflow-y-auto">
                  {items.map((item) => {
                    const isSelected = selectedItem?.id === item.id;
                    const nonOfficial = item.usedFallback || isNonOfficialSender(item.senderNumber);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedId(item.id)}
                        className={`w-full text-left p-4 transition-colors hover:bg-gray-50/90 ${
                          isSelected ? 'bg-emerald-50/70 border-l-4 border-l-emerald-600' : 'border-l-4 border-l-transparent'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div
                              className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center ${
                                item.status === 'failed'
                                  ? 'bg-rose-100 text-rose-700'
                                  : item.recipientType === 'group'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {item.status === 'failed' ? (
                                <XCircle className="h-4 w-4" />
                              ) : item.recipientType === 'group' ? (
                                <Users className="h-4 w-4" />
                              ) : (
                                <User className="h-4 w-4" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-gray-900 truncate max-w-[200px]">
                                  {item.recipientName || formatRecipientPhone(item.recipientPhone, item.recipientType)}
                                </span>
                                {item.recipientName && (
                                  <span className="text-[11px] font-mono text-gray-400">
                                    {formatRecipientPhone(item.recipientPhone, item.recipientType)}
                                  </span>
                                )}
                              </div>

                              {/* Badges Row: Source + Sender + Status */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${getSourceBadgeClass(
                                    item.sourceTag
                                  )}`}
                                >
                                  {item.sourceLabel}
                                </span>

                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                                    nonOfficial
                                      ? 'bg-amber-50 text-amber-900 border-amber-300'
                                      : item.senderNumber
                                      ? 'bg-emerald-50/60 text-emerald-800 border-emerald-200/80'
                                      : 'bg-gray-50 text-gray-500 border-gray-200'
                                  }`}
                                  title={
                                    nonOfficial
                                      ? 'Terkirim bukan dari nomor resmi ...4240'
                                      : 'Nomor pengirim WhatsApp'
                                  }
                                >
                                  {nonOfficial ? (
                                    <AlertTriangle className="h-2.5 w-2.5 text-amber-600" />
                                  ) : (
                                    <Phone className="h-2.5 w-2.5" />
                                  )}
                                  <span>
                                    {item.usedFallback ? 'Fallback: ' : 'Dari: '}
                                    {formatSenderShort(item.senderNumber, item.senderDisplayPhone)}
                                  </span>
                                </span>

                                {item.status === 'failed' && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800">
                                    Gagal
                                  </span>
                                )}
                              </div>

                              {/* Snippet */}
                              <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                                {item.messageType === 'image' && '📷 '}
                                {item.messageType === 'file' && '📄 '}
                                {item.messageBody}
                              </p>

                              {item.status === 'failed' && item.errorMessage && (
                                <p className="text-[11px] text-rose-600 font-medium truncate">
                                  Error: {item.errorMessage}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0 space-y-1">
                            <div className="text-[10px] font-medium text-gray-400 whitespace-nowrap">
                              {formatWibShort(item.createdAt)}
                            </div>
                            {item.status === 'sent' ? (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600">
                                <CheckCircle2 className="h-3 w-3" />
                                Terkirim
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-rose-600">
                                <XCircle className="h-3 w-3" />
                                Gagal
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Pagination Footer */}
                <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between text-xs text-gray-500">
                  <span>
                    Menampilkan{' '}
                    <strong className="text-gray-800">
                      {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)}
                    </strong>{' '}
                    dari <strong className="text-gray-800">{total.toLocaleString('id-ID')}</strong> pesan
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page === 0 || isLoading}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      className="h-7 px-2.5 rounded-lg text-xs bg-white"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      Prev
                    </Button>
                    <span className="text-[11px] font-semibold px-1.5">
                      {page + 1} / {totalPages}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page + 1 >= totalPages || isLoading}
                      onClick={() => setPage((p) => p + 1)}
                      className="h-7 px-2.5 rounded-lg text-xs bg-white"
                    >
                      Next
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right Detail Inspector (5 cols) */}
              <div className="lg:col-span-5 bg-gray-50/40 p-5 flex flex-col justify-between min-h-[480px]">
                {selectedItem ? (
                  <div className="space-y-4">
                    {/* Recipient Header */}
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-200/70">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-black text-gray-900 truncate">
                            {selectedItem.recipientName || 'Penerima WhatsApp'}
                          </h4>
                          <Badge
                            className={`text-[10px] border ${
                              selectedItem.status === 'sent'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : 'bg-rose-100 text-rose-800 border-rose-200'
                            }`}
                          >
                            {selectedItem.status === 'sent' ? 'Terkirim' : 'Gagal Kirim'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-mono text-gray-600">
                            {formatRecipientPhone(selectedItem.recipientPhone, selectedItem.recipientType)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyText(selectedItem.recipientPhone, 'Nomor penerima')}
                            className="text-gray-400 hover:text-emerald-700 transition-colors"
                            title="Salin nomor"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          {selectedItem.recipientType === 'individual' && (
                            <a
                              href={`https://wa.me/${selectedItem.recipientPhone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline"
                            >
                              WA Web <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Non-official / fallback warning banner */}
                    {(selectedItem.usedFallback || isNonOfficialSender(selectedItem.senderNumber)) && (
                      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 flex items-start gap-2.5 text-xs text-amber-900">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold">Terkirim bukan dari nomor resmi (...4240)</div>
                          <p className="text-[11px] text-amber-800 mt-0.5">
                            Nomor pengirim: <span className="font-mono font-bold">{selectedItem.senderDisplayPhone || selectedItem.senderNumber}</span>
                            {selectedItem.usedFallback ? ' (via Fallback Otomatis)' : ''}.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Error Box if failed */}
                    {selectedItem.status === 'failed' && selectedItem.errorMessage && (
                      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                        <div className="font-bold text-rose-900 mb-0.5">Alasan Gagal:</div>
                        <p className="font-mono text-[11px] break-words">{selectedItem.errorMessage}</p>
                      </div>
                    )}

                    {/* WhatsApp Outbound Bubble */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                          Isi Pesan Terkirim
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(selectedItem.messageBody, 'Isi pesan')}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline"
                        >
                          <Copy className="h-3 w-3" />
                          Salin Pesan
                        </button>
                      </div>

                      <div className="rounded-2xl rounded-tr-sm bg-emerald-700 text-white p-4 shadow-sm max-h-[300px] overflow-y-auto">
                        {selectedItem.mediaUrl && (
                          <a
                            href={selectedItem.mediaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 mb-2.5 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-semibold transition-colors"
                          >
                            {selectedItem.messageType === 'image' ? (
                              <ImageIcon className="h-3.5 w-3.5" />
                            ) : (
                              <FileText className="h-3.5 w-3.5" />
                            )}
                            <span>Lihat Lampiran Media</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">
                          {selectedItem.messageBody}
                        </p>
                        <div className="flex items-center justify-end gap-1.5 mt-2.5 pt-2 border-t border-white/15 text-[10px] text-emerald-100">
                          <Clock className="h-3 w-3" />
                          <span>{formatWibShort(selectedItem.createdAt)} WIB</span>
                        </div>
                      </div>
                    </div>

                    {/* Audit Metadata Table */}
                    <div className="bg-white rounded-2xl border border-gray-200/80 p-3.5 space-y-2 text-xs">
                      <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider pb-1 border-b border-gray-100">
                        Detail Audit Pengiriman
                      </div>
                      <div className="grid grid-cols-3 gap-y-2 text-[11px]">
                        <span className="text-gray-400">Waktu Kirim</span>
                        <span className="col-span-2 font-semibold text-gray-800">
                          {formatWibFull(selectedItem.createdAt)}
                        </span>

                        <span className="text-gray-400">Nomor Pengirim</span>
                        <span className="col-span-2 font-mono font-semibold text-gray-800">
                          {selectedItem.senderDisplayPhone || selectedItem.senderNumber || 'Tidak tercatat (chat lama)'}
                          {selectedItem.senderKeyMasked ? ` (${selectedItem.senderKeyMasked})` : ''}
                        </span>

                        <span className="text-gray-400">Sumber Fitur</span>
                        <span className="col-span-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${getSourceBadgeClass(
                              selectedItem.sourceTag
                            )}`}
                          >
                            {selectedItem.sourceLabel}
                          </span>
                        </span>

                        <span className="text-gray-400">Mode Pengirim</span>
                        <span className="col-span-2 text-gray-700 font-medium">
                          {selectedItem.usedFallback
                            ? 'Fallback Otomatis'
                            : selectedItem.senderSource === 'db_override'
                            ? 'Pilihan Admin (/admin/whatsapp)'
                            : selectedItem.senderSource === 'default_4240'
                            ? 'Default Resmi (...4240)'
                            : selectedItem.senderSource === 'env'
                            ? 'Konfigurasi Server (.env)'
                            : selectedItem.origin === 'chat_history'
                            ? 'Riwayat Live Chat'
                            : '-'}
                        </span>

                        <span className="text-gray-400">Message ID</span>
                        <span className="col-span-2 font-mono text-[10px] text-gray-600 break-all">
                          {selectedItem.watzapMessageId || '-'}
                        </span>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    {selectedItem.recipientType === 'individual' && selectedItem.messageType === 'text' && (
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <Button
                          type="button"
                          size="sm"
                          variant={selectedItem.status === 'failed' ? 'default' : 'outline'}
                          disabled={isResending}
                          onClick={() => handleResend(selectedItem)}
                          className={`rounded-xl text-xs font-bold gap-1.5 ${
                            selectedItem.status === 'failed'
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'border-gray-200 bg-white text-gray-700'
                          }`}
                        >
                          <RotateCcw className={`h-3.5 w-3.5 ${isResending ? 'animate-spin' : ''}`} />
                          {isResending ? 'Mengirim Ulang...' : 'Kirim Ulang Pesan Ini'}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 text-xs py-12">
                    <MailCheck className="h-8 w-8 mb-2 opacity-40" />
                    <p>Pilih salah satu pesan di sebelah kiri untuk melihat detail lengkapnya.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
