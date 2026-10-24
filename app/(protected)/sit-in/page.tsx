'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useActiveBatch } from '@/hooks/useBatches';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatTimeShort } from '@/lib/reminder-generator';
import { toast } from 'sonner';
import { 
  Loader2, 
  Video, 
  CheckCircle2, 
  Copy, 
  AlertCircle, 
  Calendar, 
  Users, 
  Info, 
  Clock, 
  ArrowRightLeft,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';

const DAYS = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'];

interface ZoomInfo {
  url?: string;
  meeting_id?: string;
  passcode?: string;
  name?: string;
}

export default function SitInPage() {
  const { user } = useAuth();
  const { activeBatch, isLoading: batchLoading } = useActiveBatch();
  const [availableHalaqahs, setAvailableHalaqahs] = useState<any[]>([]);
  const [currentSitIn, setCurrentSitIn] = useState<string | null>(null);
  const [currentSitInName, setCurrentSitInName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [registeringId, setRegisteringId] = useState<string | null>(null);
  const [registeredZoom, setRegisteredZoom] = useState<Record<string, ZoomInfo>>({});
  const [selectedDay, setSelectedDay] = useState<number | 'all'>('all');
  const supabase = createClient();

  const fetchAvailableHalaqahs = useCallback(async () => {
    if (!activeBatch?.id) return;
    setLoading(true);
    try {
      const [halaqahsResult, quotaResult, sitInResult] = await Promise.allSettled([
        supabase
          .from('halaqah')
          .select(`
            id, name, day_of_week, start_time, end_time, max_students, zoom_link, location, zoom_link_id,
            zoom:batch_zoom_links!halaqah_zoom_link_id_fkey(name, url, meeting_id, passcode),
            muallimah:users!halaqah_muallimah_id_fkey(full_name, nama_kunyah),
            program:programs!inner(id, batch_id, class_type),
            students:halaqah_students(status),
            mentors:halaqah_mentors(role, user:users!halaqah_mentors_mentor_id_fkey(full_name))
          `)
          .eq('program.batch_id', activeBatch.id)
          .eq('status', 'active'),
        fetch(`/api/shared/halaqah-quota?batch_id=${activeBatch.id}`),
        fetch(`/api/alumni/sit-in?target_user_id=${user?.id || ''}`)
      ]);

      // 1. Process Sit-In Status
      if (sitInResult.status === 'fulfilled' && sitInResult.value.ok) {
        try {
          const sitInData = await sitInResult.value.json();
          if (sitInData.success && sitInData.data?.sit_in) {
            const active = sitInData.data.sit_in;
            setCurrentSitIn(active.halaqah_id);
            setCurrentSitInName(active.halaqah_name || null);
            if (active.zoom && (active.zoom.url || active.zoom.meeting_id)) {
              setRegisteredZoom(prev => ({
                ...prev,
                [active.halaqah_id]: active.zoom
              }));
            }
          } else {
            setCurrentSitIn(null);
            setCurrentSitInName(null);
          }
        } catch (e) {
          console.warn('Error parsing sit-in status:', e);
        }
      }

      // 2. Process Quota
      const quotaMap = new Map<string, number>();
      if (quotaResult.status === 'fulfilled' && quotaResult.value.ok) {
        try {
          const quotaData = await quotaResult.value.json();
          if (quotaData.success && quotaData.data?.halaqah) {
            quotaData.data.halaqah.forEach((q: any) => quotaMap.set(q.id, q.total_current_students));
          }
        } catch (e) {
          console.warn('Error parsing quota data:', e);
        }
      }

      // 3. Process Halaqahs
      let halaqahList: any[] = [];
      if (halaqahsResult.status === 'fulfilled') {
        if (halaqahsResult.value.error) {
          console.error('Halaqah fetch error:', halaqahsResult.value.error);
        } else {
          halaqahList = halaqahsResult.value.data || [];
        }
      }

      const formatted = halaqahList.map((h: any) => {
        h.activeCount = quotaMap.has(h.id)
          ? quotaMap.get(h.id)
          : (h.students?.filter((s: any) => s.status === 'active').length || 0);

        const zoomData: any = Array.isArray(h.zoom) ? h.zoom[0] : h.zoom;
        const zoomObj: ZoomInfo = {
          url: zoomData?.url || h.zoom_link || (h.location?.includes('http') ? h.location : '') || '',
          meeting_id: zoomData?.meeting_id || '',
          passcode: zoomData?.passcode || '',
          name: zoomData?.name || ''
        };

        if (zoomObj.url || zoomObj.meeting_id) {
          setRegisteredZoom(prev => ({
            ...prev,
            [h.id]: prev[h.id] || zoomObj
          }));
        }

        return h;
      });

      // Sort by day of week and start time
      formatted.sort((a: any, b: any) => {
        if (a.day_of_week !== b.day_of_week) return (a.day_of_week || 0) - (b.day_of_week || 0);
        return (a.start_time || '').localeCompare(b.start_time || '');
      });

      setAvailableHalaqahs(formatted);
    } catch (error) {
      console.error('SitInPage fetch error:', error);
      toast.error('Gagal memuat jadwal kelas Sit-In');
    } finally {
      setLoading(false);
    }
  }, [activeBatch?.id, supabase, user?.id]);

  useEffect(() => {
    if (activeBatch?.id) {
      fetchAvailableHalaqahs();
    } else if (!batchLoading) {
      setLoading(false);
    }
  }, [activeBatch?.id, batchLoading, fetchAvailableHalaqahs]);

  const handleRegisterSitIn = async (halaqahId: string) => {
    if (!user?.id || !activeBatch?.id) return;
    setRegisteringId(halaqahId);
    try {
      const response = await fetch('/api/alumni/sit-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch_id: activeBatch.id,
          halaqah_id: halaqahId,
          target_user_id: user.id,
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Gagal mendaftar Sit-In');

      toast.success('Alhamdulillah, berhasil mendaftar Sit-In!');
      setCurrentSitIn(halaqahId);
      
      const target = availableHalaqahs.find(h => h.id === halaqahId);
      if (target) setCurrentSitInName(target.name);

      if (result.data?.zoom) {
        setRegisteredZoom(prev => ({
          ...prev,
          [halaqahId]: result.data.zoom
        }));
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Gagal mendaftar Sit-In');
    } finally {
      setRegisteringId(null);
    }
  };

  const handleCancelSitIn = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/alumni/sit-in?target_user_id=${user.id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        toast.success('Sit-In berhasil dibatalkan');
        setCurrentSitIn(null);
        setCurrentSitInName(null);
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Gagal membatalkan Sit-In');
      }
    } catch (e: any) {
      toast.error(e.message || 'Gagal membatalkan Sit-In');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Link Zoom disalin ke clipboard');
  };

  const filteredHalaqahs = selectedDay === 'all' 
    ? availableHalaqahs 
    : availableHalaqahs.filter(h => h.day_of_week === selectedDay);

  const activeSitInHalaqah = availableHalaqahs.find(h => h.id === currentSitIn);
  const activeZoom = currentSitIn ? registeredZoom[currentSitIn] : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 animate-fadeInUp pb-24">
      {/* 1. Header Halaman (Standar Jurnal Harian) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              Sit-In Kelas Pengganti
              <Sparkles className="w-4 h-4 text-amber-500" />
            </h1>
            <p className="text-gray-700 text-[10px] font-black uppercase tracking-widest leading-none mt-1">
              {activeBatch?.name || 'Tikrar Tahfidz MTI'}
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 text-rose-700 px-3 py-1.5 rounded-2xl shadow-sm">
            <span className="text-xs">🌸</span>
            <span className="text-xs font-black uppercase tracking-wider">
              {currentSitIn ? 'Terdaftar' : 'Pekan Berjalan'}
            </span>
          </div>
        </div>

        {/* 2. Hero Status Card (Gradien Hijau Tua Elegan) */}
        {currentSitIn ? (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-900 to-green-800 p-4 sm:p-5 text-white shadow-lg border border-white/10">
            <div className="relative z-10 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-[10px] font-black uppercase tracking-wider">
                  <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                  Terdaftar Sit-In Pekan Ini
                </div>
                <span className="text-[10px] font-bold text-green-200/60 uppercase tracking-widest">
                  Aktif
                </span>
              </div>

              <div>
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  {currentSitInName || activeSitInHalaqah?.name || 'Halaqah Sit-In'}
                </h2>
                {activeSitInHalaqah && (
                  <p className="text-green-100/70 text-xs mt-0.5 flex flex-wrap items-center gap-1.5">
                    <span>{DAYS[activeSitInHalaqah.day_of_week || 1]}</span>
                    <span>•</span>
                    <span>{formatTimeShort(activeSitInHalaqah.start_time)} WIB</span>
                    <span>•</span>
                    <span>Mu'allimah: {activeSitInHalaqah.muallimah?.nama_kunyah || activeSitInHalaqah.muallimah?.full_name || '-'}</span>
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-2">
                {activeZoom?.url && (
                  <Button
                    size="sm"
                    onClick={() => window.open(activeZoom.url, '_blank')}
                    className="bg-white hover:bg-emerald-50 text-emerald-950 font-black rounded-xl text-xs shadow-sm"
                  >
                    <Video className="w-3.5 h-3.5 mr-1 text-emerald-700" />
                    Buka Zoom
                  </Button>
                )}
                {activeZoom?.url && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyLink(activeZoom.url!)}
                    className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-xl text-xs font-semibold"
                  >
                    <Copy className="w-3.5 h-3.5 mr-1" />
                    Salin Link
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelSitIn}
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-100 border-red-300/30 rounded-xl text-xs font-semibold ml-auto"
                >
                  Batalkan
                </Button>
              </div>

              {(activeZoom?.meeting_id || activeZoom?.passcode) && (
                <div className="pt-1 text-[11px] text-green-100/70 flex flex-wrap gap-3 font-mono">
                  {activeZoom.meeting_id && (
                    <span>ID: <strong className="text-white font-mono">{activeZoom.meeting_id}</strong></span>
                  )}
                  {activeZoom.passcode && (
                    <span>Passcode: <strong className="text-white font-mono">{activeZoom.passcode}</strong></span>
                  )}
                </div>
              )}
            </div>

            {/* Subtle glow */}
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-24 h-24 bg-yellow-400/5 rounded-full blur-2xl" />
            <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-24 h-24 bg-green-400/5 rounded-full blur-2xl" />
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-900 to-green-800 p-4 text-white shadow-lg border border-white/10">
            <div className="relative z-10 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner">
                  <ArrowRightLeft className="w-5 h-5 text-green-200" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white tracking-wide">
                    Status Sit-In Pekan Ini
                  </h2>
                  <p className="text-green-100/70 text-[10px] font-black uppercase tracking-tighter">
                    Belum Terdaftar di Kelas Pengganti
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/15 text-green-100 px-2.5 py-1 rounded-lg border border-white/10">
                  Tersedia {availableHalaqahs.length} Kelas
                </span>
              </div>
            </div>

            {/* Decorative subtle glows */}
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-24 h-24 bg-yellow-400/5 rounded-full blur-2xl" />
            <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-24 h-24 bg-green-400/5 rounded-full blur-2xl" />
          </div>
        )}
      </div>

      {/* 3. Banner Edukasi Ringkas (Gaya Banner Jadwal Jurnal Harian) */}
      <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-100/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Info className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="text-xs font-black text-gray-900 leading-tight">
              Fasilitas Izin & Sit-In Santri
            </p>
            <p className="text-[10px] text-gray-500 font-medium mt-0.5">
              Berhalangan hadir di kelas utama pekan ini? Silakan pilih jadwal kelas pengganti di bawah.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
          <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-md border border-emerald-200">
            Pekan Berjalan
          </span>
        </div>
      </div>

      {/* 4. Filter Hari */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">
            Pilih Hari Kelas:
          </span>
          <span className="text-[10px] text-gray-400 font-bold">
            {filteredHalaqahs.length} Jadwal
          </span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedDay('all')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-sm",
              selectedDay === 'all'
                ? "bg-green-900 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-100"
            )}
          >
            Semua ({availableHalaqahs.length})
          </button>
          {[1, 2, 3, 4, 5, 6, 7].map(dayNum => {
            const count = availableHalaqahs.filter(h => h.day_of_week === dayNum).length;
            if (count === 0) return null;
            return (
              <button
                key={dayNum}
                type="button"
                onClick={() => setSelectedDay(dayNum)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-sm",
                  selectedDay === dayNum
                    ? "bg-green-900 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-100"
                )}
              >
                {DAYS[dayNum]} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Daftar Kelas Halaqah (Standar Card Jurnal Harian) */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-green-900" />
          <p className="text-xs font-semibold text-gray-500">Memuat kuota kelas halaqah...</p>
        </div>
      ) : filteredHalaqahs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 p-8 space-y-2 shadow-sm">
          <p className="text-sm font-bold text-gray-700">Tidak ada jadwal kelas tersedia</p>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Belum ada halaqah yang dibuka untuk hari ini atau seluruh kuota sedang penuh.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filteredHalaqahs.map(halaqah => {
            const activeCount = halaqah.activeCount || 0;
            const maxQuota = halaqah.max_students || 999;
            const isFull = activeCount >= maxQuota;
            const isCurrent = currentSitIn === halaqah.id;
            const zoomInfo = registeredZoom[halaqah.id];
            const remaining = Math.max(0, maxQuota - activeCount);

            return (
              <Card 
                key={halaqah.id}
                className={cn(
                  "rounded-2xl border shadow-sm transition-all overflow-hidden p-4",
                  isCurrent 
                    ? "ring-1 ring-emerald-400 border-emerald-300 bg-emerald-50/30" 
                    : isFull 
                      ? "bg-gray-50/80 border-gray-200 opacity-60" 
                      : "bg-white border-gray-100 hover:border-green-200"
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        <Calendar className="w-3 h-3 text-emerald-600" />
                        <span>{DAYS[halaqah.day_of_week || 1]}</span>
                        <span>•</span>
                        <span>{formatTimeShort(halaqah.start_time)} WIB</span>
                      </span>

                      {isCurrent ? (
                        <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200">
                          Terdaftar
                        </span>
                      ) : isFull ? (
                        <span className="text-[9px] font-black uppercase tracking-wider bg-gray-200 text-gray-600 px-2 py-0.5 rounded-md">
                          Penuh
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          Sisa {remaining} Kursi
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-gray-900 text-sm">
                      {halaqah.name}
                    </h3>

                    <div className="text-xs text-gray-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        Mu'allimah: <strong className="text-gray-700 font-semibold">{halaqah.muallimah?.nama_kunyah || halaqah.muallimah?.full_name || 'Menunggu Penugasan'}</strong>
                      </span>
                      <span>•</span>
                      <span>Kapasitas: {activeCount} / {maxQuota} santri</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 w-full sm:w-auto">
                    {isCurrent ? (
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        {zoomInfo?.url && (
                          <Button
                            size="sm"
                            onClick={() => window.open(zoomInfo.url, '_blank')}
                            className="flex-1 sm:flex-initial bg-green-900 hover:bg-green-800 text-white font-bold rounded-xl text-xs"
                          >
                            <Video className="w-3.5 h-3.5 mr-1.5" />
                            Zoom
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelSitIn}
                          className="text-red-600 border-red-200 hover:bg-red-50 text-xs font-semibold rounded-xl"
                        >
                          Batal
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleRegisterSitIn(halaqah.id)}
                        disabled={isFull || registeringId === halaqah.id}
                        className={cn(
                          "w-full sm:w-auto rounded-xl font-bold text-xs transition-all",
                          isFull 
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                            : "bg-green-900 hover:bg-green-800 text-white shadow-sm"
                        )}
                      >
                        {registeringId === halaqah.id ? (
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        {isFull ? 'Penuh' : 'Daftar'}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
