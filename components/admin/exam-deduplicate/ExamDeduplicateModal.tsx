'use client';

import React, { useState } from 'react';
import {
  CopyMinus,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Archive,
  RefreshCw,
  X,
  Layers,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';

interface DuplicateItem {
  id: string;
  juz_number: number;
  question_package: string;
  section_number: number;
  section_title: string;
  question_number: number;
  question_text: string;
  correct_answer?: string | null;
  is_active: boolean;
}

interface DuplicateGroup {
  juz_number: number;
  matchType: 'exact' | 'normalized' | 'semantic';
  canonical: DuplicateItem;
  duplicates: DuplicateItem[];
  confidence: number;
  reason: string;
  referencedInAttempts: Record<string, number>;
}

interface ScanData {
  groups: DuplicateGroup[];
  totalQuestions: number;
  totalDuplicateCount: number;
}

interface ExamDeduplicateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ExamDeduplicateModal({
  isOpen,
  onClose,
  onSuccess,
}: ExamDeduplicateModalProps) {
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [data, setData] = useState<ScanData | null>(null);
  const [selectedJuz, setSelectedJuz] = useState<string>('all');
  const [useAi, setUseAi] = useState<boolean>(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({});

  const handleScan = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedJuz !== 'all') params.append('juz', selectedJuz);
      if (useAi) params.append('use_ai', 'true');

      const res = await fetch(`/api/admin/exams/deduplicate?${params.toString()}`);
      const json = await res.json();

      if (res.ok && json.success) {
        setData(json.data);
        if (json.data.groups.length === 0) {
          toast.success('Alhamdulillah, tidak ditemukan duplikasi soal!');
        } else {
          toast.info(`Ditemukan ${json.data.totalDuplicateCount} soal duplikat pada ${json.data.groups.length} grup.`);
        }
      } else {
        toast.error(json.error || 'Gagal memindai duplikasi');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal terhubung ke server');
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async (action: 'archive' | 'delete') => {
    if (!data || data.groups.length === 0) return;

    const confirmMsg =
      action === 'delete'
        ? `Apakah Ukhti yakin ingin MENGHAPUS PERMANEN ${data.totalDuplicateCount} soal duplikat? Riwayat jawaban peserta yang mereferensikan soal ini akan otomatis disinkronkan ke soal kanonikal.`
        : `Apakah Ukhti yakin ingin MENGARSIPKAN (is_active = false) ${data.totalDuplicateCount} soal duplikat?`;

    if (!window.confirm(confirmMsg)) return;

    setExecuting(true);
    try {
      const res = await fetch('/api/admin/exams/deduplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          juz: selectedJuz !== 'all' ? selectedJuz : undefined,
          useAi,
        }),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        toast.success(json.message);
        setData(null);
        onSuccess();
        onClose();
      } else {
        toast.error(json.error || 'Gagal memproses pembersihan duplikat');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Terjadi kesalahan jaringan');
    } finally {
      setExecuting(false);
    }
  };

  const toggleGroup = (idx: number) => {
    setExpandedGroups((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 to-green-800 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md">
              <CopyMinus className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
                Pembersih Duplikasi Soal Ujian (AI &amp; Heuristik)
              </h3>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                Deteksi duplikasi Paket A, B, atau Semua Paket agar total soal sesuai standar (100 soal/juz)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Controls Bar */}
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200/70 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Pilih Juz
                </label>
                <select
                  value={selectedJuz}
                  onChange={(e) => setSelectedJuz(e.target.value)}
                  className="px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  <option value="all">Semua Juz (1 s/d 30)</option>
                  <option value="1">Juz 1</option>
                  <option value="28">Juz 28</option>
                  <option value="29">Juz 29</option>
                  <option value="30">Juz 30</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-4">
                <input
                  type="checkbox"
                  id="ai-toggle"
                  checked={useAi}
                  onChange={(e) => setUseAi(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <label htmlFor="ai-toggle" className="text-xs font-bold text-gray-700 flex items-center gap-1 cursor-pointer">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  Verifikasi Semantik AI (Gemini)
                </label>
              </div>
            </div>

            <button
              type="button"
              onClick={handleScan}
              disabled={loading || executing}
              className="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 active:scale-95 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Memindai Bank Soal...' : 'Pindai Duplikasi'}</span>
            </button>
          </div>

          {/* Results Summary */}
          {data && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
                  <span className="text-2xl font-black text-emerald-900">{data.totalQuestions}</span>
                  <p className="text-xs font-bold text-emerald-700 uppercase mt-0.5">Total Soal Dicek</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                  <span className="text-2xl font-black text-amber-900">{data.groups.length}</span>
                  <p className="text-xs font-bold text-amber-700 uppercase mt-0.5">Grup Duplikasi</p>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-center">
                  <span className="text-2xl font-black text-rose-900">{data.totalDuplicateCount}</span>
                  <p className="text-xs font-bold text-rose-700 uppercase mt-0.5">Soal Redundan Ditemukan</p>
                </div>
              </div>

              {data.groups.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-200">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                  <h4 className="font-bold text-gray-800 text-sm">Bank Soal Sudah Bersih</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Tidak ada soal yang terdeteksi ganda di paket yang dipilih.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-emerald-700" />
                      Daftar Temuan Duplikasi ({data.groups.length} Grup)
                    </h4>
                    <span className="text-[11px] text-gray-500 italic">
                      Riwayat jawaban ujian akan otomatis diarahkan ke soal kanonikal
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {data.groups.map((group, gIdx) => {
                      const isExpanded = !!expandedGroups[gIdx];
                      return (
                        <div
                          key={gIdx}
                          className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-3"
                        >
                          <div
                            onClick={() => toggleGroup(gIdx)}
                            className="flex items-center justify-between cursor-pointer select-none"
                          >
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[11px]">
                                Juz {group.juz_number}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold text-[10px] uppercase">
                                {group.matchType}
                              </span>
                              <span className="text-xs font-bold text-gray-800">
                                {group.duplicates.length} duplikat ditemukan
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-gray-400">
                              <span className="text-[11px] text-gray-500 font-mono">
                                Sec {group.canonical.section_number}
                              </span>
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                          </div>

                          <div className="text-xs font-serif text-gray-900 bg-gray-50/80 p-3 rounded-xl border border-gray-150 line-clamp-2">
                            {group.canonical.question_text}
                          </div>

                          {isExpanded && (
                            <div className="space-y-2 pt-2 border-t border-gray-100 text-xs">
                              {/* Canonical item */}
                              <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-200 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-emerald-950 flex items-center gap-1.5 text-[11px]">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                                    Kanonikal (Dipertahankan): Paket {group.canonical.question_package} - No. {group.canonical.question_number}
                                  </span>
                                  <span className="text-[10px] text-emerald-800 font-semibold">
                                    {group.referencedInAttempts[group.canonical.id] || 0}x diisi peserta
                                  </span>
                                </div>
                                <p className="text-[11px] text-emerald-800">
                                  <strong>Kunci:</strong> {group.canonical.correct_answer || '-'}
                                </p>
                              </div>

                              {/* Duplicate items */}
                              {group.duplicates.map((dup, dIdx) => (
                                <div
                                  key={dIdx}
                                  className="bg-rose-50/70 p-3 rounded-xl border border-rose-200 space-y-1"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-rose-950 flex items-center gap-1.5 text-[11px]">
                                      <Trash2 className="w-3.5 h-3.5 text-rose-700" />
                                      Duplikat (Akan Dihapus/Arsip): Paket {dup.question_package} - No. {dup.question_number}
                                    </span>
                                    <span className="text-[10px] text-rose-800 font-semibold">
                                      {group.referencedInAttempts[dup.id] || 0}x diisi peserta
                                    </span>
                                  </div>
                                  <p className="text-[10px] font-mono text-gray-400">ID: {dup.id}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Safe Remapping Notice */}
          <div className="bg-blue-50/80 border border-blue-200 p-4 rounded-2xl flex items-start gap-3 text-xs text-blue-900">
            <ShieldAlert className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold block">Integritas Riwayat Ujian Terjamin Aman:</span>
              <p className="text-[11px] text-blue-800/90 mt-0.5">
                Proses pembersihan menggunakan re-mapping otomatis pada kolom jawaban riwayat ujian siswa (<code>exam_attempts.answers</code>), sehingga nilai, statistik ujian, dan sertifikat kelulusan santriwati tidak akan rusak ataupun terhapus.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 border-t border-gray-200 p-5 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-bold"
          >
            Tutup
          </button>

          {data && data.groups.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleExecute('archive')}
                disabled={executing}
                className="px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Archive className="w-4 h-4 text-amber-700" />
                <span>Arsipkan Duplikat ({data.totalDuplicateCount})</span>
              </button>

              <button
                type="button"
                onClick={() => handleExecute('delete')}
                disabled={executing}
                className="px-5 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 active:scale-95 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Hapus Permanen &amp; Re-map ({data.totalDuplicateCount})</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
