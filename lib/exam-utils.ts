// Exam System Utility Functions
// Helper functions for determining required exam juz and eligibility

import { JuzNumber } from '@/types/exam';

/**
 * Determine which juz exam is required based on chosen juz
 *
 * Logic:
 * - Juz 30A/B → No exam required (starting target)
 * - Juz 29A/B → Must take Juz 30 exam
 * - Juz 28A/B → Must take Juz 29 exam
 * - Juz 1A/B → Must take Juz 30 exam
 * - Other juz → No exam required (null)
 */
export function getRequiredExamJuz(chosenJuz: string): JuzNumber | null {
  if (!chosenJuz) return null;

  // Extract juz number from format like "30A", "29B", etc.
  const juzNumber = parseInt(chosenJuz.match(/\d+/)?.[0] || '0');

  if (juzNumber === 30) {
    return null;
  }
  
  if (juzNumber === 1) {
    return 30; // For Juz 1, test Juz 30
  }
  
  if (juzNumber === 27) {
    return 28;
  }

  if (juzNumber >= 2 && juzNumber <= 26) {
    return (juzNumber - 1) as JuzNumber; // For forward memorizers
  }
  
  if (juzNumber === 28) {
    return 29; // For backward memorizers
  }
  
  if (juzNumber === 29) {
    return 30; // For backward memorizers
  }

  return null;
}

/**
 * Determine whether an exam should test only Half Juz (Package A) or Full Juz (Package A + Package B).
 * - Selection Exam (isFinalExam = false): always tests Full Juz (prerequisite juz: Package A + Package B).
 * - Final Exam (isFinalExam = true): if chosen_juz ends with 'A' (e.g. '30A', '29A', '1A', '2A', '27A'),
 *   tests only Package A; if it ends with 'B' (e.g. '30B', '29B', '28B', '1B') or has no A suffix,
 *   tests Full Juz (Package A + Package B).
 */
export function isHalfJuzFinalExam(chosenJuz?: string | null, isFinalExam = false): boolean {
  if (!isFinalExam) return false;
  return !!chosenJuz?.trim().toUpperCase().endsWith('A');
}

/**
 * Get configured Package A and Package B question quotas from exam_configurations row.
 * Defaults to 50 for Package A and 50 for Package B (total max 100 for full juz).
 */
export function getExamPackageQuotas(config?: {
  package_a_questions?: number | null;
  package_b_questions?: number | null;
  questions_per_attempt?: number | null;
} | null): { packageAQuota: number; packageBQuota: number } {
  const hasExplicitPackageQuotas =
    (config?.package_a_questions !== undefined && config?.package_a_questions !== null) ||
    (config?.package_b_questions !== undefined && config?.package_b_questions !== null);

  if (hasExplicitPackageQuotas) {
    const packageAQuota = Math.max(0, Number(config?.package_a_questions ?? 50));
    const packageBQuota = Math.max(0, Number(config?.package_b_questions ?? 50));
    return { packageAQuota, packageBQuota };
  }

  if (config?.questions_per_attempt && config.questions_per_attempt > 0) {
    const half = Math.floor(config.questions_per_attempt / 2);
    return {
      packageAQuota: config.questions_per_attempt - half,
      packageBQuota: half,
    };
  }

  return { packageAQuota: 50, packageBQuota: 50 };
}

/**
 * Distribute N questions evenly across sections (or sequentially if shuffle is disabled).
 */
