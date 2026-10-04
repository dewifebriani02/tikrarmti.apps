'use client';

import { useState, useMemo } from 'react';
import { Calendar, Clock, AlertTriangle, Video, CheckCircle2, Loader2, X, ChevronDown } from 'lucide-react';
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
  isPage?: boolean;
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

export function ScheduleOverlapAnalysis({ 
  isOpen = true, 
  onClose, 
  isPage = false,
  halaqahs, 
  zoomLinks = [], 
  onRefresh 
}: ScheduleOverlapAnalysisProps) {
  const todayDay = new Date().getDay() === 0 ? 7 : new Date().getDay();
  const [selectedDay, setSelectedDay] = useState<number | null>(todayDay);
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

  if (!isPage && !isOpen) return null;

  const content = (
    <div className="space-y-4 sm:space-y-6">
      {/* Summary Banner */}
      <div className="bg-indigo-50/90 border border-indigo-100 rounded-2xl p-4 sm:p-5 flex items-start gap-3 sm:gap-4 shadow-sm">
        <div className="p-2.5 sm:p-3 bg-white rounded-xl shadow-sm text-indigo-600 shrink-0">
          <Video className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <div className="min-w-0">
          <h3 className="text-indigo-950 font-bold text-base sm:text-lg mb-1 leading-snug">
            Total Link Zoom Dibutuhkan: {analysis.maxOverall} Link
          </h3>
          <p className="text-indigo-800 text-xs sm:text-sm leading-relaxed">
            Ini adalah perkiraan jumlah kelas terbanyak yang berjalan secara bersamaan dalam pekan ini.
            Menyediakan minimal <strong>{analysis.maxOverall} link Zoom</strong> akan memastikan seluruh halaqah berjalan lancar tanpa bentrok ruangan.
          </p>
        </div>
      </div>

      {analysis.unscheduledCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 sm:p-4 flex items-start gap-2.5 sm:gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-amber-900 leading-relaxed">
            <strong>Perhatian:</strong> Terdapat <strong>{analysis.unscheduledCount}</strong> halaqah aktif yang belum memiliki jadwal (Hari/Jam) spesifik sehingga tidak ikut dihitung dalam analisis ini.
          </div>
        </div>
      )}

      {/* Accordion List per Day */}
      <div className="space-y-3 sm:space-y-4">
        {analysis.results.map((day) => {
          const isExpanded = selectedDay === day.day;

          return (
            <div 
              key={day.day} 
              className={`rounded-2xl border transition-all overflow-hidden ${
                isExpanded 
                  ? 'border-indigo-300 bg-white shadow-md ring-1 ring-indigo-200' 
                  : 'border-gray-200 bg-white shadow-sm hover:border-gray-300'
              }`}
            >
              {/* Accordion Header */}
              <button
                type="button"
                onClick={() => setSelectedDay(isExpanded ? null : day.day)}
                className={`w-full p-3.5 sm:p-4.5 flex items-center justify-between gap-3 text-left transition-colors ${
                  isExpanded ? 'bg-indigo-50/60 border-b border-indigo-100' : 'hover:bg-gray-50/60'
                }`}
              >
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                    isExpanded 
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-sm sm:text-base text-gray-900">{day.dayName}</span>
                      <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                        {day.totalHalaqahs} Kelas
                      </span>
                    </div>
                    <div className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
                      {day.totalHalaqahs === 0 ? (
                        <span className="text-gray-400">Tidak ada jadwal kelas</span>
                      ) : day.maxOverlap > 0 ? (
                        <span>
                          Puncak bersamaan:{' '}
                          <strong className="text-orange-600 font-semibold">
                            {day.maxOverlap} kelas ({minutesToTime(day.peakTimeStart)} - {minutesToTime(day.peakTimeEnd)})
                          </strong>
                        </span>
                      ) : (
                        <span>Semua kelas tersebar aman</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                  <div className={`px-2 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-bold ${
                    day.maxOverlap > 0 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {day.maxOverlap} Max
                  </div>
                  <div className={`p-1 rounded-lg transition-transform duration-200 ${
                    isExpanded ? 'rotate-180 text-indigo-700' : 'text-gray-400'
                  }`}>
                    <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                </div>
              </button>

              {/* Accordion Body: EXPANDED DIRECTLY UNDERNEATH THIS DAY */}
              {isExpanded && (
                <div className="p-3.5 sm:p-6 bg-white space-y-4 sm:space-y-6 animate-in fade-in duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 pb-3 border-b border-gray-100">
                    <h4 className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-2">
                      <Video className="w-4 h-4 text-indigo-600" />
                      Status Room Zoom MTI & Daftar Kelas (Hari {day.dayName})
                    </h4>
                    <span className="text-[11px] sm:text-xs text-gray-500">
                      Total {day.totalHalaqahs} halaqah aktif di hari {day.dayName}
                    </span>
                  </div>

                  {day.totalHalaqahs > 0 ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        {zoomLinks.map(room => {
                          const roomHalaqahs = halaqahs.filter(h => 
                            h.status === 'active' && 
                            h.day_of_week === day.day &&
                            (h.zoom_link_id === room.id || h.zoom_link === room.url)
                          ).sort((a, b) => timeToMinutes(a.start_time!) - timeToMinutes(b.start_time!));

                          const isIdle = roomHalaqahs.length === 0;

                          return (
                            <div key={room.id} className="border border-gray-200 rounded-xl sm:rounded-2xl bg-white shadow-sm overflow-hidden flex flex-col">
                              <div className="bg-gray-50/80 p-3 sm:p-4 border-b border-gray-100 flex items-center justify-between">
                                <h5 className="font-bold text-gray-900 text-sm sm:text-base">{room.name}</h5>
                                {isIdle ? (
                                  <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md bg-emerald-100 text-emerald-700 font-bold tracking-wider text-[9px] sm:text-[10px] uppercase">
                                    Nganggur Seharian
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md bg-blue-100 text-blue-700 font-bold tracking-wider text-[9px] sm:text-[10px] uppercase">
                                    {roomHalaqahs.length} Jadwal
                                  </span>
                                )}
                              </div>
                              
                              <div className="p-3 sm:p-4 flex-1">
                                {isIdle ? (
                                  <div className="h-full flex flex-col items-center justify-center text-center py-4 sm:py-6">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-50 rounded-full flex items-center justify-center mb-2 sm:mb-3">
                                      <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                                    </div>
                                    <p className="text-xs sm:text-sm text-gray-500 mb-3">Room ini kosong dan siap dipakai hari ini!</p>
                                    
                                    {/* Quick Assign Dropdown */}
                                    {(() => {
                                      const unassignedHalaqahs = halaqahs.filter(h => 
                                        h.status === 'active' && 
                                        h.day_of_week === day.day &&
                                        !zoomLinks.some(r => h.zoom_link_id === r.id || h.zoom_link === r.url)
                                      ).sort((a, b) => timeToMinutes(a.start_time!) - timeToMinutes(b.start_time!));

                                      if (unassignedHalaqahs.length === 0) return null;

                                      return (
                                        <div className="w-full max-w-[220px] relative">
                                          <select
                                            disabled={updatingId !== null}
                                            value=""
                                            onChange={(e) => {
                                              if (e.target.value) handleAssignZoom(e.target.value, room.id);
                                            }}
                                            className="w-full text-xs border border-emerald-200 rounded-lg py-1.5 pl-2 pr-6 bg-emerald-50 text-emerald-700 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none disabled:opacity-50 cursor-pointer"
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
                                  <div className="space-y-2 sm:space-y-3">
                                    {roomHalaqahs.map(h => {
                                      const isPeak = day.peakHalaqahs.some(ph => ph.id === h.id);
                                      return (
                                        <div key={h.id} className={`flex flex-col gap-1 p-2 sm:p-2.5 rounded-lg border ${isPeak ? 'border-orange-200 bg-orange-50/50' : 'border-gray-100 bg-gray-50/30'}`}>
                                          <div className="font-semibold text-gray-700 flex items-center justify-between text-xs w-full">
                                            <div className="flex items-center gap-1.5">
                                              <div className={`w-1.5 h-1.5 rounded-full ${isPeak ? 'bg-orange-500' : 'bg-indigo-400'}`} />
                                              <span className="font-bold text-gray-900">{h.start_time} - {h.end_time}</span>
                                            </div>
                                            {isPeak && <span className="text-[9px] uppercase tracking-wider text-orange-600 font-bold bg-orange-100 px-1.5 py-0.5 rounded">Puncak</span>}
                                          </div>
                                          <div className="text-gray-600 text-xs leading-snug">
                                            <span className="font-semibold text-gray-900">{h.name}</span>
                                            <div className="text-[11px] text-gray-500 mt-0.5">
                                              {h.muallimah?.full_name || 'Tanpa Muallimah'} • {formatClassType(h.class_type || h.program?.class_type)}
                                            </div>
                                          </div>
                                          <div className="mt-1">
                                            <div className="relative">
                                              <select
                                                disabled={updatingId === h.id}
                                                value={(h as any).zoom_link_id || ''}
                                                onChange={(e) => handleAssignZoom(h.id, e.target.value)}
                                                className="w-full text-xs border border-gray-200 rounded-lg py-1.5 pl-2 pr-6 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none disabled:opacity-50"
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
                            h.day_of_week === day.day &&
                            !zoomLinks.some(room => h.zoom_link_id === room.id || h.zoom_link === room.url)
                          ).sort((a, b) => timeToMinutes(a.start_time!) - timeToMinutes(b.start_time!));

                          if (unassignedHalaqahs.length === 0) return null;

                          return (
                            <div className="border border-red-200 rounded-xl sm:rounded-2xl bg-red-50/30 shadow-sm overflow-hidden flex flex-col col-span-1 md:col-span-2">
                              <div className="bg-red-50 p-3 sm:p-4 border-b border-red-100 flex items-center justify-between">
                                <h5 className="font-bold text-red-900 text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2">
                                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                                  Belum Di-assign Room Zoom
                                </h5>
                                <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-700 font-bold tracking-wider text-[9px] sm:text-[10px] uppercase">
                                  {unassignedHalaqahs.length} Jadwal
                                </span>
                              </div>
                              
                              <div className="p-3 sm:p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {unassignedHalaqahs.map(h => {
                                    const isPeak = day.peakHalaqahs.some(ph => ph.id === h.id);
                                    return (
                                      <div key={h.id} className={`flex flex-col gap-1 p-2.5 rounded-lg border ${isPeak ? 'border-orange-200 bg-orange-50' : 'border-red-100 bg-white'}`}>
                                        <div className="font-semibold text-gray-700 flex items-center justify-between text-xs w-full">
                                          <div className="flex items-center gap-1.5">
                                            <div className={`w-1.5 h-1.5 rounded-full ${isPeak ? 'bg-orange-500' : 'bg-red-400'}`} />
                                            <span className="font-bold text-gray-900">{h.start_time} - {h.end_time}</span>
                                          </div>
                                          {isPeak && <span className="text-[9px] uppercase tracking-wider text-orange-600 font-bold bg-orange-100 px-1.5 py-0.5 rounded">Puncak</span>}
                                        </div>
                                        <div className="text-gray-600 text-xs leading-snug">
                                          <span className="font-semibold text-gray-900">{h.name}</span>
                                          <div className="text-[11px] text-gray-500 mt-0.5">
                                            {h.muallimah?.full_name || 'Tanpa Muallimah'} • {formatClassType(h.class_type || h.program?.class_type)}
                                          </div>
                                        </div>
                                        <div className="mt-1">
                                          <div className="relative">
                                            <select
                                              disabled={updatingId === h.id}
                                              value={(h as any).zoom_link_id || ''}
                                              onChange={(e) => handleAssignZoom(h.id, e.target.value)}
                                              className="w-full text-xs border border-gray-200 rounded-lg py-1.5 pl-2 pr-6 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none disabled:opacity-50"
                                            >
                                              <option value="">-- Pilih Room Zoom --</option>
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
                    <div className="text-center py-6">
                      <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-2">
                        <CheckCircle2 className="w-5 h-5 text-gray-400" />
                      </div>
                      <p className="text-gray-500 text-xs sm:text-sm">Tidak ada jadwal kelas aktif di hari {day.dayName}.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  if (isPage) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col my-auto max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base sm:text-xl font-bold text-gray-900 flex items-center gap-2">
              <Video className="w-5 h-5 text-indigo-600" />
              Analisis Kebutuhan & Penugasan Room Zoom
            </h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {content}
        </div>
      </div>
    </div>
  );
}
