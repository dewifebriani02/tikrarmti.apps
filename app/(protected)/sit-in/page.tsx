'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useActiveBatch } from '@/hooks/useBatches';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatTimeShort } from '@/lib/reminder-generator';
import { toast } from 'react-hot-toast';
import { 
  Loader2, 
  Video, 
  CheckCircle2, 
  Copy, 
  AlertCircle, 
  ArrowLeft, 
  Calendar, 
  Users, 
  Info, 
  Clock, 
  ArrowRightLeft,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';

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
    <div className="min-h-screen bg-gray-50/50 pb-24">
      {/* Header Banner */}
      <div className="bg-white border-b border-gray-100 mb-8 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all border border-transparent hover:border-gray-200"
              title="Kembali ke Dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-rose-600 uppercase tracking-[0.2em] mb-1">
                <ArrowRightLeft className="h-3 w-3" />
                <span>Kelas Pengganti</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                Sit-In Halaqah
                <span className="px-2.5 py-0.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold border border-rose-100">
                  {activeBatch?.name || 'Batch Aktif'}
                </span>
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Info Card */}
        <div className="bg-gradient-to-r from-rose-500/10 via-pink-500/5 to-purple-500/10 border border-rose-200/60 rounded-2xl p-5 shadow-sm">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-200">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm sm:text-base">Apa itu Sit-In?</h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-1 leading-relaxed">
                Sit-In adalah fasilitas bagi Ukhti yang <strong>berhalangan hadir di kelas/halaqah utama pekan ini</strong> untuk menumpang belajar dan menyetor hafalan di jadwal kelas lain yang masih memiliki kuota kosong.
              </p>
              <div className="flex flex-wrap gap-2 mt-3 text-[11px] font-semibold text-rose-800">
                <span className="bg-rose-100/70 px-2.5 py-1 rounded-lg">✨ Berlaku untuk pekan berjalan</span>
                <span className="bg-rose-100/70 px-2.5 py-1 rounded-lg">📌 Link Zoom langsung aktif saat terdaftar</span>
                <span className="bg-rose-100/70 px-2.5 py-1 rounded-lg">🔄 Bisa ganti kelas atau batalkan kapan saja</span>
              </div>
            </div>
          </div>
        </div>

        {/* Current Active Sit-In Banner (If registered) */}
        {currentSitIn && (
          <div className="bg-gradient-to-br from-emerald-900 to-teal-800 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-xs font-bold uppercase tracking-wider">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                  Terdaftar Sit-In Pekan Ini
                </div>
                <h2 className="text-2xl font-black tracking-tight text-white">
                  {currentSitInName || activeSitInHalaqah?.name || 'Halaqah Sit-In'}
                </h2>
                {activeSitInHalaqah && (
                  <p className="text-sm text-emerald-100 flex items-center gap-2">
                    <span>{DAYS[activeSitInHalaqah.day_of_week || 1]}</span>
                    <span>•</span>
                    <span>{formatTimeShort(activeSitInHalaqah.start_time)} WIB</span>
                    <span>•</span>
                    <span>Ustadzah: {activeSitInHalaqah.muallimah?.nama_kunyah || activeSitInHalaqah.muallimah?.full_name || '-'}</span>
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                {activeZoom?.url ? (
                  <>
                    <Button
                      onClick={() => window.open(activeZoom.url, '_blank')}
                      className="bg-white hover:bg-emerald-50 text-emerald-900 font-black shadow-md rounded-xl"
                    >
                      <Video className="w-4 h-4 mr-2 text-emerald-600" />
                      Buka Zoom
                    </Button>
                    <Button
                      onClick={() => handleCopyLink(activeZoom.url!)}
                      variant="outline"
                      className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-xl"
                    >
                      <Copy className="w-4 h-4 mr-1.5" />
                      Salin Link
                    </Button>
                  </>
                ) : (
                  <span className="text-xs text-emerald-200 italic bg-white/10 px-3 py-2 rounded-xl">
                    Link Zoom akan diberikan oleh Musyrifah
                  </span>
                )}
                <Button
                  onClick={handleCancelSitIn}
                  variant="outline"
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-100 border-red-300/30 rounded-xl font-semibold"
                >
                  Batalkan
                </Button>
              </div>
            </div>

            {(activeZoom?.meeting_id || activeZoom?.passcode) && (
              <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap gap-4 text-xs text-emerald-200">
                {activeZoom.meeting_id && (
                  <span>Meeting ID: <strong className="text-white font-mono">{activeZoom.meeting_id}</strong></span>
                )}
                {activeZoom.passcode && (
                  <span>Passcode: <strong className="text-white font-mono">{activeZoom.passcode}</strong></span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Day Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider shrink-0 mr-1">
            Hari:
          </span>
          <button
            onClick={() => setSelectedDay('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedDay === 'all'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            Semua Hari ({availableHalaqahs.length})
          </button>
          {[1, 2, 3, 4, 5, 6, 7].map(dayNum => {
            const count = availableHalaqahs.filter(h => h.day_of_week === dayNum).length;
            if (count === 0) return null;
            return (
              <button
                key={dayNum}
                onClick={() => setSelectedDay(dayNum)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  selectedDay === dayNum
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {DAYS[dayNum]} ({count})
              </button>
            );
          })}
        </div>

        {/* Halaqah List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
            <p className="text-xs font-semibold text-gray-500">Memuat kuota kelas halaqah...</p>
          </div>
        ) : filteredHalaqahs.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 p-8 space-y-2">
            <p className="text-base font-bold text-gray-700">Tidak ada jadwal kelas tersedia</p>
            <p className="text-xs text-gray-500">
              Belum ada halaqah yang dibuka untuk hari ini atau seluruh kuota sedang penuh.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    isCurrent 
                      ? 'ring-2 ring-emerald-500 border-emerald-300 bg-emerald-50/20 shadow-md' 
                      : isFull 
                        ? 'bg-gray-50/80 border-gray-200 opacity-60' 
                        : 'bg-white border-gray-200/80 hover:border-rose-200 hover:shadow-md'
                  }`}
                >
                  <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{DAYS[halaqah.day_of_week || 1]}</span>
                          <span>•</span>
                          <span>{formatTimeShort(halaqah.start_time)} WIB</span>
                        </div>
                        {isCurrent ? (
                          <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-200">
                            Terdaftar
                          </span>
                        ) : isFull ? (
                          <span className="text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-700 px-2.5 py-1 rounded-full">
                            Penuh
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Sisa {remaining} Kursi
                          </span>
                        )}
                      </div>

                      {/* Halaqah Name */}
                      <h3 className="font-black text-gray-900 text-base leading-snug">
                        {halaqah.name}
                      </h3>

                      {/* Details */}
                      <div className="mt-2.5 space-y-1 text-xs text-gray-600">
                        <p className="flex items-center gap-1.5">
                          <span className="text-gray-400">Pengajar:</span>
                          <strong className="text-gray-800">
                            {halaqah.muallimah?.nama_kunyah || halaqah.muallimah?.full_name || 'Menunggu Penugasan'}
                          </strong>
                        </p>
                        <p className="flex items-center gap-1.5">
                          <span className="text-gray-400">Kapasitas:</span>
                          <span>{activeCount} / {maxQuota} santri</span>
                        </p>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-2 border-t border-gray-100">
                      {isCurrent ? (
                        <div className="flex items-center gap-2">
                          {zoomInfo?.url && (
                            <Button
                              size="sm"
                              onClick={() => window.open(zoomInfo.url, '_blank')}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs"
                            >
                              <Video className="w-3.5 h-3.5 mr-1.5" />
                              Masuk Zoom
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
                          onClick={() => handleRegisterSitIn(halaqah.id)}
                          disabled={isFull || registeringId === halaqah.id}
                          className={`w-full rounded-xl font-bold text-xs transition-all ${
                            isFull 
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                              : 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm'
                          }`}
                        >
                          {registeringId === halaqah.id ? (
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" />
                          )}
                          {isFull ? 'Kuota Penuh' : 'Daftar Sit-In di Kelas Ini'}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
