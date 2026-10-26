'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Clock3,
  XCircle,
  Search,
  Filter,
  Check,
  X,
  Eye,
  MessageCircle,
  Calendar,
  Clock,
  DollarSign,
  Users,
  ShieldCheck,
  RefreshCw,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { AutoFlyerCanvas } from '@/components/muallimah/AutoFlyerCanvas';
import { toast } from 'sonner';

export function MuallimahPaidClassesTab() {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Review modal state
  const [selectedClass, setSelectedClass] = useState<any | null>(null);
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected' | null>(null);
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Flyer Preview Modal
  const [viewingFlyerClass, setViewingFlyerClass] = useState<any | null>(null);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/muallimah/paid-classes?scope=all');
      const data = await res.json();
      if (res.ok) {
        setClasses(data.classes || []);
      } else {
        toast.error(data.message || 'Gagal memuat data kelas');
      }
    } catch (e: any) {
      toast.error('Gagal mengambil data kelas berbayar: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleReviewSubmit = async () => {
    if (!selectedClass || !reviewAction) return;

    setIsSubmittingReview(true);
    try {
      const res = await fetch(`/api/muallimah/paid-classes/${selectedClass.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: reviewAction,
          admin_notes: adminNotes.trim() || (reviewAction === 'approved' ? 'Disetujui oleh Admin MTI' : 'Perlu penyesuaian jadwal atau materi')
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal menyimpan status verifikasi');
      }

      toast.success(
        reviewAction === 'approved'
          ? 'Kelas Berbayar MTI berhasil disetujui!'
          : 'Pengajuan kelas ditandai perlu revisi / ditolak.'
      );
      setSelectedClass(null);
      setReviewAction(null);
      setAdminNotes('');
      fetchClasses();
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleDeleteClass = async (classItem: any) => {
    if (!confirm(`Hapus permanen kelas "${classItem.class_name}" dari Ustadzah ${classItem.muallimah?.full_name}?`)) return;

    try {
      const res = await fetch(`/api/muallimah/paid-classes/${classItem.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Kelas berhasil dihapus');
        fetchClasses();
      } else {
        toast.error(data.message || 'Gagal menghapus');
      }
    } catch (err: any) {
      toast.error('Gagal menghapus kelas');
    }
  };

  // Filtered
  const filteredClasses = classes.filter(c => {
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.class_name?.toLowerCase().includes(q);
      const matchMuallimah = c.muallimah?.full_name?.toLowerCase().includes(q);
      const matchMaterial = c.subject_material?.toLowerCase().includes(q);
      return matchName || matchMuallimah || matchMaterial;
    }
    return true;
  });

  const pendingCount = classes.filter(c => c.status === 'pending').length;
  const approvedCount = classes.filter(c => c.status === 'approved').length;
  const rejectedCount = classes.filter(c => c.status === 'rejected').length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-amber-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block">
              Menunggu Review
            </span>
            <span className="text-2xl font-black text-amber-900 mt-1 block">
              {pendingCount}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
            <Clock3 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-emerald-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
              Disetujui / Aktif
            </span>
            <span className="text-2xl font-black text-emerald-900 mt-1 block">
              {approvedCount}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-rose-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider block">
              Ditolak / Revisi
            </span>
            <span className="text-2xl font-black text-rose-900 mt-1 block">
              {rejectedCount}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center font-bold">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari judul kelas, mu'allimah, atau materi..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filterStatus === 'all'
                ? 'bg-gray-900 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Semua ({classes.length})
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filterStatus === 'pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilterStatus('approved')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filterStatus === 'approved'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            Disetujui ({approvedCount})
          </button>
          <button
            onClick={() => setFilterStatus('rejected')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filterStatus === 'rejected'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            Ditolak ({rejectedCount})
          </button>

          <button
            onClick={fetchClasses}
            className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors shrink-0"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table of Paid Classes */}
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Mu'allimah Pengampu</th>
                <th className="py-3.5 px-4">Program & Materi</th>
                <th className="py-3.5 px-4">Skema & Tarif</th>
                <th className="py-3.5 px-4">Jadwal & Kuota</th>
                <th className="py-3.5 px-4">Status Verifikasi</th>
                <th className="py-3.5 px-4 text-center">Aksi Verifikasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500 font-semibold">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mb-2" />
                    <p>Memuat data kelas berbayar...</p>
                  </td>
                </tr>
              ) : filteredClasses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400 font-medium">
                    Tidak ada pengajuan kelas berbayar yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredClasses.map(item => {
                  const isApproved = item.status === 'approved';
                  const isPending = item.status === 'pending';
                  const isRejected = item.status === 'rejected';

                  let schemeBadge = '80:20 (Musyrifah)';
                  if (item.scheme === '60_40') schemeBadge = '60:40 (Insentif)';
                  if (item.scheme === '100') schemeBadge = '100% (Mandiri)';

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                      {/* Mu'allimah */}
                      <td className="py-4 px-4 font-medium">
                        <div className="font-bold text-gray-900 text-sm">
                          {item.muallimah?.full_name || 'Muallimah'}
                        </div>
                        <div className="text-gray-500 text-[11px] flex items-center gap-1 mt-0.5">
                          <span>WA: {item.muallimah?.whatsapp || '-'}</span>
                          {item.muallimah?.whatsapp && (
                            <a
                              href={`https://wa.me/${item.muallimah.whatsapp.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-600 hover:text-emerald-700"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Class & Material */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-emerald-950 text-sm">{item.class_name}</div>
                        <div className="text-gray-600 text-[11px] mt-0.5 line-clamp-1">
                          📖 {item.subject_material}
                        </div>
                        {item.facilities && (
                          <div className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">
                            Fasilitas: {item.facilities}
                          </div>
                        )}
                      </td>

                      {/* Scheme & Fee */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md font-bold text-[10px] mb-1">
                          {schemeBadge}
                        </span>
                        <div className="font-bold text-gray-900 text-xs">
                          Rp {Number(item.fee_amount || 0).toLocaleString('id-ID')}
                        </div>
                      </td>

                      {/* Schedule & Capacity */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="font-semibold text-gray-800">
                          {item.schedule_day}
                        </div>
                        <div className="text-gray-500 text-[11px]">
                          {item.time_start} - {item.time_end} WIB
                        </div>
                        <div className="text-[10px] text-indigo-700 font-bold mt-0.5">
                          Kuota: {item.max_students} Thalibah
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            isApproved
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : isPending
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {isApproved && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          {isPending && <Clock3 className="w-3 h-3 text-amber-600" />}
                          {isRejected && <XCircle className="w-3 h-3 text-rose-600" />}
                          <span>
                            {isApproved ? 'Disetujui' : isPending ? 'Menunggu Review' : 'Ditolak / Revisi'}
                          </span>
                        </span>
                        {item.admin_notes && (
                          <p className="text-[10px] text-gray-500 italic mt-1 max-w-[150px] truncate">
                            Catatan: {item.admin_notes}
                          </p>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View Flyer Button */}
                          <button
                            onClick={() => setViewingFlyerClass(item)}
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg border border-emerald-200 transition-colors"
                            title="Lihat Auto-Flyer & AI Prompts"
                          >
                            <Sparkles className="w-4 h-4 text-amber-600" />
                          </button>

                          {/* Quick Approve Button */}
                          <button
                            onClick={() => {
                              setSelectedClass(item);
                              setReviewAction('approved');
                              setAdminNotes(item.admin_notes || 'Disetujui oleh Admin MTI');
                            }}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              isApproved
                                ? 'bg-gray-100 text-gray-400 border-gray-200'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700'
                            }`}
                            title="Setujui Kelas"
                          >
                            <Check className="w-4 h-4" />
                          </button>

                          {/* Reject / Request Revision Button */}
                          <button
                            onClick={() => {
                              setSelectedClass(item);
                              setReviewAction('rejected');
                              setAdminNotes(item.admin_notes || '');
                            }}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg border border-rose-200 transition-colors"
                            title="Tolak atau Minta Revisi"
                          >
                            <X className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteClass(item)}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                            title="Hapus Kelas"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {selectedClass && reviewAction && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                {reviewAction === 'approved' ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                ) : (
                  <XCircle className="w-6 h-6 text-rose-600" />
                )}
                <h3 className="text-base font-bold text-gray-900">
                  {reviewAction === 'approved' ? 'Setujui Kelas Berbayar' : 'Tolak / Minta Revisi'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setSelectedClass(null);
                  setReviewAction(null);
                }}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600"
              >
                &times;
              </button>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl space-y-1 text-xs">
              <div>
                <span className="font-bold text-gray-700">Program:</span> {selectedClass.class_name}
              </div>
              <div>
                <span className="font-bold text-gray-700">Mu'allimah:</span>{' '}
                {selectedClass.muallimah?.full_name}
              </div>
              <div>
                <span className="font-bold text-gray-700">Jadwal:</span> {selectedClass.schedule_day} (
                {selectedClass.time_start} - {selectedClass.time_end} WIB)
              </div>
              <div>
                <span className="font-bold text-gray-700">Tarif / Kuota:</span> Rp{' '}
                {Number(selectedClass.fee_amount || 0).toLocaleString('id-ID')} / {selectedClass.max_students} Thalibah
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">
                Catatan Verifikator (Akan dibaca oleh Mu'allimah):
              </label>
              <textarea
                rows={3}
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
                placeholder={
                  reviewAction === 'approved'
                    ? 'Catatan persetujuan (opsional, misal: ruang zoom telah dialokasikan)...'
                    : 'Jelaskan alasan penolakan atau poin yang perlu disesuaikan...'
                }
                className="w-full p-3 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedClass(null);
                  setReviewAction(null);
                }}
                className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSubmittingReview}
                onClick={handleReviewSubmit}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-all ${
                  reviewAction === 'approved'
                    ? 'bg-emerald-700 hover:bg-emerald-800'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {isSubmittingReview ? 'Menyimpan...' : 'Konfirmasi Keputusan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Standalone Flyer Modal */}
      {viewingFlyerClass && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 flex flex-col items-center max-h-[92vh] overflow-y-auto">
            <div className="w-full flex items-center justify-between border-b pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-gray-900">
                  Auto-Flyer & AI Prompt: {viewingFlyerClass.class_name}
                </h3>
              </div>
              <button
                onClick={() => setViewingFlyerClass(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                &times;
              </button>
            </div>

            <AutoFlyerCanvas
              data={{
                class_name: viewingFlyerClass.class_name,
                muallimah_name: viewingFlyerClass.muallimah?.full_name || 'Muallimah MTI',
                subject_material: viewingFlyerClass.subject_material,
                schedule_day: viewingFlyerClass.schedule_day,
                time_start: viewingFlyerClass.time_start,
                time_end: viewingFlyerClass.time_end,
                fee_amount: viewingFlyerClass.fee_amount,
                max_students: viewingFlyerClass.max_students,
                facilities: viewingFlyerClass.facilities,
                flyer_prompt_ai: viewingFlyerClass.flyer_prompt_ai,
                whatsapp_group_link: viewingFlyerClass.whatsapp_group_link
              }}
              className="w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}
