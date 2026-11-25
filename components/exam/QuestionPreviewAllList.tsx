'use client';

import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Edit2,
  Trash2,
  Eye,
  AlertTriangle,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { ExamQuestion, AdminQuestionEditForm } from '@/types/exam';
import { FormattedQuestionText } from './FormattedQuestionText';

interface QuestionPreviewAllListProps {
  questions: ExamQuestion[];
  onEdit: (q: ExamQuestion) => void;
  onDelete: (id: string) => void;
  onPreviewSingle: (q: ExamQuestion) => void;
  onQuickUpdateOptions?: (question: ExamQuestion, newOptions: Array<{ text: string; isCorrect: boolean }>) => Promise<void>;
}

const SECTION_LABELS: Record<number, string> = {
  1: 'Tebak Nama Surat',
  2: 'Tebak Ayat / Halaman',
  3: 'Sambung Surat',
  4: 'Tebak Awal Ayat',
  5: 'Ayat Mutasyabihat',
  6: 'Pengenalan Surat',
  7: 'Tebak Halaman',
};

function getNormalizedOptions(question: ExamQuestion): Array<{ text: string; isCorrect: boolean }> {
  let rawOptions: any = question.options;
  if (typeof rawOptions === 'string') {
    try {
      rawOptions = JSON.parse(rawOptions);
    } catch {
      rawOptions = [];
    }
  }
  if (!Array.isArray(rawOptions)) rawOptions = [];

  const texts = rawOptions.map((opt: any) => String(opt?.option_text ?? opt?.text ?? ''));
  const flaggedIndices = rawOptions
    .map((opt: any, idx: number) => (opt?.is_correct === true || opt?.isCorrect === true ? idx : -1))
    .filter((idx: number) => idx >= 0);

  let winningIdx = -1;
  const trimmedCorrect = question.correct_answer ? question.correct_answer.trim() : '';

  if (flaggedIndices.length > 0) {
    if (trimmedCorrect) {
      const flaggedMatch = flaggedIndices.find((idx) => texts[idx].trim() === trimmedCorrect);
      winningIdx = flaggedMatch !== undefined ? flaggedMatch : flaggedIndices[0];
    } else {
      winningIdx = flaggedIndices[0];
    }
  } else if (trimmedCorrect) {
    winningIdx = texts.findIndex((t) => t.trim() === trimmedCorrect);
  }

  return texts.map((text, idx) => ({
    text,
    isCorrect: idx === winningIdx,
  }));
}

function getQuestionIssues(question: ExamQuestion, normalizedOptions: Array<{ text: string; isCorrect: boolean }>): string[] {
  const issues: string[] = [];

  if (normalizedOptions.length < 2) {
    issues.push('Pilihan jawaban kurang dari 2 opsi');
  }
  if (normalizedOptions.length > 4) {
    issues.push(`Jumlah pilihan jawaban terlalu banyak (${normalizedOptions.length} opsi) — bisa dihapus langsung atau dipangkas jadi 4 opsi`);
  }
  const correctCount = normalizedOptions.filter((o) => o.isCorrect).length;
  if (correctCount === 0) {
    issues.push('Belum ada kunci jawaban yang ditandai benar');
  }

  // Check for empty option text
  if (normalizedOptions.some((o) => !o.text || !o.text.trim())) {
    issues.push('Terdapat opsi jawaban yang kosong');
  }

  // Check for duplicate options inside the same question
  const seenOpts = new Set<string>();
  for (const o of normalizedOptions) {
    const clean = o.text.trim();
    if (clean && seenOpts.has(clean)) {
      issues.push('Terdapat opsi jawaban kembar dalam satu soal');
      break;
    }
    seenOpts.add(clean);
  }

  // Check for glued Arabic words (e.g. tanwin dammah/kasrah directly followed by an Arabic letter without space)
  const gluedRegex = /([\u064C\u064D]|(?:[\u0648\u064A]\u0646\u064E))[\u0621-\u064A\u0671]/;
  if (gluedRegex.test(question.question_text)) {
    issues.push('Terdeteksi kemungkinan dua kata/ayat Arab menempel tanpa spasi pada soal');
  }
  if (normalizedOptions.some((o) => gluedRegex.test(o.text))) {
    issues.push('Terdeteksi kemungkinan dua kata/ayat Arab menempel tanpa spasi pada opsi jawaban');
  }

  return issues;
}