export function distributeQuestionsBySection(
  allQuestions: any[],
  totalNeeded: number,
  shouldShuffle = true
): any[] {
  if (totalNeeded <= 0 || !allQuestions || allQuestions.length === 0) return [];
  if (allQuestions.length <= totalNeeded) {
    return shouldShuffle ? shuffleArray(allQuestions) : [...allQuestions];
  }

  if (!shouldShuffle) {
    return allQuestions.slice(0, totalNeeded);
  }

  // Group by section_number
  const bySection: Record<number, any[]> = {};
  for (const q of allQuestions) {
    const sec = q.section_number || 1;
    if (!bySection[sec]) bySection[sec] = [];
    bySection[sec].push(q);
  }

  const sectionKeys = Object.keys(bySection).map(Number).sort((a, b) => a - b);
  const numSections = sectionKeys.length;
  if (numSections === 0) return [];

  const basePerSection = Math.floor(totalNeeded / numSections);
  let remainder = totalNeeded % numSections;

  const selected: any[] = [];
  const overflow: any[] = [];

  for (const sec of sectionKeys) {
    const pool = shuffleArray(bySection[sec]);
    const needed = basePerSection + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;

    if (pool.length >= needed) {
      selected.push(...pool.slice(0, needed));
      overflow.push(...pool.slice(needed));
    } else {
      selected.push(...pool);
    }
  }

  // Fill any deficit from overflow
  const deficit = totalNeeded - selected.length;
  if (deficit > 0 && overflow.length > 0) {
    const extra = shuffleArray(overflow).slice(0, deficit);
    selected.push(...extra);
  }

  return shuffleArray(selected);
}

/**
 * Select exam questions according to package quota rules:
 * - Half Juz Final Exam (Paket A): up to packageAQuota questions from Package A (plus 'Both' if needed)
 * - Full Juz Exam (Ujian Seleksi & Ujian Akhir Paket B):
 *   up to packageAQuota questions from Package A + up to packageBQuota questions from Package B
 *   (max packageAQuota + packageBQuota questions, default 50 + 50 = 100).
 */
export function selectExamQuestionsByQuota(
  allJuzQuestions: any[],
  options: {
    chosenJuz?: string | null;
    isFinalExam: boolean;
    config?: {
      package_a_questions?: number | null;
      package_b_questions?: number | null;
      questions_per_attempt?: number | null;
      shuffle_questions?: boolean | null;
    } | null;
  }
): any[] {
  const { packageAQuota, packageBQuota } = getExamPackageQuotas(options.config);
  const shouldShuffle = options.config?.shuffle_questions ?? true;
  const halfJuzOnly = isHalfJuzFinalExam(options.chosenJuz, options.isFinalExam);

  const pkgAQuestions = allJuzQuestions.filter(
    (q) => (q.question_package || '').toUpperCase() === 'A'
  );
  const pkgBQuestions = allJuzQuestions.filter(
    (q) => (q.question_package || '').toUpperCase() === 'B'
  );
  const pkgBothQuestions = allJuzQuestions.filter(
    (q) => !['A', 'B'].includes((q.question_package || '').toUpperCase())
  );

  if (halfJuzOnly) {
    const poolA = [...pkgAQuestions, ...pkgBothQuestions];
    return distributeQuestionsBySection(poolA, packageAQuota, shouldShuffle);
  }

  // Full Juz (Ujian Seleksi & Ujian Akhir Paket B):
  // Take up to packageAQuota from Paket A and up to packageBQuota from Paket B
  const selectedA = distributeQuestionsBySection(pkgAQuestions, packageAQuota, shouldShuffle);
  const selectedB = distributeQuestionsBySection(pkgBQuestions, packageBQuota, shouldShuffle);

  let combined = [...selectedA, ...selectedB];
  const maxTotal = packageAQuota + packageBQuota;

  if (combined.length < maxTotal && pkgBothQuestions.length > 0) {
    const remainingNeeded = maxTotal - combined.length;
    const selectedBoth = distributeQuestionsBySection(pkgBothQuestions, remainingNeeded, shouldShuffle);
    combined = [...combined, ...selectedBoth];
  }

  return combined;
}

/**
 * Get exam title based on juz number
 */
export function getExamTitle(juzNumber: JuzNumber): string {
  return `Ikhtibar Juz ${juzNumber}`;
}

/**
 * Get exam description
 */
