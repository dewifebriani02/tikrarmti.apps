'use client';

import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { DaftarUlangSubmission } from './types';
import { useJuzOptions } from '@/hooks/useJuzOptions';

export function ResetExamModal({
  submission,
  onClose,
  onConfirm
}: {
  submission: DaftarUlangSubmission;
  onClose: () => void;
  onConfirm: (registrationId: string, targetJuz: string, resetStatus: boolean) => Promise<void>;
}) {
  const [targetJuz, setTargetJuz] = useState(
    submission.confirmed_chosen_juz || submission.registration?.chosen_juz || ''
  );
  const [resetStatus, setResetStatus] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { juzOptions } = useJuzOptions();

  const handleConfirm = async () => {
    const registrationId = submission.registration?.id || submission.registration_id;
    if (!registrationId) return;
    setIsSubmitting(true);
    try {
      await onConfirm(registrationId, targetJuz, resetStatus);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-amber-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900">Reset Ujian Tulis (Seleksi)</h3>
              <p className="text-xs font-medium text-gray-500 mt-0.5">{submission.confirmed_full_name || submission.user?.full_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700">Kembalikan ke Juz (Target Juz)</label>
            <select
              value={targetJuz}
              onChange={(e) => setTargetJuz(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-amber-500 text-sm font-medium"
            >
              <option value="">-- Pilih Juz --</option>
              {juzOptions && juzOptions.length > 0 ? (
                juzOptions.map((j) => (
                  <option key={j.code} value={j.code}>Juz {j.name}</option>
                ))
              ) : (
                <>
                  <option value="1A">Juz 1A</option>
                  <option value="1B">Juz 1B</option>
                  <option value="28A">Juz 28A</option>
                  <option value="28B">Juz 28B</option>
                  <option value="29A">Juz 29A</option>
                  <option value="29B">Juz 29B</option>
                  <option value="30A">Juz 30A</option>
                  <option value="30B">Juz 30B</option>
                </>
              )}
            </select>
          </div>

          <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/50 cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex items-center h-5">
              <input 
                type="checkbox" 
                checked={resetStatus}
                onChange={(e) => setResetStatus(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded border-gray-300 focus:ring-amber-600"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-gray-900">Reset Status & Riwayat Ujian</span>
              <span className="text-xs text-gray-500 mt-0.5">Hapus nilai & riwayat percobaan ujian seleksi serta ubah status menjadi &quot;not_started&quot; agar thalibah bisa mengulang ujian.</span>
            </div>
          </label>
        </div>

        <div className="p-6 pt-2 flex justify-end gap-3 bg-gray-50/50">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleConfirm}
            disabled={!targetJuz || isSubmitting || !(submission.registration?.id || submission.registration_id)}
            className="px-5 py-2.5 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors shadow-md shadow-amber-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? 'Memproses...' : 'Ya, Reset Ujian'}
          </button>
        </div>
      </div>
    </div>
  );
}