export function QuestionPreviewAllList({
  questions,
  onEdit,
  onDelete,
  onPreviewSingle,
  onQuickUpdateOptions,
}: QuestionPreviewAllListProps) {
  const [onlyShowWithIssues, setOnlyShowWithIssues] = useState(false);
  const [updatingQuestionId, setUpdatingQuestionId] = useState<string | null>(null);

  const enrichedQuestions = useMemo(() => {
    return questions.map((q) => {
      const normalizedOptions = getNormalizedOptions(q);
      const issues = getQuestionIssues(q, normalizedOptions);
      return {
        question: q,
        normalizedOptions,
        issues,
      };
    });
  }, [questions]);

  const totalWithIssues = useMemo(
    () => enrichedQuestions.filter((item) => item.issues.length > 0).length,
    [enrichedQuestions]
  );

  const displayedQuestions = useMemo(() => {
    if (!onlyShowWithIssues) return enrichedQuestions;
    return enrichedQuestions.filter((item) => item.issues.length > 0);
  }, [enrichedQuestions, onlyShowWithIssues]);

  const handleQuickDeleteOption = async (
    question: ExamQuestion,
    normalizedOptions: Array<{ text: string; isCorrect: boolean }>,
    optIdx: number
  ) => {
    if (!onQuickUpdateOptions) return;
    if (normalizedOptions.length <= 2) {
      alert('Minimal harus tersisa 2 opsi pilihan jawaban.');
      return;
    }
    const targetOpt = normalizedOptions[optIdx];
    const letter = String.fromCharCode(65 + optIdx);
    if (targetOpt?.isCorrect) {
      alert(`Opsi ${letter} adalah Kunci Jawaban saat ini. Pilih opsi lain sebagai kunci jawaban terlebih dahulu sebelum menghapus opsi ini.`);
      return;
    }

    try {
      setUpdatingQuestionId(question.id);
      const nextOptions = normalizedOptions.filter((_, idx) => idx !== optIdx);
      await onQuickUpdateOptions(question, nextOptions);
    } finally {
      setUpdatingQuestionId(null);
    }
  };

  const handleQuickSetCorrect = async (
    question: ExamQuestion,
    normalizedOptions: Array<{ text: string; isCorrect: boolean }>,
    optIdx: number
  ) => {
    if (!onQuickUpdateOptions) return;
    if (normalizedOptions[optIdx]?.isCorrect) return;

    try {
      setUpdatingQuestionId(question.id);
      const nextOptions = normalizedOptions.map((opt, idx) => ({
        ...opt,
        isCorrect: idx === optIdx,
      }));
      await onQuickUpdateOptions(question, nextOptions);
    } finally {
      setUpdatingQuestionId(null);
    }
  };

  const handleQuickTrimToFour = async (
    question: ExamQuestion,
    normalizedOptions: Array<{ text: string; isCorrect: boolean }>
  ) => {
    if (!onQuickUpdateOptions || normalizedOptions.length <= 4) return;

    try {
      setUpdatingQuestionId(question.id);
      const correctIdx = normalizedOptions.findIndex((o) => o.isCorrect);
      const kept: Array<{ text: string; isCorrect: boolean }> = [];
      normalizedOptions.forEach((opt) => {
        if (opt.isCorrect) {
          kept.push(opt);
        } else if (kept.length < (correctIdx > 3 ? 3 : 4)) {
          kept.push(opt);
        }
      });
      if (correctIdx >= 0 && !kept.some((o) => o.isCorrect)) {
        kept[kept.length - 1] = normalizedOptions[correctIdx];
      }
      await onQuickUpdateOptions(question, kept.slice(0, 4));
    } finally {
      setUpdatingQuestionId(null);
    }
  };

  if (questions.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-base font-bold text-gray-700">Tidak ada soal yang sesuai filter</p>
        <p className="text-xs text-gray-500 mt-1">Ubah filter Juz, Paket, atau kata kunci pencarian di atas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary & Quick Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-950">
          <span className="inline-flex items-center gap-1.5 font-black bg-emerald-800 text-white px-3 py-1 rounded-xl">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Menampilkan {displayedQuestions.length} Soal Sekaligus (Tanpa Paginasi)
          </span>
          <span className="font-semibold text-emerald-800">
            • Klik radio button untuk ganti kunci • Klik ikon sampah di tiap opsi untuk hapus opsi yang kebanyakan
          </span>
        </div>

        {totalWithIssues > 0 && (
          <button
            type="button"
            onClick={() => setOnlyShowWithIssues((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
              onlyShowWithIssues
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-300'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>
              {onlyShowWithIssues
                ? `Menampilkan ${totalWithIssues} Soal Perlu Cek (Klik untuk Semua)`
                : `Ada ${totalWithIssues} Soal Perlu Cek / Opsi > 4`}
            </span>
          </button>
        )}
      </div>

      {/* All Questions Cards */}
      <div className="space-y-4">
        {displayedQuestions.map(({ question, normalizedOptions, issues }, idx) => {
          const juzLabel =
            question.juz_code || `Juz ${question.juz_number}${question.question_package || ''}`;
          const sectionTitle =
            question.section_title || SECTION_LABELS[question.section_number] || `Section ${question.section_number}`;
          const hasLatinInQuestion = /[a-zA-Z]/.test(question.question_text || '');
          const isUpdatingThis = updatingQuestionId === question.id;

          return (
            <div
              key={question.id}
              className={`rounded-2xl border bg-white shadow-sm hover:shadow-md transition-all overflow-hidden ${
                issues.length > 0 ? 'border-rose-300 ring-1 ring-rose-200' : 'border-gray-200'
              } ${isUpdatingThis ? 'opacity-60 pointer-events-none' : ''}`}
            >
              {/* Card Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 bg-gray-50/80 border-b border-gray-100">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center justify-center min-w-[2rem] h-7 px-2 rounded-lg bg-emerald-800 text-white font-black text-xs">
                    #{idx + 1}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-200">
                    {juzLabel}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-900">
                    Soal No. {question.question_number}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                    Sec {question.section_number}: {sectionTitle}
                  </span>
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${
                      normalizedOptions.length > 4
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {normalizedOptions.length} Opsi
                  </span>
                  {question.is_active === false && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-200 text-gray-700">
                      Diarsipkan
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {onQuickUpdateOptions && normalizedOptions.length > 4 && (
                    <button
                      type="button"
                      onClick={() => handleQuickTrimToFour(question, normalizedOptions)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-xs font-bold transition"
                      title="Pangkas otomatis menjadi 4 opsi (A-D) dengan tetap mempertahankan Kunci Jawaban"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-amber-700" />
                      <span>Pangkas Jadi 4 Opsi</span>
                    </button>
                  )}
                  <span className="text-[11px] font-mono text-gray-400 mr-1">
                    ID: {question.id.slice(0, 8)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onEdit(question)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs"
                    title="Edit soal dan pilihan jawaban"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Soal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onPreviewSingle(question)}
                    className="p-1.5 rounded-xl text-gray-500 hover:bg-gray-200/70 transition"
                    title="Detail Modal"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(question.id)}
                    className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-100 transition"
                    title="Hapus soal"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 space-y-4">
                {issues.length > 0 && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Peringatan Pemeriksaan Otomatis:</span>
                    </div>
                    <ul className="list-disc list-inside pl-1 space-y-0.5 text-rose-800">
                      {issues.map((iss, i) => (
                        <li key={i}>{iss}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Question Text Box */}
                <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/40 border border-amber-100/90 space-y-2.5">
                  {!hasLatinInQuestion && sectionTitle && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1">
                        Instruksi: {sectionTitle}
                      </span>
                    </div>
                  )}
                  <FormattedQuestionText
                    text={question.question_text}
                    arabicClassName="text-2xl sm:text-3xl font-serif text-gray-900 leading-loose text-right py-1"
                  />
                </div>

                {/* Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {normalizedOptions.map((opt, optIdx) => {
                    const letter = String.fromCharCode(65 + optIdx);
                    const isArabicOpt = /[\u0600-\u06FF]/.test(opt.text);
                    const canDeleteOpt = normalizedOptions.length > 2 && !opt.isCorrect;

                    return (
                      <div
                        key={optIdx}
                        className={`p-3.5 rounded-xl border flex items-start gap-2.5 transition-all ${
                          opt.isCorrect
                            ? 'bg-green-50/90 border-green-400 text-green-950 shadow-xs ring-1 ring-green-400/40'
                            : 'bg-gray-50/50 border-gray-200 text-gray-800'
                        }`}
                      >
                        <label
                          className="inline-flex items-center gap-1.5 cursor-pointer select-none shrink-0 mt-0.5"
                          title={opt.isCorrect ? 'Kunci Jawaban saat ini' : `Jadikan opsi ${letter} sebagai Kunci Jawaban`}
                        >
                          {onQuickUpdateOptions && (
                            <input
                              type="radio"
                              name={`preview-correct-${question.id}`}
                              checked={opt.isCorrect}
                              onChange={() => handleQuickSetCorrect(question, normalizedOptions, optIdx)}
                              className="w-4 h-4 text-green-600 focus:ring-green-500 cursor-pointer"
                            />
                          )}
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                              opt.isCorrect
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            {letter}
                          </span>
                        </label>

                        <div
                          className={`flex-1 leading-relaxed ${
                            isArabicOpt
                              ? 'text-lg sm:text-xl font-serif text-right'
                              : 'text-sm font-medium text-left'
                          } ${opt.isCorrect ? 'font-bold text-green-950' : 'text-gray-800'}`}
                          dir={isArabicOpt ? 'rtl' : 'ltr'}
                          style={
                            isArabicOpt
                              ? { fontFamily: 'var(--font-amiri, "Amiri", "Traditional Arabic", serif)' }
                              : undefined
                          }
                        >
                          {opt.text}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                          {opt.isCorrect && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-green-600 text-white">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Kunci</span>
                            </span>
                          )}

                          {onQuickUpdateOptions && normalizedOptions.length > 2 && (
                            <button
                              type="button"
                              disabled={!canDeleteOpt}
                              onClick={() => handleQuickDeleteOption(question, normalizedOptions, optIdx)}
                              className={`p-1.5 rounded-lg border transition ${
                                canDeleteOpt
                                  ? 'text-rose-600 border-rose-200 bg-white hover:bg-rose-50 hover:border-rose-300'
                                  : 'text-gray-300 border-gray-100 bg-gray-50 cursor-not-allowed'
                              }`}
                              title={
                                opt.isCorrect
                                  ? 'Pindahkan Kunci Jawaban ke opsi lain terlebih dahulu sebelum menghapus opsi ini'
                                  : `Hapus opsi ${letter}`
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
