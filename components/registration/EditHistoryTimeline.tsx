'use client';

import React, { useState } from 'react';
import { History, AlertCircle, CheckCircle2, MessageSquare, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface EditHistoryItem {
  id: string;
  entity_type: string;
  entity_id: string;
  edit_phase: 'before_daftar_ulang' | 'after_daftar_ulang';
  changed_fields: Record<string, { label: string; old: any; new: any }>;
  edit_reason: string | null;
  notifications_sent?: {
    channel?: string;
    recipientsCount?: number;
    sentCount?: number;
    failedCount?: number;
    summary?: string;
  } | null;
  created_at: string;
}

export interface EditPhaseClientInfo {
  phase: 'before_daftar_ulang' | 'after_daftar_ulang';
  cutoffReason?: string;
  hasActiveStudents?: boolean;
}

function formatDisplayValue(val: any): string {
  if (val === null || val === undefined || val === '') return '(kosong)';
  if (typeof val === 'boolean') return val ? 'Ya' : 'Tidak';
  if (Array.isArray(val)) return val.join(', ') || '(kosong)';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

function formatWibDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' WIB';
  } catch {
    return iso;
  }
}

export function RegistrationEditPhaseBanner({
  editPhase,
  isMuallimahClass = false,
  editReason,
  onEditReasonChange,
  showReasonInput = true,
}: {
  editPhase?: EditPhaseClientInfo | null;
  isMuallimahClass?: boolean;
  editReason?: string;
  onEditReasonChange?: (val: string) => void;
  showReasonInput?: boolean;
}) {
  if (!editPhase) return null;

  const isPhaseB = editPhase.phase === 'after_daftar_ulang';

  return (
    <div
      className={`rounded-xl border p-4 space-y-3 ${
        isPhaseB
          ? 'bg-amber-50/90 border-amber-200 text-amber-950'
          : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
      }`}
    >
      <div className="flex items-start gap-3">
        {isPhaseB ? (
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        ) : (
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        )}
        <div className="space-y-1 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold">
              {isPhaseB
                ? 'Edit Pasca Daftar Ulang / Kelas Berjalan (Tercatat di Riwayat)'
                : 'Mode Edit Bebas (Pra-Daftar Ulang / Kelas Belum Mulai)'}
            </span>
            <Badge
              variant="outline"
              className={`text-[10px] ${
                isPhaseB
                  ? 'border-amber-300 bg-amber-100 text-amber-900'
                  : 'border-emerald-300 bg-emerald-100 text-emerald-900'
              }`}
            >
              {isPhaseB ? 'Riwayat Edit Aktif' : 'Belum Masuk Riwayat'}
            </Badge>
          </div>
          <p className="text-xs leading-relaxed opacity-90">
            {isPhaseB ? (
              <>
                {editPhase.cutoffReason ? `${editPhase.cutoffReason}. ` : ''}
                Ukhti tetap dapat mengedit data maupun jadwal. Setiap perubahan yang disimpan akan otomatis dicatat dalam{' '}
                <strong>Riwayat Edit</strong>
                {isMuallimahClass && (
                  <>
                    {' '}
                    dan jika jadwal/tautan kelas berubah,{' '}
                    <strong>notifikasi WhatsApp otomatis akan dikirim ke seluruh thalibah aktif</strong>
                  </>
                )}
                .
              </>
            ) : (
              <>
                Pendaftaran belum memasuki tahap daftar ulang atau kelas berjalan. Ukhti bebas mengubah data pilihan sebelum kelas dimulai.
              </>
            )}
          </p>
        </div>
      </div>

      {isPhaseB && showReasonInput && onEditReasonChange && (
        <div className="pt-2 border-t border-amber-200/70">
          <label className="block text-xs font-semibold text-amber-900 mb-1">
            Alasan / Catatan Perubahan (Opsional — akan tampil di Riwayat{isMuallimahClass ? ' & pesan WA thalibah' : ''})
          </label>
          <input
            type="text"
            value={editReason || ''}
            onChange={(e) => onEditReasonChange(e.target.value)}
            placeholder="Contoh: Penyesuaian jadwal halaqah karena agenda keluarga / amanah lain"
            className="w-full px-3 py-2 text-xs bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
      )}
    </div>
  );
}

export function EditHistoryTimeline({
  history,
  title = 'Riwayat Perubahan Pendaftaran',
  defaultExpanded = false,
}: {
  history: EditHistoryItem[];
  title?: string;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (!history || history.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-xs overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full px-4 py-3 flex items-center justify-between bg-gray-50/80 hover:bg-gray-100/70 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-amber-700" />
          <span className="text-sm font-bold text-gray-900">{title}</span>
          <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100 border-amber-200 text-[10px]">
            {history.length} Perubahan
          </Badge>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>

      {expanded && (
        <div className="p-4 space-y-3 divide-y divide-gray-100">
          {history.map((item) => {
            const entries = Object.entries(item.changed_fields || {});
            return (
              <div key={item.id} className="pt-3 first:pt-0 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-semibold text-gray-800">
                      {formatWibDateTime(item.created_at)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        item.edit_phase === 'after_daftar_ulang'
                          ? 'border-amber-300 bg-amber-50 text-amber-900'
                          : 'border-gray-200 bg-gray-50 text-gray-700'
                      }`}
                    >
                      {item.edit_phase === 'after_daftar_ulang'
                        ? 'Pasca Daftar Ulang / Kelas Berjalan'
                        : 'Pra Daftar Ulang'}
                    </Badge>
                    {item.notifications_sent && (item.notifications_sent.recipientsCount || 0) > 0 && (
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200 text-[10px] gap-1">
                        <MessageSquare className="w-3 h-3" />
                        WA Terkirim {item.notifications_sent.sentCount || 0}/{item.notifications_sent.recipientsCount}
                      </Badge>
                    )}
                  </div>
                </div>

                {item.edit_reason && (
                  <p className="text-xs text-gray-700 bg-amber-50/70 border border-amber-100 rounded-lg px-2.5 py-1.5">
                    <span className="font-semibold">Catatan:</span> {item.edit_reason}
                  </p>
                )}

                {entries.length > 0 && (
                  <div className="grid grid-cols-1 gap-1.5">
                    {entries.map(([key, diff]) => (
                      <div
                        key={key}
                        className="text-xs bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                      >
                        <span className="font-semibold text-gray-800">{diff.label}</span>
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                          <span className="line-through text-gray-400">
                            {formatDisplayValue(diff.old)}
                          </span>
                          <span className="text-gray-400">→</span>
                          <span className="font-semibold text-emerald-800">
                            {formatDisplayValue(diff.new)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
