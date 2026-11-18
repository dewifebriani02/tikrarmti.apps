'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Star, CheckCircle, Trash2, Clock, MessageSquare } from 'lucide-react';
import { formatBatchBadge } from '@/lib/utils/batch-label';

interface Testimonial {
  id: string;
  user_id: string;
  content: string;
  rating: number;
  batch_name?: string | null;
  is_approved: boolean;
  created_at: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
    kota?: string | null;
  };
}

export function AdminTestimonialsTab() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
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

  const handleToggleApproval = async (id: string, currentApproved: boolean) => {
    try {
      const res = await fetch('/api/admin/testimonials', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_approved: !currentApproved })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(currentApproved ? 'Testimoni batal disetujui' : 'Testimoni berhasil disetujui');
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

  const filteredTestimonials = testimonials.filter(t => {
    if (filter === 'pending') return !t.is_approved;
    if (filter === 'approved') return t.is_approved;
    return true;
  });

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-800 mr-2"></div>
        <p className="text-gray-500 font-medium">Memuat Testimoni...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Kelola Testimoni Alumni</h2>
          <p className="text-sm text-gray-550">Setujui testimoni terpilih agar tampil di halaman depan website MTI.</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              filter === 'all' ? 'bg-white text-emerald-950 shadow-sm' : 'text-gray-650 hover:text-emerald-950'
            }`}
          >
            Semua ({testimonials.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              filter === 'pending' ? 'bg-white text-emerald-950 shadow-sm' : 'text-gray-650 hover:text-emerald-950'
            }`}
          >
            Menunggu ({testimonials.filter(t => !t.is_approved).length})
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              filter === 'approved' ? 'bg-white text-emerald-950 shadow-sm' : 'text-gray-650 hover:text-emerald-950'
            }`}
          >
            Disetujui ({testimonials.filter(t => t.is_approved).length})
          </button>
        </div>
      </div>

      {filteredTestimonials.length === 0 ? (
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="py-12 text-center text-gray-450 text-sm">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            Tidak ada testimoni yang ditemukan.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredTestimonials.map((t) => {
            const batchBadge = formatBatchBadge(t.batch_name);
            return (
              <Card key={t.id} className="border-0 shadow-md rounded-2xl overflow-hidden bg-white hover:shadow-lg transition-shadow">
                <div className={`h-1.5 ${t.is_approved ? 'bg-emerald-600' : 'bg-amber-500'}`} />
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-950 text-base">{t.user?.full_name || 'Hamba Allah'}</h3>
                        {batchBadge && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {batchBadge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {t.user?.email || '-'}
                        {t.user?.kota && ` • Domisili: ${t.user.kota.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= t.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-gray-750 text-sm italic leading-relaxed bg-gray-50/50 p-4 rounded-xl border border-gray-100/55">
                    {t.content.length > 180 && !expandedIds[t.id] ? (
                      <>
                        "{t.content.substring(0, 180)}..."
                        <button
                          onClick={() => setExpandedIds(prev => ({ ...prev, [t.id]: true }))}
                          className="text-xs text-emerald-700 hover:text-emerald-800 font-bold ml-1.5 hover:underline block mt-1"
                        >
                          Selengkapnya
                        </button>
                      </>
                    ) : (
                      <>
                        "{t.content}"
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
                  <div className="text-xs text-gray-400">
                    Dikirim pada: {new Date(t.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })}
                  </div>
                  <div className="pt-2 border-t border-gray-50 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {t.is_approved ? (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Disetujui
                        </span>
                      ) : (
                        <span className="bg-amber-50 text-amber-700 border border-amber-100 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 animate-pulse" /> Menunggu Review
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleToggleApproval(t.id, t.is_approved)}
                        variant="outline"
                        size="sm"
                        className={`rounded-lg text-xs px-3 h-8 ${
                          t.is_approved
                            ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                            : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                        }`}
                      >
                        {t.is_approved ? 'Batal Setujui' : 'Setujui'}
                      </Button>
                      <Button
                        onClick={() => handleDelete(t.id)}
                        variant="outline"
                        size="sm"
                        className="border-red-200 text-red-700 hover:bg-red-50 rounded-lg p-2 h-8 w-8 flex items-center justify-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
