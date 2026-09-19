'use client';

import { useState, useMemo } from 'react';
import { Calendar, Clock, AlertTriangle, Video, CheckCircle2, Loader2, X } from 'lucide-react';
import { formatClassType } from '@/lib/format-utils';
import { updateHalaqah } from '@/app/(protected)/admin/halaqah/actions';
import toast from 'react-hot-toast';

interface Halaqah {
  id: string;
  name: string;
  day_of_week?: number;
  start_time?: string;
  end_time?: string;
  status: string;
  muallimah?: { full_name?: string };
  program?: { class_type?: string };
  class_type?: string;
  zoom_link?: string;
  zoom_link_id?: string;
}

interface Event {
  time: number;
  type: 'start' | 'end';
  halaqah: Halaqah;
}

interface DayAnalysis {
  day: number;
  dayName: string;
  maxOverlap: number;
  peakHalaqahs: Halaqah[];
  peakTimeStart: number;
  peakTimeEnd: number;
  totalHalaqahs: number;
}

interface ScheduleOverlapAnalysisProps {
  isOpen?: boolean;
  onClose?: () => void;
  halaqahs: Halaqah[];
  zoomLinks?: { id: string; name: string; url: string }[];
  onRefresh?: () => void;
}

const DAYS = ['', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'];

function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function ScheduleOverlapAnalysis({ isOpen, onClose, halaqahs, zoomLinks = [], onRefresh }: ScheduleOverlapAnalysisProps) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleAssignZoom = async (halaqahId: string, zoomId: string) => {
    try {
      setUpdatingId(halaqahId);
      const zoom = zoomLinks.find(z => z.id === zoomId);
      await updateHalaqah({
        id: halaqahId,
        zoom_link_id: zoom ? zoom.id : null,
        zoom_link: zoom ? zoom.url : null,
      });
      toast.success('Room Zoom berhasil di-assign!');
      if (onRefresh) onRefresh();
    } catch (error: any) {
      toast.error('Gagal meng-assign room: ' + error.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const analysis = useMemo(() => {
    const activeScheduled = halaqahs.filter(
      h => h.status === 'active' && h.day_of_week && h.start_time && h.end_time
    );

    const unscheduledCount = halaqahs.filter(
      h => h.status === 'active' && (!h.day_of_week || !h.start_time || !h.end_time)
    ).length;

    const byDay: Record<number, Halaqah[]> = {};
    activeScheduled.forEach(h => {
      const d = h.day_of_week!;
      if (!byDay[d]) byDay[d] = [];
      byDay[d].push(h);
    });

    const results: DayAnalysis[] = [];
    let maxOverall = 0;

    for (let d = 1; d <= 7; d++) {
      const dayHalaqahs = byDay[d] || [];
      if (dayHalaqahs.length === 0) {
        results.push({
          day: d,
          dayName: DAYS[d],
          maxOverlap: 0,
          peakHalaqahs: [],
          peakTimeStart: 0,
          peakTimeEnd: 0,
          totalHalaqahs: 0
        });
        continue;
      }

      const events: Event[] = [];
      dayHalaqahs.forEach(h => {
        events.push({ time: timeToMinutes(h.start_time!), type: 'start', halaqah: h });
        events.push({ time: timeToMinutes(h.end_time!), type: 'end', halaqah: h });
      });

      events.sort((a, b) => {
        if (a.time !== b.time) return a.time - b.time;
        if (a.type === 'end' && b.type === 'start') return -1;
        if (a.type === 'start' && b.type === 'end') return 1;
        return 0;
      });

      let currentActive: Halaqah[] = [];
      let maxOverlap = 0;
      let peakHalaqahs: Halaqah[] = [];
      let peakTimeStart = 0;

      for (const ev of events) {
        if (ev.type === 'start') {
          currentActive.push(ev.halaqah);
          if (currentActive.length > maxOverlap) {
            maxOverlap = currentActive.length;
            peakHalaqahs = [...currentActive];
            peakTimeStart = ev.time;
          }
        } else {
          currentActive = currentActive.filter(h => h.id !== ev.halaqah.id);
        }
      }

      let peakTimeEnd = peakTimeStart;
      if (peakHalaqahs.length > 0) {
        peakTimeEnd = Math.min(...peakHalaqahs.map(h => timeToMinutes(h.end_time!)));
      }

      if (maxOverlap > maxOverall) {
        maxOverall = maxOverlap;
      }

      results.push({
        day: d,
        dayName: DAYS[d],
        maxOverlap,
        peakHalaqahs,
        peakTimeStart,
        peakTimeEnd,
        totalHalaqahs: dayHalaqahs.length
      });
    }

    return {
      results,
      maxOverall,
      unscheduledCount
    };
  }, [halaqahs]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-gray-900/50 backdrop-blur-sm transition-opacity">
      <div className="bg-white w-full max-w-[80vw] lg:max-w-4xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Video className="w-5 h-5 text-indigo-600" />
              Analisis Kebutuhan & Penugasan Room Zoom
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Summary Banner */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 mb-6 flex items-start gap-4">
            <div className="p-3 bg-white rounded-full shadow-sm text-indigo-600">
              <Video className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-indigo-900 font-bold text-lg mb-1">
                Total Link Zoom Dibutuhkan: {analysis.maxOverall} Link
              </h3>
              <p className="text-indigo-700 text-sm leading-relaxed">
                Ini adalah jumlah kelas terbanyak yang berjalan secara bersamaan dalam pekan ini.
                Menyediakan <strong>{analysis.maxOverall}</strong> link Zoom akan memastikan tidak ada bentrok ruangan.
              </p>
            </div>
          </div>

          {analysis.unscheduledCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <strong>Perhatian:</strong> Terdapat <strong>{analysis.unscheduledCount}</strong> halaqah aktif yang belum memiliki jadwal (Hari/Jam) spesifik sehingga tidak ikut dihitung dalam analisis ini.
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mb-6">
            {analysis.results.map((day) => (
              <button
                key={day.day}
                onClick={() => setSelectedDay(day.day === selectedDay ? null : day.day)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  selectedDay === day.day
                    ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500 ring-offset-2'
                    : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                }`}
              >
                <div className="font-bold text-gray-900 mb-1">{day.dayName}</div>
                <div className="text-sm text-gray-500 flex items-center justify-between">
                  <span>{day.totalHalaqahs} Kelas</span>
                  <span className={`font-semibold ${day.maxOverlap > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                    {day.maxOverlap} Max
                  </span>
                </div>
              </button>
            ))}
          </div>

          {selectedDay && (
            <div className="mt-8 border-t border-gray-100 pt-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Video className="w-5 h-5 text-indigo-500" />
                  Status Room Zoom MTI & Daftar Kelas (Hari {DAYS[selectedDay]})
                </h3>
              </div>

              {analysis.results[selectedDay - 1].totalHalaqahs > 0 ? (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {zoomLinks.map(room => {
                      const roomHalaqahs = halaqahs.filter(h => 
                        h.status === 'active' && 
                        h.day_of_week === selectedDay &&
                        (h.zoom_link_id === room.id || h.zoom_link === room.url)
                      ).sort((a, b) => timeToMinutes(a.start_time!) - timeToMinutes(b.start_time!));

                      const isIdle = roomHalaqahs.length === 0;

                      return (
                        <div key={room.id} className="border border-gray-200 rounded-2xl bg-white shadow-sm overflow-hidden flex flex-col">
                          <div className="bg-gray-50/80 p-4 border-b border-gray-100 flex items-center justify-between">
                            <h4 className="font-bold text-gray-900 text-base">{room.name}</h4>
                            {isIdle ? (
                              <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-700 font-bold tracking-wider text-[10px] uppercase">
                                Nganggur Seharian
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-md bg-blue-100 text-blue-700 font-bold tracking-wider text-[10px] uppercase">
                                {roomHalaqahs.length} Jadwal
                              </span>
                            )}
                          </div>
                          
                          <div className="p-4 flex-1">
                            {isIdle ? (
                              <div className="h-full flex flex-col items-center justify-center text-center py-6">
                                <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center mb-3">
                                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                </div>
                                <p className="text-sm text-gray-500 mb-4">Room ini kosong dan<br/>siap dipakai hari ini!</p>
                                
                                {/* Quick Assign Dropdown */}
                                {(() => {
                                  const unassignedHalaqahs = halaqahs.filter(h => 
                                    h.status === 'active' && 
                                    h.day_of_week === selectedDay &&
                                    !zoomLinks.some(r => h.zoom_link_id === r.id || h.zoom_link === r.url)
                                  ).sort((a, b) => timeToMinutes(a.start_time!) - timeToMinutes(b.start_time!));

                                  if (unassignedHalaqahs.length === 0) return null;

                                  return (
                                    <div className="w-full max-w-[200px] relative">
                                      <select
                                        disabled={updatingId !== null}
                                        value=""
                                        onChange={(e) => {
                                          if (e.target.value) handleAssignZoom(e.target.value, room.id);
                                        }}
                                        className="w-full text-xs border border-emerald-200 rounded-md py-2 pl-2 pr-6 bg-emerald-50 text-emerald-700 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none disabled:opacity-50 cursor-pointer"
                                      >
                                        <option value="">+ Isi dengan Halaqah...</option>
                                        {unassignedHalaqahs.map(h => (
                                          <option key={h.id} value={h.id}>
                                            {h.start_time} - {h.name}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  );
                                })()}
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {roomHalaqahs.map(h => {
                                  const isPeak = analysis.results[selectedDay - 1].peakHalaqahs.some(ph => ph.id === h.id);
                                  return (
                                    <div key={h.id} className={`flex flex-col gap-0.5 p-2 rounded-lg border ${isPeak ? 'border-orange-200 bg-orange-50/50' : 'border-transparent'}`}>
                                      <div className="font-semibold text-gray-700 flex items-center justify-between text-xs w-full">
                                        <div className="flex items-center gap-1.5">
                                          <div className={`w-1.5 h-1.5 rounded-full ${isPeak ? 'bg-orange-500' : 'bg-indigo-400'}`} />
                                          {h.start_time} - {h.end_time}
                                        </div>
                                        {isPeak && <span className="text-[9px] uppercase tracking-wider text-orange-600 font-bold">Waktu Puncak</span>}
                                      </div>
                                      <div className="text-gray-600 pl-3 text-xs leading-snug flex-1">
                                        <span className="font-medium text-gray-900">{h.name}</span>
                                        <br />
                                        {h.muallimah?.full_name || 'Tanpa Muallimah'} • {formatClassType(h.class_type || h.program?.class_type)}
                                      </div>
                                      <div className="mt-2 pl-3">
                                        <div className="relative">
                                          <select
                                            disabled={updatingId === h.id}
                                            value={(h as any).zoom_link_id || ''}
                                            onChange={(e) => handleAssignZoom(h.id, e.target.value)}
                                            className="w-full text-xs border border-gray-200 rounded-md py-1.5 pl-2 pr-6 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none disabled:opacity-50"
                                          >
                                            <option value="">-- Pindah / Set Room --</option>
                                            {zoomLinks.map(z => {
                                              return <option key={z.id} value={z.id}>{z.name}</option>
                                            })}
                                          </select>
                                          {updatingId === h.id && (
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                              <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
                                            </div>
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
                      );
                    })}

                    {/* Unassigned Halaqahs */}
                    {(() => {
                      const unassignedHalaqahs = halaqahs.filter(h => 
                        h.status === 'active' && 
                        h.day_of_week === selectedDay &&
                        !zoomLinks.some(room => h.zoom_link_id === room.id || h.zoom_link === room.url)
                      ).sort((a, b) => timeToMinutes(a.start_time!) - timeToMinutes(b.start_time!));

                      if (unassignedHalaqahs.length === 0) return null;

                      return (
                        <div className="border border-red-200 rounded-2xl bg-red-50/30 shadow-sm overflow-hidden flex flex-col col-span-1 md:col-span-2 mt-4">
                          <div className="bg-red-50 p-4 border-b border-red-100 flex items-center justify-between">
                            <h4 className="font-bold text-red-900 text-base flex items-center gap-2">
                              <AlertTriangle className="w-5 h-5 text-red-600" />
                              Belum Di-assign Room
                            </h4>
                            <span className="px-2.5 py-1 rounded-md bg-red-100 text-red-700 font-bold tracking-wider text-[10px] uppercase">
                              {unassignedHalaqahs.length} Jadwal
                            </span>
                          </div>
                          
                          <div className="p-4 flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {unassignedHalaqahs.map(h => {
                                const isPeak = analysis.results[selectedDay - 1].peakHalaqahs.some(ph => ph.id === h.id);
                                return (
                                  <div key={h.id} className={`flex flex-col gap-0.5 p-2 rounded-lg border ${isPeak ? 'border-orange-200 bg-orange-50' : 'border-red-100 bg-white'}`}>
                                    <div className="font-semibold text-gray-700 flex items-center justify-between text-xs w-full">
                                      <div className="flex items-center gap-1.5">
                                        <div className={`w-1.5 h-1.5 rounded-full ${isPeak ? 'bg-orange-500' : 'bg-red-400'}`} />
                                        {h.start_time} - {h.end_time}
                                      </div>
                                      {isPeak && <span className="text-[9px] uppercase tracking-wider text-orange-600 font-bold">Waktu Puncak</span>}
                                    </div>
                                    <div className="text-gray-600 pl-3 text-xs leading-snug flex-1">
                                      <span className="font-medium text-gray-900">{h.name}</span>
                                      <br />
                                      {h.muallimah?.full_name || 'Tanpa Muallimah'} • {formatClassType(h.class_type || h.program?.class_type)}
                                    </div>
                                    <div className="mt-2 pl-3">
                                      <div className="relative">
                                        <select
                                          disabled={updatingId === h.id}
                                          value={(h as any).zoom_link_id || ''}
                                          onChange={(e) => handleAssignZoom(h.id, e.target.value)}
                                          className="w-full text-xs border border-gray-200 rounded-md py-1.5 pl-2 pr-6 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none disabled:opacity-50"
                                        >
                                          <option value="">-- Pindah / Set Room --</option>
                                          {zoomLinks.map(z => {
                                            return <option key={z.id} value={z.id}>{z.name}</option>
                                          })}
                                        </select>
                                        {updatingId === h.id && (
                                          <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                            <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm">Tidak ada jadwal kelas aktif di hari ini.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
