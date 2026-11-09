'use client';

import { useState, useEffect } from 'react';
import { X, Trash2, AlertTriangle, ShieldAlert, CheckCircle2, Loader2, User, Mail, Phone, Calendar, ArrowRight } from 'lucide-react';
import { AdminUser } from './types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface LegacyItem {
  label: string;
  count: number;
}

interface LegacyCheckResponse {
  success: boolean;
  isAdminUser: boolean;
  hasLegacy: boolean;
  totalLegacyCount: number;
  legacyItems: LegacyItem[];
  canDeletePermanently: boolean;
  error?: string;
}

interface DeleteUserModalProps {
  user: AdminUser;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteUserModal({ user, isOpen, onClose, onSuccess }: DeleteUserModalProps) {
  const [loadingCheck, setLoadingCheck] = useState(true);
  const [legacyData, setLegacyData] = useState<LegacyCheckResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);

  useEffect(() => {
    if (!isOpen || !user?.id) return;

    let isMounted = true;
    setLoadingCheck(true);
    setConfirmChecked(false);

    fetch(`/api/admin/users/${user.id}`)
      .then((res) => res.json())
      .then((data: LegacyCheckResponse) => {
        if (isMounted) {
          setLegacyData(data);
          setLoadingCheck(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Error fetching user legacy details:', err);
          toast.error('Gagal memeriksa riwayat legacy user');
          setLoadingCheck(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, user?.id]);

  if (!isOpen) return null;

  const handleDelete = async () => {
    if (!legacyData?.canDeletePermanently) {
      toast.error('Akun ini tidak dapat dihapus permanen karena memiliki data legacy');
      return;
    }

    if (!confirmChecked) {
      toast.error('Centang kotak konfirmasi terlebih dahulu');
      return;
    }

    try {
      setIsDeleting(true);
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menghapus pengguna');
      }

      toast.success(data.message || 'Akun pengguna berhasil dihapus permanen');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error deleting user:', err);
      toast.error(err.message || 'Terjadi kesalahan saat menghapus pengguna');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col border border-gray-100 animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-red-600 to-rose-700 px-6 py-5 text-white flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Trash2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Hapus Akun Pengguna</h2>
              <p className="text-xs text-rose-100 font-medium">Validasi Kelayakan Hapus Permanen (Tanpa Legacy)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[75vh] space-y-5">
          {/* User Preview Box */}
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center overflow-hidden border border-gray-200 shadow-sm flex-shrink-0">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <User className="h-6 w-6 text-gray-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-gray-900 truncate">
                {user.full_name || 'Hamba Allah'}
              </h3>
              <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5 flex-wrap">
                <span className="flex items-center gap-1 truncate">
                  <Mail className="h-3 w-3 text-gray-400" />
                  {user.email}
                </span>
                {user.whatsapp && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3 text-gray-400" />
                    {user.whatsapp}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Checking Status */}
          {loadingCheck ? (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
              <Loader2 className="h-8 w-8 text-rose-600 animate-spin" />
              <p className="text-sm font-bold text-gray-700">Menganalisis Riwayat & Data Legacy...</p>
              <p className="text-xs text-gray-400 max-w-xs">
                Memeriksa 22 basis data riwayat (pendaftaran, jurnal, halaqah, ujian, sertifikat, & donasi)
              </p>
            </div>
          ) : legacyData?.isAdminUser ? (
            /* Protected Admin State */
            <div className="p-5 rounded-2xl bg-purple-50 border border-purple-200 space-y-3">
              <div className="flex items-center gap-2.5 text-purple-900 font-bold text-sm">
                <ShieldAlert className="h-5 w-5 text-purple-600 flex-shrink-0" />
                <span>Akun Admin / SuperAdmin Terlindungi</span>
              </div>
              <p className="text-xs text-purple-800 leading-relaxed">
                Akun ini memiliki hak akses kepengurusan <strong>(Admin / SuperAdmin)</strong>. Sistem melarang
                penghapusan akun pengurus secara langsung demi keamanan dan mencegah penguncian sistem.
              </p>
            </div>
          ) : legacyData?.hasLegacy ? (
            /* Has Legacy State (Cannot Delete Permanently) */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2.5">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  <span>Tidak Dapat Dihapus Permanen</span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Sesuai kebijakan integritas data MTI, akun ini <strong>tidak dapat dihapus permanen</strong> karena
                  memiliki <strong>{legacyData.totalLegacyCount} catatan riwayat resmi</strong> di dalam sistem.
                  Menghapus akun dengan riwayat akan merusak arsip akademik & integritas data.
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">
                  Rincian Riwayat Terdaftar (Legacy):
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {legacyData.legacyItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-gray-50 border border-gray-200/80 flex items-center justify-between text-xs"
                    >
                      <span className="font-medium text-gray-700">{item.label}</span>
                      <span className="font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-800 flex items-start gap-2.5">
                <ArrowRight className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Solusi:</strong> Jika akun ini merupakan akun ganda atau tidak aktif, Anda dapat menggunakan opsi{' '}
                  <strong>Gabung Akun</strong> atau <strong>Nonaktifkan (Ban)</strong> di tabel manajemen user.
                </span>
              </div>
            </div>
          ) : (
            /* Clean Account State (Safe to Permanently Delete) */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                  <span>Akun Bersih — Memenuhi Syarat Hapus Permanen</span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Akun ini <strong>tidak memiliki data historis</strong> (belum pernah mendaftar program, belum ada
                  laporan jurnal, kuis, atau penempatan halaqah). Akun ini aman untuk dihapus secara permanen.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-red-50 border border-red-100 text-xs text-red-700 leading-relaxed">
                <strong>Peringatan Kritis:</strong> Tindakan ini akan menghapus seluruh rekaman profil dan akun login
                pengguna ini dari sistem dan database secara permanen. Tindakan ini tidak dapat dibatalkan.
              </div>

              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors select-none">
                <input
                  type="checkbox"
                  checked={confirmChecked}
                  onChange={(e) => setConfirmChecked(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded text-red-600 focus:ring-red-500 border-gray-300"
                />
                <span className="text-xs font-semibold text-gray-700">
                  Saya yakin dan mengonfirmasi untuk menghapus akun <u>{user.full_name || user.email}</u> secara
                  permanen.
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-200/80 transition-colors"
          >
            {legacyData?.canDeletePermanently ? 'Batal' : 'Tutup'}
          </button>

          {legacyData?.canDeletePermanently && (
            <button
              onClick={handleDelete}
              disabled={isDeleting || !confirmChecked}
              className={cn(
                'px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-2 transition-all',
                confirmChecked && !isDeleting
                  ? 'bg-red-600 hover:bg-red-700 shadow-red-200 active:scale-95'
                  : 'bg-red-300 cursor-not-allowed'
              )}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Menghapus Permanen...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  <span>Hapus Permanen Sekarang</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
