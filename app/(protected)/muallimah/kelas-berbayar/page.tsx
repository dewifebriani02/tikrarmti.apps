'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  Calendar,
  Clock,
  DollarSign,
  Users,
  CheckCircle2,
  Clock3,
  XCircle,
  FileText,
  Eye,
  Edit2,
  Trash2,
  Download,
  Share2,
  ShieldAlert,
  ArrowLeft,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { MuallimahPaidClassModal } from '@/components/muallimah/MuallimahPaidClassModal';
import { AutoFlyerCanvas, FlyerClassData } from '@/components/muallimah/AutoFlyerCanvas';
import { toast, Toaster } from 'sonner';

export default function MuallimahPaidClassesPage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<any | null>(null);

  // Flyer Preview Modal state
  const [viewingFlyerClass, setViewingFlyerClass] = useState<any | null>(null);

  const fetchMyClasses = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/muallimah/paid-classes?scope=my');
      const data = await res.json();
      if (res.ok) {
        setClasses(data.classes || []);
      } else {
        toast.error(data.message || 'Gagal memuat daftar kelas');
      }
    } catch (e: any) {
      toast.error('Gagal mengambil data kelas berbayar: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyClasses();
  }, []);

  const handleDelete = async (classItem: any) => {
    if (!confirm(`Hapus pengajuan kelas "${classItem.class_name}"?`)) return;

    try {
      const res = await fetch(`/api/muallimah/paid-classes/${classItem.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Pengajuan kelas berhasil dihapus');
        fetchMyClasses();
      } else {
        toast.error(data.message || 'Gagal menghapus kelas');
      }
    } catch (e: any) {
      toast.error('Terjadi kesalahan saat menghapus kelas');
    }
  };

  // Stats
  const totalClasses = classes.length;
  const approvedClasses = classes.filter(c => c.status === 'approved').length;
  const pendingClasses = classes.filter(c => c.status === 'pending').length;
  const rejectedClasses = classes.filter(c => c.status === 'rejected').length;

  const muallimahDisplayName = user?.full_name || (user as any)?.user_metadata?.name || 'Muallimah MTI';

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      <Toaster position="top-right" richColors />

      {/* Header Sticky */}
      <div className="bg-white/95 backdrop-blur-md border-b border-gray-100 sticky top-0 z-20 shadow-xs">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-all border border-gray-200/60 shrink-0"
                title="Kembali ke Dashboard"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 uppercase tracking-widest">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>Markaz Tikrar Indonesia &bull; Pengajar</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight leading-tight">
                  Manajemen Kelas Berbayar MTI
                </h1>
              </div>
            </div>

            <button
              onClick={() => {
                setEditingClass(null);
                setIsFormModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 text-emerald-200" />
              <span>Ajukan Kelas Berbayar Baru</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Banner Info Skema MTI */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 w-80 h-full opacity-10 pointer-events-none flex items-center justify-center">
            <Sparkles className="w-64 h-64 text-amber-300" />
          </div>
          <div className="relative z-10 max-w-3xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-bold">
              🌟 Skema Bimbingan Mandiri Resmi MTI
            </div>
            <h2 className="text-lg sm:text-xl font-bold">
              Berdayakan Dakwah Quran dengan Skema Bagi Hasil Transparan & Auto-Flyer AI
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed">
              Mu'allimah MTI dapat membuka kelas bimbingan khusus berbayar resmi di bawah naungan MTI.
              Sistem secara otomatis men-generate flyer islami elegan dan prompt AI untuk Canva/ChatGPT,
              serta broadcast WhatsApp yang siap dipublikasikan ke thalibah.
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-gray-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Kelas</span>
              <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-gray-900">{totalClasses}</span>
              <span className="text-xs font-medium text-gray-500">Program</span>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-emerald-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Disetujui</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-emerald-800">{approvedClasses}</span>
              <span className="text-xs font-medium text-emerald-600">Aktif</span>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-amber-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Menunggu Review</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700">
                <Clock3 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-amber-800">{pendingClasses}</span>
              <span className="text-xs font-medium text-amber-600">Pending</span>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-rose-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">Ditolak / Perlu Revisi</span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-700">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-rose-800">{rejectedClasses}</span>
              <span className="text-xs font-medium text-rose-600">Revisi</span>
            </div>
          </div>
        </div>

        {/* Classes List */}
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900">Daftar Kelas Berbayar yang Diajukan</h3>
            <span className="text-xs text-gray-500 font-medium">{classes.length} Pengajuan Tercatat</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-500">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-3" />
              <p className="text-sm font-semibold">Memuat daftar kelas berbayar...</p>
            </div>
          ) : classes.length === 0 ? (
            <div className="p-12 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-amber-500" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="text-base font-bold text-gray-900">Belum Ada Pengajuan Kelas</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Ukhti belum mengajukan kelas bimbingan berbayar. Klik tombol di bawah untuk membuat program kelas baru dan menghasilkan auto-flyer promosi secara instan.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingClass(null);
                  setIsFormModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Mulai Ajukan Kelas</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-6">
              {classes.map(classItem => {
                const isApproved = classItem.status === 'approved';
                const isPending = classItem.status === 'pending';
                const isRejected = classItem.status === 'rejected';

                let schemeLabel = 'Skema 80:20 (Didampingi Musyrifah)';
                if (classItem.scheme === '60_40') schemeLabel = 'Skema 60:40 (Insentif Khusus)';
                if (classItem.scheme === '100') schemeLabel = 'Skema 100% (Tanpa Potongan MTI)';

                return (
                  <div
                    key={classItem.id}
                    className="flex flex-col justify-between rounded-2xl border border-gray-200/90 bg-white hover:border-emerald-300 hover:shadow-md transition-all overflow-hidden"
                  >
                    <div className="p-5 space-y-4">
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
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
                              {isApproved
                                ? 'Disetujui Admin'
                                : isPending
                                ? 'Menunggu Review Admin'
                                : 'Perlu Revisi / Ditolak'}
                            </span>
                          </span>
                        </div>

                        <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                          {classItem.scheme === '80_20' ? '80:20' : classItem.scheme === '60_40' ? '60:40' : '100%'}
                        </span>
                      </div>

                      {/* Title & Material */}
                      <div>
                        <h4 className="text-base font-bold text-gray-900 line-clamp-1">
                          {classItem.class_name}
                        </h4>
                        <p className="text-xs text-emerald-700 font-semibold mt-0.5 line-clamp-1">
                          📖 {classItem.subject_material}
                        </p>
                      </div>

                      {/* Detail Badges */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] font-medium text-gray-600 bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span className="truncate">{classItem.schedule_day}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span className="truncate">
                            {classItem.time_start} - {classItem.time_end} WIB
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="font-bold text-gray-900 truncate">
                            Rp {Number(classItem.fee_amount || 0).toLocaleString('id-ID')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>Maks. {classItem.max_students} Thalibah</span>
                        </div>
                      </div>

                      {/* Admin Notes if any */}
                      {classItem.admin_notes && (
                        <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-1">
                          <div className="font-bold flex items-center gap-1 text-[11px] text-amber-800">
                            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                            Catatan Verifikator Admin:
                          </div>
                          <p className="italic">{classItem.admin_notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="px-5 py-3.5 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setViewingFlyerClass(classItem)}
                        className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-100/70 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>Auto-Flyer & AI</span>
                      </button>

                      <div className="flex items-center gap-1">
                        {isPending && (
                          <button
                            onClick={() => {
                              setEditingClass(classItem);
                              setIsFormModalOpen(true);
                            }}
                            className="p-1.5 text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-200 transition-colors"
                            title="Ubah rincian kelas"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {isPending && (
                          <button
                            onClick={() => handleDelete(classItem)}
                            className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                            title="Hapus pengajuan kelas"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Form Submission / Edit Modal */}
      <MuallimahPaidClassModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={fetchMyClasses}
        initialData={editingClass}
        muallimahName={muallimahDisplayName}
      />

      {/* Standalone Flyer Preview Modal */}
      {viewingFlyerClass && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 flex flex-col items-center max-h-[92vh] overflow-y-auto">
            <div className="w-full flex items-center justify-between border-b pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-gray-900">
                  Flyer & AI Remake: {viewingFlyerClass.class_name}
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
                muallimah_name:
                  viewingFlyerClass.muallimah?.full_name || muallimahDisplayName,
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
