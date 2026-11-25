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
import { ExamQuestion } from '@/types/exam';
import { FormattedQuestionText } from './FormattedQuestionText';

interface QuestionPreviewAllListProps {
  questions: ExamQuestion[];
  onEdit: (q: ExamQuestion) => void;
  onDelete: (id: string) => void;
  onPreviewSingle: (q: ExamQuestion) => void;
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
}: QuestionPreviewAllListProps) {
  const [onlyShowWithIssues, setOnlyShowWithIssues] = useState(false);

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
            • Kunci jawaban benar otomatis disorot hijau tebal • Klik tombol <strong>Edit Soal</strong> pada kartu mana pun untuk langsung mengoreksi
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
                : `Ada ${totalWithIssues} Soal Perlu Cek Format`}
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

          return (
            <div
              key={question.id}
              className={`rounded-2xl border bg-white shadow-sm hover:shadow-md transition-all overflow-hidden ${
                issues.length > 0 ? 'border-rose-300 ring-1 ring-rose-200' : 'border-gray-200'
              }`}
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
                  {question.is_active === false && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-200 text-gray-700">
                      Diarsipkan
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-mono text-gray-400 mr-2">
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

                    return (
                      <div
                        key={optIdx}
                        className={`p-3.5 rounded-xl border flex items-start gap-3 transition-all ${
                          opt.isCorrect
                            ? 'bg-green-50/90 border-green-400 text-green-950 shadow-xs ring-1 ring-green-400/40'
                            : 'bg-gray-50/50 border-gray-200 text-gray-800'
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs shrink-0 mt-0.5 ${
                            opt.isCorrect
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {letter}
                        </span>

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

                        {opt.isCorrect && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-green-600 text-white shrink-0 mt-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Kunci</span>
                          </span>
                        )}
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
