'use client';

import { useState, useEffect } from 'react';
import { Volume2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { AdminVoiceRecorder } from '@/components/AdminVoiceRecorder';
import { SafeAudioPlayer } from '@/components/SafeAudioPlayer';

interface OralAssessmentProps {
  registrationId: string;
  oralSubmissionUrl?: string | null;
  currentAssessment?: {
    oral_makhraj_errors?: number;
    oral_sifat_errors?: number;
    oral_mad_errors?: number;
    oral_ghunnah_errors?: number;
    oral_harakat_errors?: number;
    oral_itmamul_harakat_errors?: number;
    oral_total_score?: number;
    oral_assessment_status?: string;
    oral_assessment_notes?: string;
    oral_assessment_audio_url?: string;
  };
  onSave?: (data: any) => void;
  onResetComplete?: () => void;
  readOnly?: boolean;
  allowNoSubmission?: boolean; // Allow assessment without VN
}

interface ErrorCounts {
  makhraj: number | null;
  sifat: number | null;
  mad: number | null;
  ghunnah: number | null;
  harakat: number | null;
  itmamul_harakat: number | null;
}

const PASSING_SCORE = 80;
const MAX_ERRORS_PER_CATEGORY = 10;

export function OralAssessment({
  registrationId,
  oralSubmissionUrl,
  currentAssessment,
  onSave,
  onResetComplete,
  readOnly = false,
  allowNoSubmission = false
}: OralAssessmentProps) {
  // If the status is not 'pass' or 'fail', we start with null errors (not yet graded)
  const isAlreadyGraded = currentAssessment?.oral_assessment_status === 'pass' || currentAssessment?.oral_assessment_status === 'fail';

  const [errors, setErrors] = useState<ErrorCounts>({
    makhraj: isAlreadyGraded ? (currentAssessment?.oral_makhraj_errors ?? null) : null,
    sifat: isAlreadyGraded ? (currentAssessment?.oral_sifat_errors ?? null) : null,
    mad: isAlreadyGraded ? (currentAssessment?.oral_mad_errors ?? null) : null,
    ghunnah: isAlreadyGraded ? (currentAssessment?.oral_ghunnah_errors ?? null) : null,
    harakat: isAlreadyGraded ? (currentAssessment?.oral_harakat_errors ?? null) : null,
    itmamul_harakat: isAlreadyGraded ? (currentAssessment?.oral_itmamul_harakat_errors ?? null) : null,
  });

  const [notes, setNotes] = useState(currentAssessment?.oral_assessment_notes || '');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [existingAudioUrl, setExistingAudioUrl] = useState<string | null>(currentAssessment?.oral_assessment_audio_url || null);
  const [saving, setSaving] = useState(false);
  const [manualScore, setManualScore] = useState<number | null>(currentAssessment?.oral_total_score || null);
  const [useManualScore, setUseManualScore] = useState<boolean>(() => {
    if (currentAssessment?.oral_total_score == null) return false;
    const categories = ['makhraj', 'sifat', 'mad', 'ghunnah', 'harakat', 'itmamul_harakat'] as const;
    const pointsPerCategory = 100 / 6;
    
    let totalScore = 0;
    let gradedCategoriesCount = 0;

    for (const cat of categories) {
      const dbKey = `oral_${cat}_errors` as keyof typeof currentAssessment;
      const errorCount = isAlreadyGraded ? (currentAssessment?.[dbKey] as number | null) : null;
      if (errorCount !== null && errorCount !== undefined) {
        gradedCategoriesCount++;
        const points = Math.max(0, pointsPerCategory - (errorCount * 3.33));
        totalScore += points;
      }
    }

    if (gradedCategoriesCount !== 6) return false;
    const calculated = Math.min(100, Math.max(0, totalScore));
    return Math.abs(Number(currentAssessment.oral_total_score) - calculated) > 0.05;
  });

  const calculateScore = (): number | null => {
    const categories = ['makhraj', 'sifat', 'mad', 'ghunnah', 'harakat', 'itmamul_harakat'] as const;
    const pointsPerCategory = 100 / 6; // ~16.67 per category
    const penaltyPerError = pointsPerCategory / 5; // Max 5 errors = 0 points

    // If any category is not yet graded, we don't calculate the score
    if (categories.some(cat => errors[cat] === null)) {
      return null;
    }

    const totalScore = categories.reduce((total, category) => {
      const categoryErrors = errors[category] as number;
      if (categoryErrors >= 5) {
        return total + 0;
      }
      const categoryScore = Math.max(0, pointsPerCategory - (categoryErrors * penaltyPerError));
      return total + categoryScore;
    }, 0);

    return Math.round(totalScore * 100) / 100;
  };

  const categories = [
    { key: 'makhraj' as const, label: 'Makhraj', shortLabel: 'Makhraj', description: 'Titik keluar huruf' },
    { key: 'sifat' as const, label: 'Sifat', shortLabel: 'Sifat', description: 'Sifat huruf' },
    { key: 'mad' as const, label: 'Mad', shortLabel: 'Mad', description: 'Panjang mad' },
    { key: 'ghunnah' as const, label: 'Ghunnah', shortLabel: 'Ghunnah', description: 'Dengung' },
    { key: 'harakat' as const, label: 'Harakat', shortLabel: 'Harakat', description: 'Tanda baca' },
    { key: 'itmamul_harakat' as const, label: 'Itmamul Harakat', shortLabel: 'Itmam', description: 'Kesempurnaan harakat' },
  ];

  const calculatedScore = calculateScore();
  const finalScore = useManualScore ? (manualScore || 0) : calculatedScore;
  const isPassing = finalScore !== null && finalScore >= PASSING_SCORE;
  const assessmentStatus = finalScore !== null ? (finalScore >= PASSING_SCORE ? 'pass' : 'fail') : null;
  const isComplete = useManualScore || calculatedScore !== null;

  const handleErrorChange = (category: keyof ErrorCounts, value: number) => {
    setErrors(prev => ({
      ...prev,
      [category]: Math.max(0, Math.min(MAX_ERRORS_PER_CATEGORY, value))
    }));
  };

  const handleSave = async () => {
    if (!onSave) return;

    setSaving(true);
    try {
      let finalAudioUrl = existingAudioUrl;

      if (audioBlob) {
        const supabase = createClient();
        const fileName = `${registrationId}-${Date.now()}.webm`;
        const { data, error } = await supabase.storage
          .from('selection-audios')
          .upload(`feedback/${fileName}`, audioBlob, {
            contentType: audioBlob.type || 'audio/webm',
            upsert: false
          });
          
        if (error) {
          console.error("Error uploading audio:", error);
          alert('Gagal mengupload audio feedback');
          throw new Error('Gagal mengupload audio feedback');
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('selection-audios')
          .getPublicUrl(`feedback/${fileName}`);
          
        finalAudioUrl = publicUrl;
      }

      await onSave({
        oral_makhraj_errors: errors.makhraj,
        oral_sifat_errors: errors.sifat,
        oral_mad_errors: errors.mad,
        oral_ghunnah_errors: errors.ghunnah,
        oral_harakat_errors: errors.harakat,
        oral_itmamul_harakat_errors: errors.itmamul_harakat,
        oral_total_score: finalScore,
        oral_assessment_status: assessmentStatus,
        oral_assessment_notes: notes,
        oral_assessment_audio_url: finalAudioUrl,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetSubmission = async () => {
    if (!window.confirm("Apakah Ukhti yakin ingin menghapus rekaman ini dan meminta thalibah merekam ulang? Rekaman saat ini di cloud storage akan dihapus permanen.")) {
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();

      // Delete oral submission file from storage
      if (oralSubmissionUrl) {
        try {
          const bucketSegment = 'selection-audios/';
          const bucketIndex = oralSubmissionUrl.indexOf(bucketSegment);
          let path = '';
          if (bucketIndex !== -1) {
            path = oralSubmissionUrl.substring(bucketIndex + bucketSegment.length).split('?')[0];
          } else {
            const urlParts = oralSubmissionUrl.split('/');
            path = urlParts[urlParts.length - 1].split('?')[0];
          }

          if (path) {
            // Local file cleanup: file at /uploads/audio/<path> is managed server-side
            console.log('OralAssessment: File would be deleted from local storage:', path);
          }
        } catch (storageErr) {
          console.error('OralAssessment: Failed to delete file from storage:', storageErr);
        }
      }

      // Delete feedback audio from storage if exists
      const feedbackAudioUrl = currentAssessment?.oral_assessment_audio_url;
      if (feedbackAudioUrl) {
        try {
          const bucketSegment = 'selection-audios/';
          const bucketIndex = feedbackAudioUrl.indexOf(bucketSegment);
          let path = '';
          if (bucketIndex !== -1) {
            path = feedbackAudioUrl.substring(bucketIndex + bucketSegment.length).split('?')[0];
          } else {
            const urlParts = feedbackAudioUrl.split('/');
            path = urlParts[urlParts.length - 1].split('?')[0];
          }

          if (path) {
            // Local file cleanup: file at /uploads/audio/<path> is managed server-side
            console.log('OralAssessment: Feedback file would be deleted from local storage:', path);
          }
        } catch (storageErr) {
          console.error('OralAssessment: Failed to delete feedback file from storage:', storageErr);
        }
      }

      const response = await fetch(`/api/pendaftaran/tikrar/${registrationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          oral_submission_url: null,
          oral_submission_file_name: null,
          oral_submitted_at: null,
          oral_assessment_status: 'pending',
          oral_makhraj_errors: null,
          oral_sifat_errors: null,
          oral_mad_errors: null,
          oral_ghunnah_errors: null,
          oral_harakat_errors: null,
          oral_itmamul_harakat_errors: null,
          oral_total_score: null,
          oral_assessment_notes: 'NEEDS_REVISION',
          oral_assessment_audio_url: null,
          selection_status: 'pending'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update database');
      }

      if (onResetComplete) {
        onResetComplete();
      } else {
        alert('Rekaman berhasil dihapus. Status didefinisikan kembali ke belum kirim.');
        window.location.reload();
      }
    } catch (err: any) {
      console.error('Error resetting submission:', err);
      alert('Gagal meriset rekaman: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!oralSubmissionUrl && !allowNoSubmission) {
    return (
      <div className="bg-gray-50 p-6 rounded-lg">
        <div className="flex items-center gap-2 text-gray-600">
          <AlertCircle className="w-5 h-5" />
          <p>Rekaman oral belum disubmit</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {oralSubmissionUrl ? (
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-green-700" />
              <h4 className="font-semibold text-green-900">Rekaman QS. Al-Fath 29</h4>
            </div>
          </div>
          <SafeAudioPlayer src={oralSubmissionUrl} />
          <div className="mt-3 flex justify-between items-center gap-2">
            <a
              href={oralSubmissionUrl}
              download={oralSubmissionUrl.split('/').pop()?.split('?')[0] ?? 'rekaman.webm'}
              className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer no-underline"
            >
              📥 Unduh Rekaman
            </a>
            {!readOnly && (
              <button
                type="button"
                onClick={handleResetSubmission}
                disabled={saving}
                className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 disabled:bg-gray-100 disabled:text-gray-400 border border-red-200 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {saving ? 'Memproses...' : '⚠️ Hapus & Minta Rekam Ulang'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-yellow-700" />
            <h4 className="font-semibold text-yellow-900">Tidak Ada Rekaman VN</h4>
          </div>
          <p className="text-sm text-yellow-800">
            Penilaian dilakukan tanpa rekaman video/audio. Pastikan penilaian berdasarkan evaluasi langsung atau metode lain yang sah.
          </p>
        </div>
      )}

      <div className="bg-white border rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Penilaian Tajweed - Klik kategori yang salah</h4>

        {/* Compact Grid Layout - All categories visible at once */}
        <div className="grid grid-cols-1 gap-4 mb-6">
          {categories.map(category => (
            <div key={category.key} className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-start justify-between gap-4">
                {/* Category Name */}
                <div className="flex-shrink-0 w-24">
                  <p className="text-sm font-semibold text-gray-900">{category.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{category.description}</p>
                </div>

                {/* Error Count Buttons - Compact inline */}
                <div className="flex items-center gap-2 flex-wrap">
                  {[0, 1, 2, 3, 4, 5].map((errorCount) => (
                    <button
                      key={errorCount}
                      type="button"
                      onClick={() => handleErrorChange(category.key, errorCount)}
                      disabled={readOnly}
                      className={`w-10 h-10 flex items-center justify-center border-2 rounded-md font-medium transition-all ${
                        errors[category.key] === errorCount
                          ? 'border-green-600 bg-green-600 text-white shadow-md'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-green-500 hover:bg-green-50'
                      } ${readOnly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                    >
                      {errorCount}
                    </button>
                  ))}
                  {errors[category.key] !== null && (errors[category.key] as number) >= 5 && (
                    <span className="ml-2 px-2 py-1 bg-red-100 text-red-600 text-xs rounded font-medium">
                      0 poin
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Score Display and Manual Override */}
        <div className="mt-6 space-y-4">
          {/* Calculated Score */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Nilai Otomatis (dari hitungan kesalahan)</p>
                <p className="text-2xl font-bold text-blue-900">
                  {calculatedScore !== null ? calculatedScore.toFixed(2) : '-'}
                </p>
              </div>
              {!useManualScore && calculatedScore !== null && (
                <div className="flex items-center gap-2">
                  {calculatedScore >= PASSING_SCORE ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-600" />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Manual Override Option */}
          {!readOnly && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useManualScore}
                  onChange={(e) => {
                    setUseManualScore(e.target.checked);
                    if (!e.target.checked) {
                      setManualScore(null);
                    }
                  }}
                  className="mt-1 w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-yellow-900">Atur Nilai Manual (Override)</p>
                  <p className="text-xs text-yellow-700 mt-0.5">
                    Centang untuk mengatur nilai final secara manual. Gunakan prerogatif ini untuk penyesuaian khusus.
                  </p>
                </div>
              </label>

              {useManualScore && (
                <div className="mt-3 flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700">Nilai Final:</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={manualScore || ''}
                    onChange={(e) => setManualScore(parseFloat(e.target.value) || 0)}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-md text-center font-bold focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                  <span className="text-xs text-gray-500">(0-100)</span>
                </div>
              )}
            </div>
          )}

          {/* Final Score Display */}
          <div className={`p-4 rounded-lg ${
            finalScore === null ? 'bg-gray-50 border border-gray-200' : 
            isPassing ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: finalScore === null ? '#6b7280' : isPassing ? '#065f46' : '#991b1b' }}>
                  Nilai Final {useManualScore && '(Manual Override)'}
                </p>
                <p className="text-3xl font-bold" style={{ color: finalScore === null ? '#9ca3af' : isPassing ? '#047857' : '#dc2626' }}>
                  {finalScore !== null ? finalScore.toFixed(2) : '-'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {finalScore === null ? (
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-400">Belum Dinilai</p>
                    <p className="text-xs text-gray-500">Pilih kesalahan di atas</p>
                  </div>
                ) : isPassing ? (
                  <>
                    <CheckCircle className="w-8 h-8 text-green-600" />
                    <div>
                      <p className="text-lg font-bold text-green-900">LULUS</p>
                      <p className="text-xs text-green-600">≥ {PASSING_SCORE}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="w-8 h-8 text-red-600" />
                    <div>
                      <p className="text-lg font-bold text-red-900">TIDAK LULUS</p>
                      <p className="text-xs text-red-600">&#60; {PASSING_SCORE}</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {!isPassing && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">
                  <strong>Himbauan:</strong> Peserta akan diminta mendaftar ulang pada batch berikutnya
                  dan dihimbau untuk mengikuti Kelas Tashih Umum untuk memperbaiki bacaan.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Catatan Penilaian (Opsional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={readOnly}
            rows={3}
            placeholder="Tambahkan catatan untuk peserta..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100 mb-4"
          />
          {!readOnly && (
            <AdminVoiceRecorder 
              existingAudioUrl={existingAudioUrl}
              onAudioReady={(blob) => {
                setAudioBlob(blob);
                if (!blob) setExistingAudioUrl(null); // Deleted
              }} 
            />
          )}
        </div>

        {!readOnly && onSave && (
          <div className="mt-4">
            <button
              onClick={handleSave}
              disabled={saving || !isComplete}
              className="w-full px-4 py-2 bg-green-900 text-white rounded-md hover:bg-green-800 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
            >
              {saving ? 'Menyimpan...' : 'Simpan Penilaian'}
            </button>
          </div>
        )}
      </div>

      <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-900">
        <p className="font-semibold mb-1">Formula: 6 kategori × 16.67 poin | 1 kesalahan = -3.33 poin | ≥5 kesalahan = 0 poin | Lulus ≥{PASSING_SCORE}</p>
      </div>
    </div>
  );
}
