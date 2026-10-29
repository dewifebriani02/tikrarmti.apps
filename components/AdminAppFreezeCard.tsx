'use client';

import { useState, useEffect } from 'react';
import { Snowflake, ShieldCheck, AlertTriangle, Lock, Unlock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export function AdminAppFreezeCard() {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isFrozen, setIsFrozen] = useState<boolean>(false);

  const fetchFreezeStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setIsFrozen(data.is_frozen === true);
        }
      }
    } catch (err) {
      console.error('Error fetching freeze settings:', err);
      toast.error('Gagal memuat status freeze aplikasi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFreezeStatus();
  }, []);

  const handleToggleFreeze = async () => {
    const nextState = !isFrozen;
    const confirmMsg = nextState
      ? 'Apakah Anda yakin ingin MEMBEKUKAN aplikasi? Semua pengguna non-admin akan dialihkan ke halaman pemeliharaan (/maintenance).'
      : 'Apakah Anda yakin ingin MEMBUKA KEMBALI aplikasi agar santriwati dan muallimah dapat mengakses sistem secara normal?';

    if (!window.confirm(confirmMsg)) return;

    try {
      setUpdating(true);
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_frozen: nextState }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setIsFrozen(nextState);
          toast.success(
            nextState
              ? 'Aplikasi berhasil dibekukan (Mode Maintenance Aktif)'
              : 'Aplikasi berhasil dibuka kembali (Akses Normal Aktif)'
          );
        } else {
          toast.error(data.error || 'Gagal mengubah status');
        }
      } else {
        toast.error('Gagal memperbarui pengaturan server');
      }
    } catch (err) {
      console.error('Error toggling freeze:', err);
      toast.error('Terjadi kesalahan jaringan');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-2xl p-6 border border-gray-100 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${isFrozen ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>
            <Snowflake className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              Status Operasional Aplikasi (Freeze Mode)
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Kontrol darurat untuk transisi pergantian batch, maintenance, atau rekapitulasi data
            </p>
          </div>
        </div>

        <div>
          {loading ? (
            <Badge variant="outline" className="text-xs text-gray-400 border-gray-200">
              Memeriksa...
            </Badge>
          ) : isFrozen ? (
            <Badge className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-3 py-1 gap-1.5 shadow-xs">
              <Lock className="w-3.5 h-3.5" />
              <span>Aplikasi Dibekukan (Maintenance)</span>
            </Badge>
          ) : (
            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1 gap-1.5 shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Akses Normal (Aktif)</span>
            </Badge>
          )}
        </div>
      </div>

      <div className="rounded-xl p-4 text-xs sm:text-sm leading-relaxed border flex items-start gap-3 bg-gray-50/80 border-gray-200/80">
        <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${isFrozen ? 'text-red-500' : 'text-amber-500'}`} />
        <div className="space-y-1">
          <p className="font-semibold text-gray-800">
            {isFrozen
              ? 'Mode Maintenance sedang berjalan aktif:'
              : 'Informasi Dampak Pembekuan Sistem:'}
          </p>
          <p className="text-gray-600 text-xs">
            {isFrozen
              ? 'Pengguna non-admin (santriwati, thalibah, & muallimah) saat ini dialihkan ke halaman pemberitahuan pemeliharaan (/maintenance) dan tidak dapat mengubah jurnal, tashih, atau pendaftaran.'
              : 'Ketika aplikasi dibekukan, santriwati tidak dapat login atau mengakses halaman belajar. Akun admin dan pengurus tetap memiliki akses penuh ke sistem.'}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <span className="text-xs text-gray-400">
          Hanya Super Admin / Admin yang berwenang mengubah status ini.
        </span>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchFreezeStatus}
            disabled={loading || updating}
            className="text-gray-600 hover:text-gray-900 border-gray-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={handleToggleFreeze}
            disabled={loading || updating}
            className={`font-bold transition-all shadow-sm ${
              isFrozen
                ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            {updating ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : isFrozen ? (
              <Unlock className="w-4 h-4 mr-2" />
            ) : (
              <Snowflake className="w-4 h-4 mr-2" />
            )}
            {isFrozen ? 'Buka Akses Aplikasi (Unfreeze)' : 'Bekukan Aplikasi (Freeze)'}
          </Button>
        </div>
      </div>
    </div>
  );
}
