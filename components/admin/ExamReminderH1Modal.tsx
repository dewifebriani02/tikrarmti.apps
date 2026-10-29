'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Calendar, Clock, Send, CheckCircle2, AlertCircle, RefreshCw, Eye, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export function ExamReminderH1Modal() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [targetDate, setTargetDate] = useState<string>(() => {
    // Tomorrow's date in local browser
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });

  const [candidatesData, setCandidatesData] = useState<{
    target_date: string;
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
        toast.error(json.error || 'Gagal mengambil data peserta ujian');
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

  const handleExecute = async (isDryRun: boolean) => {
    if (!isDryRun && !confirm(`Kirim pengingat WhatsApp ke ${candidatesData?.pending_count || 0} thalibah sekarang?`)) {
      return;
    }

    try {
      setProcessing(true);
      setExecutionResult(null);
      const res = await fetch(`/api/cron/reminder-ujian-lisan?target_date=${targetDate}&dry_run=${isDryRun}`, {
        method: 'POST',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setExecutionResult(json);
        if (isDryRun) {
          toast.info(`Simulasi selesai: ${json.summary.sent_count} pesan siap dikirim.`);
        } else {
          toast.success(`Alhamdulillah! ${json.summary.sent_count} pesan berhasil dikirim via WhatsApp.`);
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
        <DialogContent className="max-w-2xl rounded-2xl p-6 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2">
              <Bell className="w-5 h-5 text-emerald-700" />
              Sistem Reminder Otomatis H-1 Ujian Lisan
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Notifikasi resmi via WhatsApp ke thalibah yang memiliki jadwal Ujian Akhir Lisan (Tasmi') besok.
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

            {/* Summary counters */}
            {candidatesData && (
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-200/60 text-center">
                <div className="bg-white p-2 rounded-lg border border-gray-100">
                  <div className="text-[10px] text-gray-400 font-bold uppercase">Total Peserta</div>
                  <div className="text-sm font-black text-gray-800">{candidatesData.total_candidates}</div>
                </div>
                <div className="bg-white p-2 rounded-lg border border-gray-100">
                  <div className="text-[10px] text-emerald-600 font-bold uppercase">Sudah Dikirim</div>
                  <div className="text-sm font-black text-emerald-700">{candidatesData.already_sent_count}</div>
                </div>
                <div className="bg-white p-2 rounded-lg border border-gray-100">
                  <div className="text-[10px] text-amber-600 font-bold uppercase">Menunggu Kirim</div>
                  <div className="text-sm font-black text-amber-800">{candidatesData.pending_count}</div>
                </div>
              </div>
            )}
          </div>

          {/* Candidate List */}
          <div className="space-y-2">
            <h4 className="text-xs font-extrabold text-gray-700 flex items-center justify-between">
              <span>Daftar Peserta Ujian Lisan ({targetDate})</span>
              <span className="text-[10px] text-gray-400 font-normal">
                {candidatesData?.candidates?.length || 0} thalibah
              </span>
            </h4>

            {loading ? (
              <div className="py-8 text-center text-xs text-gray-400">Memuat data peserta ujian...</div>
            ) : !candidatesData?.candidates || candidatesData.candidates.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400 bg-gray-50 rounded-xl border border-dashed">
                Tidak ada peserta terdaftar ujian lisan pada tanggal {targetDate}.
              </div>
            ) : (
              <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-100 max-h-56 overflow-y-auto">
                {candidatesData.candidates.map((c: any) => (
                  <div key={c.registrationId} className="p-3 text-xs flex items-center justify-between gap-3 hover:bg-gray-50/80">
                    <div className="space-y-0.5">
                      <div className="font-bold text-gray-900 flex items-center gap-2">
                        <span>{c.fullName}</span>
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded font-semibold">
                          Juz {c.targetJuz}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-500 flex items-center gap-2">
                        <span>⏰ {c.startTime?.slice(0, 5)} - {c.endTime?.slice(0, 5)} WIB</span>
                        <span>•</span>
                        <span>WA: {c.whatsapp || '-'}</span>
                        <span>•</span>
                        <span>Penguji: {c.examinerName}</span>
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
                Berhasil: <strong>{executionResult.summary.sent_count}</strong> | Gagal: <strong>{executionResult.summary.failed_count}</strong> | Dilewati: <strong>{executionResult.summary.skipped_count}</strong>
              </p>
            </div>
          )}

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
              disabled={processing || loading || !candidatesData?.pending_count}
              onClick={() => handleExecute(false)}
              className="bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{processing ? 'Mengirim...' : `Kirim Pesan (${candidatesData?.pending_count || 0})`}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
