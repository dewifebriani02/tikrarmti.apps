'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, ArrowLeft, RefreshCw, Shield, CheckCircle, Clock, Star, Trash2, Search } from 'lucide-react';
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

export default function AdminTestimonialsPage() {
  const [mounted, setMounted] = useState(false);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

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
  const avgRating = totalCount > 0
    ? (testimonials.reduce((sum, t) => sum + t.rating, 0) / totalCount).toFixed(1)
    : '0.0';

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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
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

        {/* Filters & Search Bar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Filter Tabs */}
            <div className="flex bg-gray-100/70 p-1 rounded-xl">
              {[
                { key: 'all' as const, label: 'Semua', count: totalCount },
                { key: 'pending' as const, label: 'Menunggu', count: pendingCount },
                { key: 'approved' as const, label: 'Disetujui', count: approvedCount },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5",
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

            {/* Search */}
            <div className="relative w-full sm:w-72">
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
    </div>
  );
}