export function getExamDescription(juzNumber: JuzNumber): string {
  return `Ujian muroja'ah Juz ${juzNumber} - 100 soal pilihan ganda`;
}

/**
 * Check if exam is required for a chosen juz
 */
export function isExamRequired(chosenJuz: string): boolean {
  return getRequiredExamJuz(chosenJuz) !== null;
}

/**
 * Calculate exam score (percentage)
 */
export function calculateScore(correctAnswers: number, totalQuestions: number): number {
  if (totalQuestions === 0) return 0;
  return Math.round((correctAnswers / totalQuestions) * 100);
}

/**
 * Determine if exam is passed (can be customized)
 * Default: 60% passing grade
 */
export function isExamPassed(score: number, passingGrade: number = 60): boolean {
  return score >= passingGrade;
}

/**
 * Get score grade letter
 */
export function getScoreGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'E';
}

/**
 * Get score color for UI
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 70) return 'text-blue-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * Get score background color for UI
 */
export function getScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-green-50 border-green-200';
  if (score >= 70) return 'bg-blue-50 border-blue-200';
  if (score >= 60) return 'bg-yellow-50 border-yellow-200';
  return 'bg-red-50 border-red-200';
}

/**
 * Format time elapsed (seconds to readable format)
 */
export function formatTimeElapsed(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours} jam ${minutes} menit`;
  } else if (minutes > 0) {
    return `${minutes} menit ${secs} detik`;
  } else {
    return `${secs} detik`;
  }
}

/**
 * Shuffle array (for randomizing questions/options if needed)
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Validate exam answers before submission
 */
export function validateExamAnswers(
  answers: Map<string, string>,
  totalQuestions: number
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (answers.size === 0) {
    errors.push('Belum ada jawaban yang diisi');
  }

  if (answers.size < totalQuestions) {
    const unanswered = totalQuestions - answers.size;
    errors.push(`Masih ada ${unanswered} soal yang belum dijawab`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get section titles (based on Juz 30 example)
 */
export const EXAM_SECTIONS = {
  1: 'Ketentuan Ikhtibar',
  2: 'Tebak Nama Surat',
  3: 'Tebak Ayat',
  4: 'Sambung Surat',
  5: 'Tebak Awal Ayat',
  6: 'Ayat Mutasyabihat',
  7: 'Pengenalan Surat',
  8: 'Tebak Halaman',
} as const;

/**
 * Get exam instructions
 */
export function getExamInstructions(juzNumber: JuzNumber): string {
  return `
Bismillah...

Apakah *Ukhti* siap mengerjakan soal muroja'ah Juz ${juzNumber} dengan jujur karena Allah, tanpa melihat Al-Qur'an, HP, Google, atau bertanya kepada teman, saudara, Mama, Papa, ChatGPT, Gemini, Siri, atau siapapun yang dapat membuat hasil ujian ini menjadi tidak valid?

**Kisi-Kisi Soal:**
- Urutan surat
- Awal dan akhir surat
- Ayat-ayat mutasyabihat
- Tebak ayat
- Tebak surat
- Sambung ayat
- Tebak halaman

Tafaddhol, silakan muroja'ah terlebih dahulu..

Kami serahkan persaksian kejujuran menjawab soal-soal ini kepada Allah Asy-Syahid yang Maha Menyaksikan.

Semoga Allah mudahkan, Baarakallahu Fiikunn

**"Tak ada gading yang tak retak."**

Jika *Ukhti* menemukan kesalahan dalam kunci jawaban atau pengetikan, silakan gunakan tombol **Flag** pada soal yang bermasalah.

🚩 **TANBIH**

Protes kesalahan kunci jawaban hanya jika *Ukhti* punya bukti Screenshot saja, setelah selesai submit dan cek Al Quran.

Mohon maaf kami tidak melayani protes saat mengerjakan soal atau setelah mengerjakan soal tanpa bukti kesalahan kami.
  `.trim();
}
