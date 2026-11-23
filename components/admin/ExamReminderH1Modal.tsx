'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Calendar, Clock, Send, CheckCircle2, AlertCircle, RefreshCw, Eye, Sparkles, UserCheck, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { formatMuallimahName } from '@/lib/roles';

export function ExamReminderH1Modal() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'thalibah' | 'examiner'>('examiner');
  const [sendTarget, setSendTarget] = useState<'all' | 'thalibah' | 'examiner'>('all');
  const [expandedExaminers, setExpandedExaminers] = useState<Record<string, boolean>>({});

  const [targetDate, setTargetDate] = useState<string>(() => {
    // Tomorrow's date in local browser
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });

  const [candidatesData, setCandidatesData] = useState<{
    target_date: string;
    thalibah: {
      total: number;
      already_sent_count: number;
      pending_count: number;
      candidates: any[];
    };
    examiners: {
      total: number;
      already_sent_count: number;
      pending_count: number;
      candidates: any[];
    };
    total_candidates: number;
    already_sent_count: number;
    pending_count: number;
    candidates: any[];
  } | null>(null);

  const [executionResult, setExecutionResult] = useState<any>(null);

  const fetchCandidates = async (dateStr = targetDate) => {
    try {
      setLoading(true);
      setExecutionResult(null);
      const res = await fetch(`/api/cron/reminder-ujian-lisan?view=candidates&target_date=${dateStr}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setCandidatesData(json);
      } else {
        toast.error(json.error || 'Gagal mengambil data jadwal ujian');
      }
    } catch (err: any) {
      toast.error('Terjadi kesalahan jaringan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCandidates(targetDate);
    }
  }, [isOpen]);

  const toggleExpandExaminer = (id: string) => {
    setExpandedExaminers(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleExecute = async (isDryRun: boolean) => {
    const thalibahPending = candidatesData?.thalibah?.pending_count || 0;
    const examinerPending = candidatesData?.examiners?.pending_count || 0;

    let targetDesc = '';
    if (sendTarget === 'all') {
      targetDesc = `${thalibahPending} thalibah & ${examinerPending} ustadzah`;
    } else if (sendTarget === 'examiner') {
      targetDesc = `${examinerPending} ustadzah penguji`;
    } else {
      targetDesc = `${thalibahPending} thalibah`;
    }

    if (!isDryRun && !confirm(`Kirim pengingat resmi WhatsApp ke ${targetDesc} sekarang?`)) {
      return;
    }

    try {
      setProcessing(true);
      setExecutionResult(null);
      const res = await fetch(`/api/cron/reminder-ujian-lisan?target_date=${targetDate}&dry_run=${isDryRun}&type=${sendTarget}`, {
        method: 'POST',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setExecutionResult(json);
        if (isDryRun) {
          toast.info(`Simulasi selesai: ${json.summary.total_sent} pesan siap dikirim.`);
        } else {
          toast.success(`Alhamdulillah! ${json.summary.total_sent} pesan berhasil dikirim via WhatsApp.`);
          fetchCandidates(targetDate);
        }
      } else {
        toast.error(json.error || 'Gagal memproses pengingat');
      }
    } catch (err: any) {
      toast.error('Terjadi kesalahan pengiriman');
    } finally {
      setProcessing(false);
    }
  };

  const thalibahList = candidatesData?.thalibah?.candidates || candidatesData?.candidates || [];
  const examinersList = candidatesData?.examiners?.candidates || [];

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold px-3.5 py-2 shadow-sm gap-2"
      >
        <Bell className="w-3.5 h-3.5 text-amber-300" />
        <span>Reminder H-1 Ujian</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl rounded-2xl p-6 max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2">
              <Bell className="w-5 h-5 text-emerald-700" />
              Sistem Reminder Otomatis H-1 Ujian Lisan
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Notifikasi resmi via WhatsApp ke Ustadzah Penguji &amp; Thalibah peserta ujian lisan besok.
            </DialogDescription>
          </DialogHeader>

          {/* Controls Bar */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-bold text-gray-700">Tanggal Ujian (H-1):</span>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => {
                    setTargetDate(e.target.value);
                    fetchCandidates(e.target.value);
                  }}
                  className="text-xs font-bold border border-gray-300 rounded-lg px-2.5 py-1 bg-white text-gray-800"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchCandidates(targetDate)}
                  disabled={loading}
                  className="text-xs rounded-lg gap-1.5 h-8"
                >
                  <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                  <span>Segarkan</span>
                </Button>
              </div>
            </div>

            {/* Summary counters for both Ustadzah and Thalibah */}
            {candidatesData && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200/60">
                {/* Ustadzah Penguji Card */}
                <div className="bg-white p-3 rounded-xl border border-purple-100 shadow-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-extrabold text-purple-900 flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-purple-600" /> Ustadzah Penguji
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">
                      {candidatesData.examiners?.total || 0} Ustadzah
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-50">
                    <span className="text-gray-500">Terkirim: <strong className="text-emerald-700">{candidatesData.examiners?.already_sent_count || 0}</strong></span>
                    <span className="text-gray-500">Menunggu: <strong className="text-purple-700">{candidatesData.examiners?.pending_count || 0}</strong></span>
                  </div>
                </div>

                {/* Thalibah Card */}
                <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-extrabold text-emerald-900 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-emerald-600" /> Thalibah Peserta
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                      {candidatesData.thalibah?.total || candidatesData.total_candidates || 0} Thalibah
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-50">
                    <span className="text-gray-500">Terkirim: <strong className="text-emerald-700">{candidatesData.thalibah?.already_sent_count || candidatesData.already_sent_count || 0}</strong></span>
                    <span className="text-gray-500">Menunggu: <strong className="text-amber-700">{candidatesData.thalibah?.pending_count || candidatesData.pending_count || 0}</strong></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tab Selector: Ustadzah vs Thalibah */}
          <div className="flex border-b border-gray-200">
            <button
              type="button"
              onClick={() => setActiveTab('examiner')}
              className={`flex-1 py-2.5 text-xs font-bold text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'examiner'
                  ? 'border-purple-600 text-purple-700 bg-purple-50/40'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Jadwal Ustadzah Penguji ({examinersList.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('thalibah')}
              className={`flex-1 py-2.5 text-xs font-bold text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'thalibah'
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Daftar Thalibah Peserta ({thalibahList.length})</span>
            </button>
          </div>

          {/* Candidate List Content */}
          <div className="space-y-2">
            {loading ? (
              <div className="py-8 text-center text-xs text-gray-400">Memuat data jadwal ujian...</div>
            ) : activeTab === 'examiner' ? (
              /* USTADZAH TAB */
              examinersList.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400 bg-gray-50 rounded-xl border border-dashed">
                  Tidak ada ustadzah yang dijadwalkan menguji ujian lisan pada tanggal {targetDate}.
                </div>
              ) : (
                <div className="border border-purple-100 rounded-xl overflow-hidden divide-y divide-purple-100 max-h-64 overflow-y-auto">
                  {examinersList.map((ex: any) => {
                    const isExpanded = !!expandedExaminers[ex.examinerId];
                    return (
                      <div key={ex.examinerId} className="p-3 text-xs space-y-2 hover:bg-purple-50/20">
                        <div className="flex items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <div className="font-bold text-purple-950 flex items-center gap-2">
                              <span>{formatMuallimahName(ex.examinerName)}</span>
                              <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">
                                {ex.sessions.length} Sesi ({ex.totalStudents} Thalibah)
                              </Badge>
                            </div>
                            <div className="text-[11px] text-gray-500">
                              <span>WA: <strong>{ex.whatsapp || '(Belum ada nomor WA)'}</strong></span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {ex.alreadySent ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Terkirim
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                                Menunggu Kirim
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => toggleExpandExaminer(ex.examinerId)}
                              className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Expanded details: sessions and thalibah list */}
                        {isExpanded && (
                          <div className="mt-2 pt-2 border-t border-purple-100/70 space-y-2 pl-2 bg-purple-50/40 p-2.5 rounded-lg">
                            {ex.sessions.map((s: any, idx: number) => (
                              <div key={s.scheduleId} className="text-[11px] space-y-1">
                                <div className="font-bold text-purple-900">
                                  Sesi {idx + 1}: {s.timeRangeFormatted} ({s.students.length} thalibah)
                                </div>
                                <div className="text-gray-600 pl-2">
                                  {s.students.map((st: any, i: number) => (
                                    <div key={st.registrationId}>
                                      {i + 1}. {st.fullName} — <span className="font-semibold">{st.targetJuz?.toLowerCase().startsWith('juz') ? st.targetJuz : `Juz ${st.targetJuz}`}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              /* THALIBAH TAB */
              thalibahList.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400 bg-gray-50 rounded-xl border border-dashed">
                  Tidak ada peserta terdaftar ujian lisan pada tanggal {targetDate}.
                </div>
              ) : (
                <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-100 max-h-64 overflow-y-auto">
                  {thalibahList.map((c: any) => (
                    <div key={c.registrationId} className="p-3 text-xs flex items-center justify-between gap-3 hover:bg-gray-50/80">
                      <div className="space-y-0.5">
                        <div className="font-bold text-gray-900 flex items-center gap-2">
                          <span>{c.fullName}</span>
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded font-semibold">
                            {c.targetJuz?.toLowerCase().startsWith('juz') ? c.targetJuz : 'Juz ' + c.targetJuz}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-500 flex items-center gap-2">
                          <span>⏰ {c.startTime?.slice(0, 5)} - {c.endTime?.slice(0, 5)} WIB</span>
                          <span>•</span>
                          <span>WA: {c.whatsapp || '-'}</span>
                          <span>•</span>
                          <span>Penguji: {formatMuallimahName(c.examinerName)}</span>
                        </div>
                      </div>

                      <div>
                        {c.alreadySent ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Terkirim
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            Menunggu
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>

          {/* Execution Result Log */}
          {executionResult && (
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3 text-xs space-y-1.5">
              <div className="font-extrabold text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Laporan Hasil {executionResult.summary.dry_run ? 'Simulasi' : 'Pengiriman'}:
              </div>
              <p className="text-[11px] text-emerald-800">
                Total Pesan Dikirim: <strong>{executionResult.summary.total_sent}</strong> | Gagal: <strong>{executionResult.summary.total_failed}</strong> | Dilewati: <strong>{executionResult.summary.total_skipped}</strong>
              </p>
              {executionResult.summary.examiners && (
                <p className="text-[10px] text-purple-900">
                  Ustadzah Penguji: {executionResult.summary.examiners.sent} terkirim / {executionResult.summary.examiners.total} total
                </p>
              )}
              {executionResult.summary.thalibah && (
                <p className="text-[10px] text-emerald-900">
                  Thalibah Peserta: {executionResult.summary.thalibah.sent} terkirim / {executionResult.summary.thalibah.total} total
                </p>
              )}
            </div>
          )}

          {/* Send Target Selection */}
          <div className="flex items-center justify-between bg-gray-50/80 p-2.5 rounded-xl border border-gray-200 text-xs">
            <span className="font-bold text-gray-700">Target Pengiriman:</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSendTarget('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  sendTarget === 'all'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                Semua (Ustadzah &amp; Thalibah)
              </button>
              <button
                type="button"
                onClick={() => setSendTarget('examiner')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  sendTarget === 'examiner'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                Ustadzah Saja
              </button>
              <button
                type="button"
                onClick={() => setSendTarget('thalibah')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  sendTarget === 'thalibah'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                Thalibah Saja
              </button>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={processing || loading}
              onClick={() => handleExecute(true)}
              className="text-xs rounded-xl gap-1.5"
            >
              <Eye className="w-3.5 h-3.5 text-gray-500" />
              <span>Simulasi (Dry Run)</span>
            </Button>

            <Button
              type="button"
              disabled={
                processing ||
                loading ||
                (sendTarget === 'all' && !(candidatesData?.thalibah?.pending_count || candidatesData?.examiners?.pending_count)) ||
                (sendTarget === 'examiner' && !candidatesData?.examiners?.pending_count) ||
                (sendTarget === 'thalibah' && !candidatesData?.thalibah?.pending_count)
              }
              onClick={() => handleExecute(false)}
              className="bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{processing ? 'Mengirim...' : 'Kirim WhatsApp Sekarang'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
