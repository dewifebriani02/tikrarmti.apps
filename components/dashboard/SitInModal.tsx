'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatTimeShort } from '@/lib/reminder-generator';
import { toast } from 'react-hot-toast';
import { Loader2, Video, CheckCircle2, Copy, AlertCircle } from 'lucide-react';

const DAYS = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'];

interface SitInModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  activeBatch: any;
  currentHalaqah?: any;
}

interface ZoomInfo {
  url?: string;
  meeting_id?: string;
  passcode?: string;
  name?: string;
}

export function SitInModal({ isOpen, onClose, user, activeBatch, currentHalaqah }: SitInModalProps) {
  const [availableHalaqahs, setAvailableHalaqahs] = useState<any[]>([]);
  const [currentSitIn, setCurrentSitIn] = useState<string | null>(null);
  const [currentSitInName, setCurrentSitInName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [registeringId, setRegisteringId] = useState<string | null>(null);
  const [registeredZoom, setRegisteredZoom] = useState<Record<string, ZoomInfo>>({});
  const supabase = createClient();

  const fetchAvailableHalaqahs = useCallback(async () => {
    if (!activeBatch?.id) return;
    setLoading(true);
    try {
      const classType = currentHalaqah?.program?.class_type || 'tikrar_tahfidz';

      // Fetch halaqahs, quotas, and current sit-in status in parallel with safe fallbacks
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
          .eq('program.class_type', classType)
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

      // Filter out current halaqah and compute active student count
      const filtered = halaqahList.filter((h: any) => {
        if (h.id === currentHalaqah?.id) return false;

        h.activeCount = quotaMap.has(h.id)
          ? quotaMap.get(h.id)
          : (h.students?.filter((s: any) => s.status === 'active').length || 0);

        // Pre-populate zoom info if available
        const zoomData: any = Array.isArray(h.zoom) ? h.zoom[0] : h.zoom;
        const zoomObj: ZoomInfo = {
          url: zoomData?.url || h.zoom_link || (h.location?.includes('http') ? h.location : '') || '',
          meeting_id: zoomData?.meeting_id || '',
          passcode: zoomData?.passcode || '',
          name: zoomData?.name || ''
        };

        if (zoomObj.url || zoomObj.meeting_id) {
          setRegisteredZoom(prev => {
            if (!prev[h.id]) {
              return { ...prev, [h.id]: zoomObj };
            }
            return prev;
          });
        }

        return true;
      });

      // Sort by day of week and time
      filtered.sort((a: any, b: any) => {
        if (a.day_of_week !== b.day_of_week) return (a.day_of_week || 0) - (b.day_of_week || 0);
        return (a.start_time || '').localeCompare(b.start_time || '');
      });

      setAvailableHalaqahs(filtered);
    } catch (error) {
      console.error('SitInModal fetch error:', error);
      toast.error('Gagal memuat jadwal kelas lain');
    } finally {
      setLoading(false);
    }
  }, [activeBatch?.id, currentHalaqah?.id, currentHalaqah?.program?.class_type, supabase, user?.id]);

  useEffect(() => {
    if (isOpen && activeBatch?.id) {
      fetchAvailableHalaqahs();
    }
  }, [isOpen, activeBatch?.id, fetchAvailableHalaqahs]);

  const handleRegisterSitIn = async (halaqahId: string) => {
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

      toast.success('Berhasil mendaftar Sit-In!');
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
    toast.success('Link disalin ke clipboard');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl w-full rounded-[1.5rem] p-0 overflow-hidden bg-white max-h-[85vh] flex flex-col">
        <div className="p-6 pb-4 bg-indigo-50/50 border-b border-indigo-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-gray-900 tracking-tight">Kuota & Sit-In Kelas Lain</DialogTitle>
            <DialogDescription className="text-sm font-medium text-gray-600 mt-1">
              Daftar Sit-In jika Ukhti berhalangan hadir di kelas utama dan ingin menumpang kelas di jadwal lain minggu ini.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : availableHalaqahs.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm italic">
              Tidak ada jadwal kelas lain yang tersedia saat ini.
            </div>
          ) : (
            <div className="space-y-4">
              {currentSitIn && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-indigo-800 uppercase tracking-wider mb-0.5">Status Sit-In Pekan Ini</p>
                      <p className="text-sm font-medium text-indigo-900">
                        Ukhti terdaftar Sit-In di <span className="font-bold">{currentSitInName || 'salah satu kelas'}</span>. Memilih kelas lain akan memindahkan pendaftaran.
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleCancelSitIn} 
                      className="text-red-600 border-red-200 hover:bg-red-50 font-semibold self-start sm:self-auto shrink-0"
                    >
                      Batalkan Sit-In
                    </Button>
                  </div>
                </div>
              )}

              {availableHalaqahs.map((halaqah) => {
                const activeCount = halaqah.activeCount || 0;
                const isFull = activeCount >= (halaqah.max_students || 999);
                const zoomInfo = registeredZoom[halaqah.id];
                const isCurrent = currentSitIn === halaqah.id;
                const validMentors = halaqah.mentors?.filter((m: any) => 
                  (m.role === 'raisah' || m.role === 'musyrifah') && 
                  m.user?.full_name !== halaqah.muallimah?.full_name
                ) || [];

                return (
                  <div 
                    key={halaqah.id} 
                    className={`border p-5 rounded-xl transition-all bg-white shadow-sm ${
                      isCurrent 
                        ? 'ring-2 ring-indigo-500 bg-indigo-50/30 border-indigo-200' 
                        : isFull 
                          ? 'border-gray-200 opacity-60' 
                          : 'border-indigo-100 hover:border-indigo-200'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                            {DAYS[halaqah.day_of_week || 1]} • {formatTimeShort(halaqah.start_time)}
                          </div>
                          {isCurrent && (
                            <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase">
                              Terdaftar
                            </span>
                          )}
                          {isFull && !isCurrent && (
                            <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase">
                              Penuh
                            </span>
                          )}
                        </div>
                        <div className="font-bold text-gray-900 text-lg">{halaqah.name}</div>
                        <div className="text-sm text-gray-500 mt-1 flex flex-wrap items-center gap-2">
                          <span className="font-medium text-gray-700">
                            Ustadzah: {halaqah.muallimah?.nama_kunyah || halaqah.muallimah?.full_name || 'Menunggu'}
                          </span>
                          <span className="text-gray-300">•</span>
                          <span>Kuota: {activeCount} / {halaqah.max_students || '-'}</span>
                        </div>
                        {validMentors.length > 0 && (
                          <div className="text-[11px] text-emerald-600 mt-1 font-medium">
                            {validMentors.map((m: any) => `${m.role === 'raisah' ? 'Raisah' : 'Musyrifah'}: ${m.user?.full_name}`).join(', ')}
                          </div>
                        )}
                      </div>
                      
                      <div className="shrink-0 w-full md:w-auto flex flex-col gap-2">
                        {isCurrent ? (
                          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm min-w-[240px]">
                            <div className="flex items-center gap-2 font-bold text-emerald-800 mb-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Terdaftar Sit-In
                            </div>
                            {zoomInfo?.url ? (
                              <div className="flex items-center gap-2 mt-2">
                                <Button 
                                  size="sm" 
                                  variant="default"
                                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
                                  onClick={() => window.open(zoomInfo.url, '_blank')}
                                >
                                  <Video className="w-4 h-4 mr-2" />
                                  Buka Zoom
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="px-3"
                                  onClick={() => handleCopyLink(zoomInfo.url!)}
                                  title="Copy Link"
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200/60">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>Link Zoom akan diberikan oleh Ustadzah/Musyrifah</span>
                              </div>
                            )}
                            {(zoomInfo?.meeting_id || zoomInfo?.passcode) && (
                              <div className="mt-2 text-xs text-emerald-700 bg-emerald-100/50 p-2 rounded">
                                {zoomInfo.meeting_id && <div>Meeting ID: <span className="font-bold">{zoomInfo.meeting_id}</span></div>}
                                {zoomInfo.passcode && <div>Passcode: <span className="font-bold">{zoomInfo.passcode}</span></div>}
                              </div>
                            )}
                          </div>
                        ) : (
                          <Button 
                            onClick={() => handleRegisterSitIn(halaqah.id)} 
                            disabled={isFull || registeringId === halaqah.id}
                            className={`w-full rounded-xl font-bold transition-all ${
                              isFull 
                                ? 'bg-gray-100 text-gray-400' 
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                            }`}
                          >
                            {registeringId === halaqah.id ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : null}
                            Daftar Sit-In
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
