'use client';

import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  RefreshCw, 
  Send, 
  Users, 
  AlertOctagon, 
  ShieldAlert, 
  Calendar,
  Layers,
  ChevronRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface AutoEvaluateSPModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchId?: string;
  defaultWeek?: number;
  onSuccess: () => void;
}

export function AutoEvaluateSPModal({
  isOpen,
  onClose,
  batchId,
  defaultWeek = 1,
  onSuccess,
}: AutoEvaluateSPModalProps) {
  const [targetWeek, setTargetWeek] = useState<number>(defaultWeek);
  const [issueDate, setIssueDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [evaluationData, setEvaluationData] = useState<any | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'need_sp' | 'already_issued' | 'complete'>('need_sp');

  // Load preview data when modal opens or week changes
  useEffect(() => {
    if (isOpen) {
      loadPreview(targetWeek);
    }
  }, [isOpen, targetWeek, batchId]);

  const loadPreview = async (week: number) => {
    setLoadingPreview(true);
    try {
      const params = new URLSearchParams();
      if (batchId && batchId !== 'all') params.append('batch_id', batchId);
      params.append('week_number', String(week));

      const res = await fetch(`/api/musyrifah/sp/check-weekly?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setEvaluationData(data);
      } else {
        toast.error(data.error || 'Gagal memuat evaluasi mingguan');
      }
    } catch (e: any) {
      toast.error('Terjadi kesalahan saat memuat preview evaluasi');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleExecuteIssueSP = async () => {
    if (!evaluationData || evaluationData.sp_to_issue_count === 0) {
      toast('Tidak ada SP baru yang perlu diterbitkan.', { icon: 'ℹ️' });
      return;
    }

    const confirmMsg = `Terbitkan ${evaluationData.sp_to_issue_count} Surat Peringatan (SP) untuk Pekan ${targetWeek} secara otomatis?`;
    if (!window.confirm(confirmMsg)) return;

    setExecuting(true);
    try {
      const res = await fetch('/api/musyrifah/sp/check-weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch_id: batchId || evaluationData.batch_id,
          week_number: targetWeek,
          execute: true,
          issued_at: issueDate ? new Date(issueDate).toISOString() : new Date().toISOString(),
        }),
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        toast.success(`Alhamdulillah! Berhasil menerbitkan ${resData.issued_sp_count} SP Pekan ${targetWeek}.`);
        onSuccess();
        onClose();
      } else {
        toast.error(resData.error || 'Gagal menerbitkan SP secara massal');
      }
    } catch (e: any) {
      toast.error('Terjadi kesalahan saat mengeksekusi penerbitan SP');
    } finally {
      setExecuting(false);
    }
  };

  if (!isOpen) return null;

  const thalibahList = evaluationData?.thalibah_list || [];
  const filteredList = thalibahList.filter((item: any) => {
    if (filterType === 'need_sp') return item.action_needed === 'create_sp';
    if (filterType === 'already_issued') return item.action_needed === 'already_issued';
    if (filterType === 'complete') return item.is_complete;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-4xl w-full my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-green-950 via-emerald-950 to-green-900 p-6 text-white flex items-center justify-between relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shadow-inner">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight text-white">
                  Evaluasi & Terbitkan SP Otomatis
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-green-950">
                  Rutin Senin
                </span>
              </div>
              <p className="text-xs text-emerald-200/80 font-medium mt-0.5">
                Audit kepatuhan jurnal mingguan (<strong className="text-white">4 blok/pekan</strong>) & terbitkan SP bertahap (SP1 → SP2 → SP3)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={executing}
            className="text-white/60 hover:text-white hover:bg-white/10 rounded-xl p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Bar */}
        <div className="bg-gray-50 border-b border-gray-100 p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Week Selector */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Pekan Evaluasi:
              </label>
              <div className="flex items-center bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden h-9">
                <button
                  type="button"
                  onClick={() => setTargetWeek(w => Math.max(1, w - 1))}
                  disabled={loadingPreview || executing}
                  className="px-2.5 h-full text-gray-600 hover:bg-gray-100 font-bold transition-colors"
                >‹</button>
                <span className="px-3 text-xs font-black text-gray-900 min-w-[70px] text-center">
                  Pekan {targetWeek}
                </span>
                <button
                  type="button"
                  onClick={() => setTargetWeek(w => w + 1)}
                  disabled={loadingPreview || executing}
                  className="px-2.5 h-full text-gray-600 hover:bg-gray-100 font-bold transition-colors"
                >›</button>
              </div>
            </div>

            {/* Issue Date */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Tanggal Terbit:
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                disabled={executing}
                className="bg-white border border-gray-200 text-gray-800 text-xs font-bold rounded-xl px-3 py-1.5 shadow-sm outline-none focus:ring-2 focus:ring-green-900/20"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => loadPreview(targetWeek)}
            disabled={loadingPreview || executing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingPreview ? 'animate-spin text-green-700' : ''}`} />
            <span>Muat Ulang Data</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loadingPreview ? (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-3" />
              <p className="text-sm font-bold text-gray-700">Mengevaluasi Kepatuhan Jurnal Pekan {targetWeek}...</p>
              <p className="text-xs text-gray-400 mt-1">Menghitung blok setoran seluruh thalibah aktif & riwayat SP</p>
            </div>
          ) : evaluationData ? (
            <>
              {/* Summary Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-3.5 text-emerald-950">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Tuntas 100%</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-emerald-900">
                    {evaluationData.completed_thalibah_count}
                  </div>
                  <div className="text-[10px] text-emerald-700/80 font-semibold mt-0.5">
                    Lapor lengkap 4/4 blok
                  </div>
                </div>

                <div className="bg-amber-50/70 border border-amber-100 rounded-2xl p-3.5 text-amber-950">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Belum Tuntas</span>
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-2xl font-black text-amber-900">
                    {evaluationData.incomplete_thalibah_count}
                  </div>
                  <div className="text-[10px] text-amber-700/80 font-semibold mt-0.5">
                    Ghaib (0) / kurang (&lt;4 blok)
                  </div>
                </div>

                <div className="bg-rose-50/70 border border-rose-100 rounded-2xl p-3.5 text-rose-950">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">Perlu Terbit SP</span>
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                  </div>
                  <div className="text-2xl font-black text-rose-900">
                    {evaluationData.sp_to_issue_count}
                  </div>
                  <div className="text-[10px] text-rose-700/80 font-semibold mt-0.5">
                    Belum diterbitkan
                  </div>
                </div>

                <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-3.5 text-blue-950">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Sudah Terbit</span>
                    <Layers className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-2xl font-black text-blue-900">
                    {evaluationData.already_issued_sp_count}
                  </div>
                  <div className="text-[10px] text-blue-700/80 font-semibold mt-0.5">
                    Record SP tersimpan
                  </div>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setFilterType('need_sp')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      filterType === 'need_sp'
                        ? 'bg-white text-rose-900 shadow-sm font-black'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Perlu SP Baru ({evaluationData.sp_to_issue_count})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('already_issued')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      filterType === 'already_issued'
                        ? 'bg-white text-blue-900 shadow-sm font-black'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Sudah Terbit ({evaluationData.already_issued_sp_count})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('complete')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      filterType === 'complete'
                        ? 'bg-white text-emerald-900 shadow-sm font-black'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Tuntas ({evaluationData.completed_thalibah_count})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('all')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      filterType === 'all'
                        ? 'bg-white text-gray-900 shadow-sm font-black'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Semua ({evaluationData.total_active_thalibah})
                  </button>
                </div>

                <div className="text-xs font-semibold text-gray-400">
                  {filteredList.length} thalibah ditampilkan
                </div>
              </div>

              {/* Thalibah Evaluation Table */}
              {filteredList.length === 0 ? (
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-10 text-center text-gray-500 text-xs">
                  Tidak ada thalibah dalam kategori filter ini.
                </div>
              ) : (
                <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm bg-white">
                  <div className="max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50/80 sticky top-0 text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">
                        <tr>
                          <th className="py-2.5 px-4">Thalibah</th>
                          <th className="py-2.5 px-3">Juz / Part</th>
                          <th className="py-2.5 px-3">Setoran Pekan {targetWeek}</th>
                          <th className="py-2.5 px-3">Riwayat SP</th>
                          <th className="py-2.5 px-4 text-center">Tingkat SP</th>
                          <th className="py-2.5 px-4">Status Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredList.map((item: any) => {
                          const level = item.next_sp_level || 1;
                          const isComplete = item.is_complete;

                          return (
                            <tr key={item.thalibah_id} className="hover:bg-gray-50/60 transition-colors">
                              <td className="py-2.5 px-4 font-bold text-gray-900">
                                <div>{item.full_name || item.nama_kunyah}</div>
                                {item.whatsapp && (
                                  <div className="text-[10px] font-normal text-gray-400">{item.whatsapp}</div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-gray-600">
                                {item.confirmed_chosen_juz || '-'}
                              </td>
                              <td className="py-2.5 px-3 font-bold">
                                {isComplete ? (
                                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 text-[11px]">
                                    ✓ 4/4 Blok
                                  </span>
                                ) : item.completed_blocks_count === 0 ? (
                                  <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200 text-[11px]">
                                    0/4 (Ghaib)
                                  </span>
                                ) : (
                                  <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 text-[11px]">
                                    {item.completed_blocks_count}/4 Blok
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-gray-500 font-semibold">
                                {item.current_active_sp_level > 0 ? (
                                  <span className="text-amber-700 font-bold">
                                    SP {item.current_active_sp_level}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">Belum Ada</span>
                                )}
                              </td>
                              <td className="py-2.5 px-4 text-center">
                                {isComplete ? (
                                  <span className="text-gray-400 text-[11px]">-</span>
                                ) : (
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                    level === 1 ? 'bg-yellow-100 text-yellow-800' :
                                    level === 2 ? 'bg-amber-100 text-amber-800' :
                                    'bg-rose-100 text-rose-800'
                                  }`}>
                                    SP {level}
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-4">
                                {item.action_needed === 'create_sp' ? (
                                  <span className="text-rose-600 font-bold flex items-center gap-1 text-[11px]">
                                    <AlertOctagon className="w-3.5 h-3.5" />
                                    Akan Diterbitkan
                                  </span>
                                ) : item.action_needed === 'already_issued' ? (
                                  <span className="text-blue-600 font-bold flex items-center gap-1 text-[11px]">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Sudah Terbit
                                  </span>
                                ) : (
                                  <span className="text-emerald-600 font-semibold text-[11px]">
                                    Disiplin
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 border-t border-gray-100 p-4 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={executing}
            className="px-5 py-2.5 text-xs font-bold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-all shadow-sm"
          >
            Tutup
          </button>

          <div className="flex items-center gap-3">
            {evaluationData?.sp_to_issue_count > 0 ? (
              <button
                type="button"
                onClick={handleExecuteIssueSP}
                disabled={executing || loadingPreview}
                className="px-6 py-2.5 text-xs font-black text-white bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 rounded-xl shadow-lg shadow-rose-900/20 transition-all flex items-center gap-2"
              >
                {executing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menerbitkan {evaluationData.sp_to_issue_count} SP...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Terbitkan Semua SP ({evaluationData.sp_to_issue_count} Thalibah)</span>
                  </>
                )}
              </button>
            ) : (
              <div className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200">
                <CheckCircle2 className="w-4 h-4" />
                <span>Semua SP Pekan {targetWeek} Sudah Terbit / Disiplin</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
