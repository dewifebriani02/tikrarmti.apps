'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, ArrowLeft, RefreshCw, Shield, CheckCircle, Clock, Star, Trash2, Search, Users, AlertCircle, X, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { toast, Toaster } from 'sonner';
import { formatBatchBadge } from '@/lib/utils/batch-label';

interface Testimonial {
  id: string;
  user_id: string;
  content: string;
  rating: number;
  batch_name?: string | null;
  is_approved: boolean;
  created_at: string;
  updated_at?: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
    kota?: string | null;
  };
}

interface MissingThalibah {
  user_id: string;
  full_name: string;
  email?: string | null;
  whatsapp?: string | null;
  chosen_juz?: string | null;
}

interface BatchBreakdownItem {
  batch_id: string;
  batch_name: string;
  batch_status: string;
  total_testimoni: number;
  approved_testimoni: number;
  pending_testimoni: number;
  total_thalibah_aktif: number;
  thalibah_aktif_sudah_isi: number;
  thalibah_aktif_belum_isi: number;
  total_lolos_seleksi: number;
  lolos_seleksi_sudah_isi: number;
  lolos_seleksi_belum_isi: number;
  missing_active_thalibah: MissingThalibah[];
}

export default function AdminTestimonialsPage() {
  const [mounted, setMounted] = useState(false);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [batchBreakdown, setBatchBreakdown] = useState<BatchBreakdownItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [batchFilter, setBatchFilter] = useState<'all' | 'batch2' | 'batch3' | 'batch1'>('all');
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [selectedMissingBatch, setSelectedMissingBatch] = useState<BatchBreakdownItem | null>(null);
  const [missingSearch, setMissingSearch] = useState('');

  useEffect(() => {
    setMounted(true);
    fetchTestimonials();
  }, []);

  const fetchTestimonials = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/testimonials');
      if (!res.ok) throw new Error('Gagal memuat testimoni');
      const data = await res.json();
      if (data.success) {
        setTestimonials(data.data || []);
        if (Array.isArray(data.batchBreakdown)) {
          setBatchBreakdown(data.batchBreakdown);
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Terjadi kesalahan saat memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTestimonials();
    setRefreshing(false);
    toast.success('Data testimoni berhasil diperbarui');
  };

  const handleToggleApproval = async (id: string, currentApproved: boolean) => {
    try {
      const res = await fetch('/api/admin/testimonials', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_approved: !currentApproved })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(currentApproved ? 'Testimoni batal disetujui' : 'Testimoni berhasil disetujui & tampil di landing page');
        setTestimonials(prev =>
          prev.map(t => (t.id === id ? { ...t, is_approved: !currentApproved } : t))
        );
      } else {
        toast.error(data.error || 'Gagal mengubah status testimoni');
      }
    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan koneksi');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Apakah Ukhti yakin ingin menghapus testimoni ini? Tindakan ini tidak bisa dibatalkan.')) return;

    try {
      const res = await fetch(`/api/admin/testimonials?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Testimoni berhasil dihapus');
        setTestimonials(prev => prev.filter(t => t.id !== id));
      } else {
        toast.error(data.error || 'Gagal menghapus testimoni');
      }
    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan koneksi');
    }
  };

  // Filter and search
  const filteredTestimonials = testimonials
    .filter(t => {
      if (filter === 'pending') return !t.is_approved;
      if (filter === 'approved') return t.is_approved;
      return true;
    })
    .filter(t => {
      if (batchFilter === 'all') return true;
      const bn = (t.batch_name || '').toLowerCase();
      if (batchFilter === 'batch2') return bn.includes('batch 2');
      if (batchFilter === 'batch3') return bn.includes('batch 3');
      if (batchFilter === 'batch1') return bn.includes('batch 1');
      return true;
    })
    .filter(t => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        t.content.toLowerCase().includes(q) ||
        (t.batch_name || '').toLowerCase().includes(q) ||
        (t.user?.full_name || '').toLowerCase().includes(q) ||
        (t.user?.email || '').toLowerCase().includes(q)
      );
    });

  // Stats
  const totalCount = testimonials.length;
  const pendingCount = testimonials.filter(t => !t.is_approved).length;
  const approvedCount = testimonials.filter(t => t.is_approved).length;
  const batch2Count = testimonials.filter(t => (t.batch_name || '').toLowerCase().includes('batch 2')).length;
  const batch3Count = testimonials.filter(t => (t.batch_name || '').toLowerCase().includes('batch 3')).length;
  const batch1Count = testimonials.filter(t => (t.batch_name || '').toLowerCase().includes('batch 1')).length;
  const avgRating = totalCount > 0
    ? (testimonials.reduce((sum, t) => sum + t.rating, 0) / totalCount).toFixed(1)
    : '0.0';

  const getWhatsAppLink = (phone?: string | null, fullName?: string | null, batchName?: string | null) => {
    if (!phone) return null;
    let clean = phone.replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) clean = '62' + clean.slice(1);
    if (!clean) return null;
    const msg = `Assalamu'alaikum Warahmatullahi Wabarakatuh.\n\nYkh. Ukhti *${fullName || 'Thalibah'}*,\n\nKami dari Tim Administrasi & Akademik Markaz Tikrar Indonesia mengingatkan bahwa Ukhti tercatat belum mengirimkan testimoni pembelajaran pada program *${batchName || 'Tikrar Tahfidz MTI'}*.\n\nBagi Ukhti yang ingin mendaftar / melanjutkan ke *Tikrar Tahfidz MTI Batch 4*, pengisian testimoni wajib diselesaikan *paling lambat tanggal 30 November 2026* melalui tautan berikut:\n🔗 https://markaztikrar.id/perjalanan-saya\n\nJazakillahu khairan.\nWassalamu'alaikum Warahmatullahi Wabarakatuh.`;
    return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`;
  };

  if (!mounted) {
    return <div className="min-h-screen bg-gray-50/50" />;
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      <Toaster position="top-right" richColors />

      {/* Header Section — matches /admin/users style */}
      <div className="bg-white border-b border-gray-100 mb-8 sticky top-0 z-20 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all border border-transparent hover:border-gray-200"
                title="Kembali ke Dashboard"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-green-600 uppercase tracking-[0.2em] mb-1">
                  <Shield className="h-3 w-3" />
                  <span>Authority Console</span>
                </div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                  Kelola Testimoni Alumni
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                    Landing Page
                  </span>
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Link
                href="/alumni"
                className="h-10 px-4 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 flex items-center gap-2 text-sm font-semibold text-emerald-800 transition-all"
              >
                <MessageSquare className="h-4 w-4" />
                Tulis Testimoni Saya
              </Link>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="h-10 px-4 rounded-xl bg-white border border-gray-200 hover:border-gray-300 flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-all hover:shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                Refresh
              </button>
              <div className="h-10 px-4 rounded-xl bg-gray-100/50 border border-gray-100 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-bold text-gray-600">
                  {totalCount} <span className="font-medium opacity-60">Total Testimoni</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {[
            {
              id: 'all' as const,
              label: 'Total Testimoni',
              value: totalCount,
              icon: MessageSquare,
              color: 'bg-blue-500 shadow-blue-200',
              activeRing: 'ring-2 ring-blue-500',
              clickable: true,
              onClick: () => setFilter('all')
            },
            {
              id: 'pending' as const,
              label: 'Menunggu Review',
              value: pendingCount,
              icon: Clock,
              color: 'bg-amber-500 shadow-amber-200',
              activeRing: 'ring-2 ring-amber-500',
              clickable: true,
              onClick: () => setFilter('pending')
            },
            {
              id: 'approved' as const,
              label: 'Disetujui',
              value: approvedCount,
              icon: CheckCircle,
              color: 'bg-emerald-500 shadow-emerald-200',
              activeRing: 'ring-2 ring-emerald-500',
              clickable: true,
              onClick: () => setFilter('approved')
            },
            {
              id: 'rating' as const,
              label: 'Rata-rata Rating',
              value: avgRating,
              icon: Star,
              color: 'bg-purple-500 shadow-purple-200',
              activeRing: '',
              clickable: false,
              onClick: () => {}
            }
          ].map((card) => {
            const Icon = card.icon;
            const isActive = card.clickable && filter === card.id;
            return (
              <div
                key={card.id}
                onClick={card.onClick}
                className={cn(
                  "bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between transition-all duration-300 hover:shadow-md hover:-translate-y-1 cursor-pointer group active:scale-95",
                  isActive && card.activeRing,
                  !card.clickable && "cursor-default active:scale-100 hover:-translate-y-0"
                )}
              >
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm font-bold text-gray-500 tracking-tight group-hover:text-gray-900 transition-colors">
                    {card.label}
                  </p>
                  {loading ? (
                    <div className="h-7 sm:h-8 w-16 sm:w-24 bg-gray-200 animate-pulse rounded"></div>
                  ) : (
                    <h3 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                      {card.value}
                    </h3>
                  )}
                </div>
                <div className={cn(
                  "p-3 sm:p-4 rounded-xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110",
                  card.color
                )}>
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Rincian Testimoni Batch 2 & Batch 3 (Sudah Isi vs Belum Isi) */}
        {batchBreakdown.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            {batchBreakdown.map((b) => {
              const isBatch3 = b.batch_name.toLowerCase().includes('batch 3');
              const filterKey = isBatch3 ? 'batch3' : 'batch2';
              const isBatchSelected = batchFilter === filterKey;
              const pctAktif = b.total_thalibah_aktif > 0
                ? Math.round((b.thalibah_aktif_sudah_isi / b.total_thalibah_aktif) * 100)
                : 0;

              return (
                <div
                  key={b.batch_id}
                  className={cn(
                    "bg-white rounded-2xl border p-5 sm:p-6 shadow-sm transition-all",
                    isBatchSelected
                      ? "border-emerald-500 ring-2 ring-emerald-500/20"
                      : "border-gray-100 hover:border-gray-200"
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider border",
                          isBatch3
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-blue-50 text-blue-800 border-blue-200"
                        )}>
                          {formatBatchBadge(b.batch_name) || b.batch_name}
                        </span>
                        <span className="text-xs font-bold text-gray-400">
                          {b.batch_name}
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-gray-900 mt-1">
                        Total Testimoni Masuk: <span className="text-emerald-700">{b.total_testimoni}</span> Testimoni
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {b.approved_testimoni} Disetujui • {b.pending_testimoni} Menunggu Review
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <button
                        type="button"
                        onClick={() => setBatchFilter(isBatchSelected ? 'all' : filterKey)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                          isBatchSelected
                            ? "bg-emerald-700 text-white border-emerald-700"
                            : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                        )}
                      >
                        {isBatchSelected ? 'Tampilkan Semua' : `Filter ${formatBatchBadge(b.batch_name)}`}
                      </button>
                    </div>
                  </div>

                  {/* Breakdown Grid: Thalibah Aktif (Daftar Ulang) & Total Lolos Seleksi */}
                  <div className="grid grid-cols-3 gap-3 my-4">
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <p className="text-[11px] font-bold text-gray-500 uppercase">Thalibah Aktif (DU)</p>
                      <p className="text-xl font-black text-gray-900 mt-0.5">{b.total_thalibah_aktif}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Lolos Seleksi: {b.total_lolos_seleksi}</p>
                    </div>
                    <div className="bg-emerald-50/70 rounded-xl p-3 border border-emerald-100">
                      <p className="text-[11px] font-bold text-emerald-700 uppercase">Sudah Isi Testi</p>
                      <p className="text-xl font-black text-emerald-800 mt-0.5">
                        {b.thalibah_aktif_sudah_isi} <span className="text-xs font-bold">({pctAktif}%)</span>
                      </p>
                      <p className="text-[10px] text-emerald-600/80 mt-0.5">Total masuk: {b.total_testimoni} testi</p>
                    </div>
                    <div className="bg-amber-50/80 rounded-xl p-3 border border-amber-200/70">
                      <p className="text-[11px] font-bold text-amber-800 uppercase">Belum Isi Testi</p>
                      <p className="text-xl font-black text-amber-900 mt-0.5">{b.thalibah_aktif_belum_isi}</p>
                      <p className="text-[10px] text-amber-700/80 mt-0.5">Dari {b.total_thalibah_aktif} thalibah aktif</p>
                    </div>
                  </div>

                  {/* Progress Bar & Action Button */}
                  <div className="space-y-2.5">
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, pctAktif)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-xs text-gray-500 font-medium">
                        Masih ada <strong className="text-amber-800">{b.thalibah_aktif_belum_isi} thalibah aktif</strong> (atau {b.lolos_seleksi_belum_isi} dari seluruh pendaftar lolos seleksi) yang belum mengisi testimoni.
                      </span>
                      {b.missing_active_thalibah.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMissingBatch(b);
                              setMissingSearch('');
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition-all cursor-pointer"
                          >
                            <Users className="w-3.5 h-3.5" />
                            Lihat Belum Isi ({b.thalibah_aktif_belum_isi})
                          </button>
                          <Link
                            href={`/admin/whatsapp?tab=broadcast&batchId=${encodeURIComponent(b.batch_id)}&filter=missing_testimonial&tmpl=reminder_testimoni_batch4`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition-all shadow-xs"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            Kirim Notifikasi WA ({b.thalibah_aktif_belum_isi})
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Filters & Search Bar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Status Filter Tabs */}
              <div className="flex bg-gray-100/70 p-1 rounded-xl">
                {[
                  { key: 'all' as const, label: 'Semua Status', count: totalCount },
                  { key: 'pending' as const, label: 'Menunggu', count: pendingCount },
                  { key: 'approved' as const, label: 'Disetujui', count: approvedCount },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key)}
                    className={cn(
                      "px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5",
                      filter === tab.key
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    )}
                  >
                    {tab.label}
                    <span className={cn(
                      "px-1.5 py-0.5 rounded-md text-[10px] font-bold",
                      filter === tab.key
                        ? 'bg-green-50 text-green-700'
                        : 'bg-gray-200/80 text-gray-500'
                    )}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Batch Filter Tabs */}
              <div className="flex bg-gray-100/70 p-1 rounded-xl">
                {[
                  { key: 'all' as const, label: 'Semua Batch', count: totalCount },
                  { key: 'batch3' as const, label: 'Batch 3', count: batch3Count },
                  { key: 'batch2' as const, label: 'Batch 2', count: batch2Count },
                  ...(batch1Count > 0 ? [{ key: 'batch1' as const, label: 'Batch 1', count: batch1Count }] : []),
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setBatchFilter(tab.key)}
                    className={cn(
                      "px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5",
                      batchFilter === tab.key
                        ? 'bg-white text-emerald-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    )}
                  >
                    {tab.label}
                    <span className={cn(
                      "px-1.5 py-0.5 rounded-md text-[10px] font-bold",
                      batchFilter === tab.key
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-gray-200/80 text-gray-500'
                    )}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Search */}
            <div className="relative w-full lg:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cari nama, batch, atau isi testimoni..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-800" />
              <p className="text-sm text-gray-500 font-medium">Memuat data testimoni...</p>
            </div>
          </div>
        ) : filteredTestimonials.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
            <MessageSquare className="w-14 h-14 mx-auto mb-4 text-gray-200" />
            <p className="text-gray-500 font-semibold text-base mb-1">Tidak ada testimoni ditemukan</p>
            <p className="text-gray-400 text-sm">
              {search ? 'Coba ubah kata kunci pencarian.' : filter !== 'all' ? 'Tidak ada testimoni dengan status ini.' : 'Belum ada alumni yang mengirim testimoni.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredTestimonials.map((t) => {
              const batchBadge = formatBatchBadge(t.batch_name);
              return (
              <div
                key={t.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group flex flex-col"
              >
                {/* Top accent bar */}
                <div className={cn("h-1", t.is_approved ? 'bg-emerald-500' : 'bg-amber-400')} />

                <div className="p-6 flex-1 flex flex-col">
                  {/* Header: User info + Rating */}
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm shrink-0">
                        {t.user?.full_name ? t.user.full_name.substring(0, 2).toUpperCase() : 'HA'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-gray-900 text-sm truncate">{t.user?.full_name || 'Hamba Allah'}</h3>
                          {batchBadge && (
                            <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {batchBadge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {t.user?.email || '-'}
                          {t.user?.kota && ` • Domisili: ${t.user.kota.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={cn(
                            "w-3.5 h-3.5",
                            star <= t.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="bg-gray-50/80 rounded-xl p-4 mb-4 flex-1 border border-gray-100/60">
                    <div className="text-gray-700 text-sm italic leading-relaxed">
                      {t.content.length > 180 && !expandedIds[t.id] ? (
                        <>
                          &ldquo;{t.content.substring(0, 180)}...&rdquo;
                          <button
                            onClick={() => setExpandedIds(prev => ({ ...prev, [t.id]: true }))}
                            className="text-xs text-emerald-700 hover:text-emerald-800 font-bold ml-1.5 hover:underline block mt-1"
                          >
                            Selengkapnya
                          </button>
                        </>
                      ) : (
                        <>
                          &ldquo;{t.content}&rdquo;
                          {t.content.length > 180 && (
                            <button
                              onClick={() => setExpandedIds(prev => ({ ...prev, [t.id]: false }))}
                              className="text-xs text-emerald-700 hover:text-emerald-800 font-bold ml-1.5 hover:underline block mt-1"
                            >
                              Sembunyikan
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Date */}
                  <p className="text-[11px] text-gray-400 mb-4">
                    Dikirim: {new Date(t.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })}
                    {t.updated_at && t.updated_at !== t.created_at && (
                      <span className="ml-1 text-gray-300">• Diubah</span>
                    )}
                  </p>

                  {/* Footer: Status + Actions */}
                  <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                    <div>
                      {t.is_approved ? (
                        <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-semibold px-2.5 py-1.5 rounded-lg">
                          <CheckCircle className="w-3.5 h-3.5" /> Tampil di Website
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-100 text-xs font-semibold px-2.5 py-1.5 rounded-lg">
                          <Clock className="w-3.5 h-3.5" /> Menunggu Review
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleApproval(t.id, t.is_approved)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all hover:shadow-sm",
                          t.is_approved
                            ? 'border-amber-200 text-amber-700 hover:bg-amber-50 bg-white'
                            : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 bg-white'
                        )}
                      >
                        {t.is_approved ? 'Batal Setujui' : 'Setujui'}
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 hover:text-red-700 transition-all bg-white hover:shadow-sm"
                        title="Hapus Testimoni"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Daftar Thalibah yang Belum Mengisi Testimoni */}
      {selectedMissingBatch && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedMissingBatch(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 bg-gradient-to-r from-amber-600 to-orange-600 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-200" />
                  <h3 className="text-lg font-black">
                    Daftar Thalibah Belum Isi Testimoni ({formatBatchBadge(selectedMissingBatch.batch_name)})
                  </h3>
                </div>
                <p className="text-xs text-amber-100 mt-1">
                  {selectedMissingBatch.thalibah_aktif_belum_isi} dari {selectedMissingBatch.total_thalibah_aktif} thalibah aktif daftar ulang pada {selectedMissingBatch.batch_name} belum mengisi testimoni.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMissingBatch(null)}
                className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-gray-100 bg-gray-50/60 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3">
                <div className="text-xs text-emerald-950">
                  <span className="font-bold block">Broadcast Pengingat Testimoni (Maks. 30 November bagi Pendaftar Batch 4)</span>
                  <span className="text-[11px] text-emerald-800">
                    Kirim pesan WhatsApp otomatis ke seluruh {selectedMissingBatch.thalibah_aktif_belum_isi} thalibah {formatBatchBadge(selectedMissingBatch.batch_name)} yang belum mengisi testimoni.
                  </span>
                </div>
                <Link
                  href={`/admin/whatsapp?tab=broadcast&batchId=${encodeURIComponent(selectedMissingBatch.batch_id)}&filter=missing_testimonial&tmpl=reminder_testimoni_batch4`}
                  className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition-all shadow-xs"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Buka Broadcast WA ({selectedMissingBatch.thalibah_aktif_belum_isi} Orang)
                </Link>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari nama, email, atau juz..."
                  value={missingSearch}
                  onChange={(e) => setMissingSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
                />
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-2.5">
              {selectedMissingBatch.missing_active_thalibah
                .filter((m) => {
                  if (!missingSearch.trim()) return true;
                  const q = missingSearch.toLowerCase();
                  return (
                    (m.full_name || '').toLowerCase().includes(q) ||
                    (m.email || '').toLowerCase().includes(q) ||
                    (m.chosen_juz || '').toLowerCase().includes(q) ||
                    (m.whatsapp || '').toLowerCase().includes(q)
                  );
                })
                .map((m, idx) => {
                  const waUrl = getWhatsAppLink(m.whatsapp, m.full_name, selectedMissingBatch.batch_name);
                  return (
                    <div
                      key={m.user_id}
                      className="flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-gray-100 bg-white hover:bg-gray-50/80 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 font-black text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-gray-900 truncate">{m.full_name}</p>
                            {m.chosen_juz && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                Juz {m.chosen_juz}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 truncate">
                            {m.email || '-'} {m.whatsapp ? `• ${m.whatsapp}` : ''}
                          </p>
                        </div>
                      </div>
                      {waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-all"
                        >
                          <span>Hubungi WA</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
