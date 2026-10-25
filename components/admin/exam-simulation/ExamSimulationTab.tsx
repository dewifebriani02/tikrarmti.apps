'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  GraduationCap,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Layers,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BookOpen,
  Volume2,
  VolumeX,
  AlertTriangle,
  FileCheck,
  Search,
  Filter,
  Eye,
  EyeOff,
  Flame,
  Award
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export interface ExamQuestion {
  id: string;
  juz_number: number;
  juz_code?: string;
  question_text: string;
  question_type: string;
  options: Array<{ text: string; isCorrect: boolean }>;
  correct_answer?: string;
  points: number;
  section_number: number;
  section_title: string;
  question_package: string;
  question_number?: number;
}

const SECTION_LABELS: Record<number, string> = {
  1: 'Tebak Nama Surat',
  2: 'Tebak Ayat',
  3: 'Sambung Surat',
  4: 'Tebak Awal Ayat',
  5: 'Ayat Mutasyabihat',
  6: 'Pengenalan Surat',
  7: 'Tebak Halaman',
};

export function ExamSimulationTab() {
  const [selectedJuz, setSelectedJuz] = useState<number>(30);
  const [selectedPackage, setSelectedPackage] = useState<'all' | 'A' | 'B'>('all');
  const [selectedSection, setSelectedSection] = useState<'all' | number>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [summaryByJuz, setSummaryByJuz] = useState<Record<number, any>>({});

  // Simulation mode: 'bank' (audit/preview all) or 'test' (interactive test)
  const [mode, setMode] = useState<'bank' | 'test'>('bank');

  // Test mode state
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [isTestSubmitted, setIsTestSubmitted] = useState<boolean>(false);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [showAnswerDirectly, setShowAnswerDirectly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Fetch questions when filter changes
  const fetchQuestions = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('juz', selectedJuz.toString());
      if (selectedPackage !== 'all') params.set('package', selectedPackage);
      if (selectedSection !== 'all') params.set('section', selectedSection.toString());

      const res = await fetch(`/api/admin/exams/simulation?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data.success) {
        setQuestions(data.data || []);
        if (data.summaryByJuz) {
          setSummaryByJuz(data.summaryByJuz);
        }
      } else {
        toast.error(data.error || 'Gagal memuat bank soal ujian');
      }
    } catch (err: any) {
      console.error('Error fetching simulation questions:', err);
      toast.error('Terjadi kesalahan jaringan.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
    // Reset test state when juz/filter changes
    resetTestState();
  }, [selectedJuz, selectedPackage, selectedSection]);

  // Timer logic for test mode
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerActive && !isTestSubmitted) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive, isTestSubmitted]);

  const resetTestState = () => {
    setCurrentIndex(0);
    setUserAnswers({});
    setIsTestSubmitted(false);
    setElapsedTime(0);
    setTimerActive(false);
  };

  const startTest = () => {
    resetTestState();
    setMode('test');
    setTimerActive(true);
    toast.success(`Simulasi Ujian Juz ${selectedJuz} dimulai! Bismillah.`);
  };

  const handleSelectAnswer = (questionId: string, answerText: string) => {
    if (isTestSubmitted) return;
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: answerText,
    }));
  };

  // Score calculation
  const scoreStats = useMemo(() => {
    if (questions.length === 0) return { correct: 0, total: 0, percentage: 0 };
    let correct = 0;
    questions.forEach((q) => {
      const answered = userAnswers[q.id];
      const correctOpt = q.options?.find((o) => o.isCorrect)?.text || q.correct_answer;
      if (answered && answered === correctOpt) {
        correct++;
      }
    });
    return {
      correct,
      total: questions.length,
      percentage: Math.round((correct / questions.length) * 100),
    };
  }, [questions, userAnswers]);

  // Filtered list for bank preview
  const filteredQuestions = useMemo(() => {
    if (!searchQuery.trim()) return questions;
    const q = searchQuery.toLowerCase();
    return questions.filter(
      (item) =>
        item.question_text.toLowerCase().includes(q) ||
        item.section_title?.toLowerCase().includes(q) ||
        item.options?.some((opt) => opt.text.toLowerCase().includes(q))
    );
  }, [questions, searchQuery]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-emerald-200 text-xs font-bold border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Sandbox Evaluasi & Quality Control (Admin & Musyrifah)</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Simulasi Ujian Semua Juz
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
            Fitur khusus pengurus untuk menguji alur pengerjaan ujian, validasi pilihan ganda, keutuhan ayat, dan format bank soal <strong>Juz 1 s.d. 30</strong> sebelum dirilis ke thalibah. Pengerjaan di sini <em>tidak mencemari</em> data rekam jejak santriwati asli.
          </p>
        </div>
      </div>

      {/* 2. Top Filter Bar: Selector Juz 1 - 30 */}
      <Card className="rounded-2xl border-gray-100 shadow-sm bg-white overflow-hidden">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-700" />
              <span className="font-black text-sm text-gray-900 uppercase tracking-wider">
                Pilih Juz Target Ujian
              </span>
            </div>

            {/* Quick Switch Mode: Bank vs Interactive Test */}
            <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl">
              <button
                type="button"
                onClick={() => setMode('bank')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  mode === 'bank'
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Bank Soal & Kunci</span>
              </button>
              <button
                type="button"
                onClick={() => startTest()}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  mode === 'test'
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Play className="w-3.5 h-3.5" />
                <span>Mulai Simulasi Interaktif</span>
              </button>
            </div>
          </div>

          {/* Grid Tombol Juz 1 s.d. 30 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className="font-semibold">Klik salah satu juz di bawah:</span>
              <span>
                Juz Aktif: <strong className="text-emerald-700 font-black">Juz {selectedJuz}</strong> ({questions.length} Soal Tersedia)
              </span>
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-15 gap-1.5">
              {Array.from({ length: 30 }, (_, i) => i + 1).map((juz) => {
                const count = summaryByJuz[juz]?.total || 0;
                const isSelected = selectedJuz === juz;
                const hasQuestions = count > 0;

                return (
                  <button
                    key={juz}
                    type="button"
                    onClick={() => setSelectedJuz(juz)}
                    className={`py-2 px-1 rounded-xl text-center font-bold text-xs transition-all relative ${
                      isSelected
                        ? 'bg-emerald-800 text-white shadow-md shadow-emerald-800/30 scale-105 z-10'
                        : hasQuestions
                        ? 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200/80'
                        : 'bg-gray-50 text-gray-400 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <div>J{juz}</div>
                    <div className={`text-[9px] font-normal ${isSelected ? 'text-emerald-200' : 'text-gray-400'}`}>
                      {hasQuestions ? `${count}s` : '0'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sub Filters: Paket & Section */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                Paket Soal
              </label>
              <select
                value={selectedPackage}
                onChange={(e) => setSelectedPackage(e.target.value as any)}
                className="w-full text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Semua Paket (A & B)</option>
                <option value="A">Paket A</option>
                <option value="B">Paket B</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                Kategori Soal (Section)
              </label>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10))}
                className="w-full text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Semua Kategori (1–7)</option>
                {Object.entries(SECTION_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>
                    {val}. {label}
                  </option>
                ))}
              </select>
            </div>

            {mode === 'bank' && (
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Cari Potongan Ayat
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Ketik teks Arab atau kata..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 3. Main Content: Bank Soal View vs Test Mode View */}
      {isLoading ? (
        <Card className="rounded-2xl border-gray-100 shadow-sm p-12 text-center bg-white">
          <div className="inline-block animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full mb-3" />
          <p className="text-sm font-bold text-gray-600">Memuat bank soal Juz {selectedJuz}...</p>
        </Card>
      ) : questions.length === 0 ? (
        <Card className="rounded-2xl border-amber-200 shadow-sm p-8 text-center bg-amber-50/50">
          <AlertTriangle className="w-10 h-10 text-amber-600 mx-auto mb-2" />
          <h3 className="font-bold text-base text-amber-900">Belum Ada Soal di Juz {selectedJuz}</h3>
          <p className="text-xs text-amber-700 mt-1 max-w-md mx-auto">
            Bank soal untuk Juz {selectedJuz} belum diunggah ke database. Saat ini bank soal lengkap tersedia pada <strong>Juz 1, 28, 29, dan 30</strong>.
          </p>
        </Card>
      ) : mode === 'test' ? (
        /* INTERACTIVE TEST MODE */
        <div className="space-y-4">
          {/* Test Status Top Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                Soal {currentIndex + 1} dari {questions.length}
              </span>
              <span className="text-xs font-semibold text-gray-500">
                Juz {questions[currentIndex]?.juz_number} • Paket {questions[currentIndex]?.question_package}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold px-3 py-1 bg-gray-100 rounded-xl text-gray-700">
                <Clock className="w-3.5 h-3.5 text-gray-500" />
                <span>{formatTimer(elapsedTime)}</span>
              </div>

              <button
                type="button"
                onClick={() => setShowAnswerDirectly(!showAnswerDirectly)}
                className="px-2.5 py-1 text-xs font-bold rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 flex items-center gap-1"
                title="Buka/tutup kunci jawaban langsung untuk cek cepat"
              >
                {showAnswerDirectly ? <EyeOff className="w-3.5 h-3.5 text-emerald-600" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showAnswerDirectly ? 'Sembunyikan Kunci' : 'Intip Kunci'}</span>
              </button>

              <button
                type="button"
                onClick={resetTestState}
                className="px-2.5 py-1 text-xs font-bold rounded-lg text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Question Card */}
          {questions[currentIndex] && (
            <Card className="rounded-3xl border border-gray-100 shadow-lg bg-white overflow-hidden">
              <CardContent className="p-6 sm:p-8 space-y-6">
                <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <Badge variant="outline" className="bg-emerald-50/50 text-emerald-800 border-emerald-200 text-xs font-bold">
                    Kategori: {SECTION_LABELS[questions[currentIndex].section_number] || questions[currentIndex].section_title}
                  </Badge>
                  <span className="text-xs text-gray-400">ID: {questions[currentIndex].id.slice(0, 8)}</span>
                </div>

                {/* Ayat / Question Text */}
                <div className="bg-amber-50/40 border border-amber-100 rounded-2xl p-6 text-center space-y-3">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-amber-800 block">
                    Potongan Ayat / Soal
                  </span>
                  <p
                    className="text-2xl sm:text-3xl font-serif leading-loose text-gray-900"
                    dir="rtl"
                    style={{ fontFamily: 'var(--font-amiri, serif)' }}
                  >
                    {questions[currentIndex].question_text}
                  </p>
                </div>

                {/* Multiple Choice Options */}
                <div className="space-y-2.5">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                    Pilihan Jawaban (Klik untuk memilih):
                  </span>
                  <div className="grid grid-cols-1 gap-2.5">
                    {questions[currentIndex].options?.map((option, idx) => {
                      const optLabel = String.fromCharCode(65 + idx); // A, B, C, D
                      const isSelected = userAnswers[questions[currentIndex].id] === option.text;
                      const isCorrect = option.isCorrect;

                      let btnStyle = 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50';
                      if (isSelected) {
                        btnStyle = 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/30';
                      }

                      // If showing answer or after submission
                      if (showAnswerDirectly || isTestSubmitted) {
                        if (isCorrect) {
                          btnStyle = 'bg-green-100 border-green-500 text-green-950 font-bold';
                        } else if (isSelected && !isCorrect) {
                          btnStyle = 'bg-rose-100 border-rose-500 text-rose-950';
                        }
                      }

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectAnswer(questions[currentIndex].id, option.text)}
                          className={`w-full p-4 rounded-2xl border text-left flex items-start gap-3 transition-all ${btnStyle}`}
                        >
                          <span
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                              isSelected
                                ? 'bg-emerald-700 text-white'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {optLabel}
                          </span>
                          <span className="flex-1 text-sm leading-relaxed" dir="auto">
                            {option.text}
                          </span>
                          {(showAnswerDirectly || isTestSubmitted) && isCorrect && (
                            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                          )}
                          {(showAnswerDirectly || isTestSubmitted) && isSelected && !isCorrect && (
                            <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Navigasi Soal Sebelumnya / Selanjutnya */}
                <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                    className="px-4 py-2 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-200 disabled:opacity-40 transition-all flex items-center gap-1.5"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Sebelumnya</span>
                  </button>

                  <span className="text-xs font-semibold text-gray-400">
                    {currentIndex + 1} / {questions.length}
                  </span>

                  {currentIndex < questions.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                      className="px-4 py-2 bg-emerald-800 text-white font-bold text-xs rounded-xl hover:bg-emerald-900 transition-all flex items-center gap-1.5"
                    >
                      <span>Selanjutnya</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsTestSubmitted(true);
                        setShowAnswerDirectly(true);
                        toast.success('Simulasi ujian selesai! Nilai telah dihitung.');
                      }}
                      className="px-5 py-2 bg-green-600 text-white font-black text-xs rounded-xl hover:bg-green-700 transition-all shadow-md flex items-center gap-1.5"
                    >
                      <Award className="w-4 h-4" />
                      <span>Selesaikan Ujian</span>
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Test Submission Summary Banner */}
          {isTestSubmitted && (
            <Card className="rounded-3xl border-2 border-green-500 bg-white p-6 shadow-xl animate-fadeInUp">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center text-green-700 font-black text-xl shrink-0">
                    {scoreStats.percentage}%
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-gray-900">Hasil Simulasi Ujian</h3>
                    <p className="text-xs text-gray-500">
                      Benar: <strong className="text-green-600">{scoreStats.correct}</strong> dari{' '}
                      <strong>{scoreStats.total}</strong> soal • Waktu Pengerjaan:{' '}
                      <strong className="text-gray-800">{formatTimer(elapsedTime)}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={startTest}
                    className="px-4 py-2 bg-emerald-800 text-white text-xs font-bold rounded-xl hover:bg-emerald-900 transition-all"
                  >
                    Ulangi Tes
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('bank')}
                    className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-200 transition-all"
                  >
                    Kembali ke Bank Soal
                  </button>
                </div>
              </div>
            </Card>
          )}

          {/* Grid Nomor Soal Navigasi Cepat */}
          <div className="p-4 bg-white rounded-2xl border border-gray-100 space-y-2">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
              Lembar Navigasi Soal (Klik untuk loncat):
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const isAnswered = !!userAnswers[q.id];
                const correctOpt = q.options?.find((o) => o.isCorrect)?.text || q.correct_answer;
                const isCorrect = userAnswers[q.id] === correctOpt;

                let badgeColor = 'bg-gray-100 text-gray-600 hover:bg-gray-200';
                if (isCurrent) {
                  badgeColor = 'bg-emerald-800 text-white ring-2 ring-emerald-500/40';
                } else if (isTestSubmitted || showAnswerDirectly) {
                  badgeColor = isCorrect ? 'bg-green-100 text-green-800' : isAnswered ? 'bg-rose-100 text-rose-800' : 'bg-gray-100 text-gray-400';
                } else if (isAnswered) {
                  badgeColor = 'bg-emerald-100 text-emerald-900 font-bold';
                }

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${badgeColor}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* BANK SOAL & KUNCI JAWABAN AUDIT VIEW */
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-gray-500 px-1">
            <span>
              Menampilkan <strong>{filteredQuestions.length}</strong> butir soal audit
            </span>
            <span className="text-emerald-700 font-semibold">
              Kunci jawaban disorot hijau tebal secara otomatis
            </span>
          </div>

          <div className="space-y-3">
            {filteredQuestions.map((item, idx) => (
              <Card
                key={item.id}
                className="rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all bg-white overflow-hidden"
              >
                <CardContent className="p-5 sm:p-6 space-y-4">
                  {/* Top Header of Question */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-emerald-800 text-white font-bold flex items-center justify-center text-xs">
                        {idx + 1}
                      </span>
                      <Badge variant="outline" className="bg-gray-50 text-gray-700 text-[10px] font-bold">
                        {SECTION_LABELS[item.section_number] || item.section_title}
                      </Badge>
                      <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-bold">
                        Paket {item.question_package}
                      </Badge>
                    </div>

                    <span className="text-[11px] font-mono text-gray-400">ID: {item.id.slice(0, 8)}</span>
                  </div>

                  {/* Question Text in Arabic */}
                  <div className="p-4 bg-gray-50/70 rounded-xl">
                    <p
                      className="text-xl sm:text-2xl font-serif text-gray-900 text-right leading-loose"
                      dir="rtl"
                      style={{ fontFamily: 'var(--font-amiri, serif)' }}
                    >
                      {item.question_text}
                    </p>
                  </div>

                  {/* Options List with Highlighted Correct Answer */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {item.options?.map((opt, optIdx) => {
                      const isCorrect = opt.isCorrect;
                      const letter = String.fromCharCode(65 + optIdx);

                      return (
                        <div
                          key={optIdx}
                          className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                            isCorrect
                              ? 'bg-green-50/80 border-green-300 text-green-950 font-semibold'
                              : 'bg-white border-gray-100 text-gray-700'
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] shrink-0 ${
                              isCorrect ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {letter}
                          </span>
                          <span className="flex-1 leading-relaxed" dir="auto">
                            {opt.text}
                          </span>
                          {isCorrect && (
                            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
