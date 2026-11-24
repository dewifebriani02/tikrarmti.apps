#!/usr/bin/env node
/**
 * scripts/deduplicate-exam-questions.ts
 *
 * MTI Exam Question Safe Deduplication Utility
 * Detects and resolves TRUE duplicate questions strictly within the same (juz_number, question_package).
 * Never deduplicates across different packages (e.g. Paket A vs Paket B) and never uses blind fuzzy
 * text similarity without matching options & answers (preventing false positives on template prompts
 * like "Ayat yang terdapat pada surat ..." or "Setelah surat ...").
 * Only scans active questions (is_active = true) by default, ignoring archived questions.
 *
 * Usage:
 *   npx tsx scripts/deduplicate-exam-questions.ts --dry-run
 *   npx tsx scripts/deduplicate-exam-questions.ts --apply --delete
 *   npx tsx scripts/deduplicate-exam-questions.ts --apply --archive
 *   npx tsx scripts/deduplicate-exam-questions.ts --juz=30 --dry-run
 */

import fs from 'fs';
import path from 'path';
import { Pool, PoolClient } from 'pg';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Load environment variables natively (zero dependency)
const envPaths = ['.env.local', '.env'];
for (const p of envPaths) {
  const fullPath = path.resolve(process.cwd(), p);
  if (fs.existsSync(fullPath)) {
    const lines = fs.readFileSync(fullPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const idx = trimmed.indexOf('=');
        const k = trimmed.slice(0, idx).trim();
        const v = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
        if (!process.env[k]) process.env[k] = v;
      }
    }
    break;
  }
}

// Ensure database connection
function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('❌ Error: DATABASE_URL is not set in environment or .env.local');
    process.exit(1);
  }
  return url;
}

export interface QuestionRecord {
  id: string;
  juz_number: number;
  juz_code?: string | null;
  question_package: string;
  section_number: number;
  section_title: string;
  question_number: number;
  question_text: string;
  question_type: string;
  options: Array<{ text: string; isCorrect: boolean }>;
  correct_answer?: string | null;
  points: number;
  is_active: boolean;
  created_at: string;
}

export interface DuplicateGroup {
  juz_number: number;
  matchType: 'exact' | 'normalized' | 'semantic';
  canonical: QuestionRecord;
  duplicates: QuestionRecord[];
  confidence: number;
  reason: string;
  referencedInAttempts: Record<string, number>;
}

/**
 * Normalizes Arabic & Latin text for exact semantic comparison while PRESERVING
 * instructional phrases ("terdapat pada halaman", "terletak pada surat", "awal surat",
 * "lanjutan ayat", "setelah surat ...") so different question types on the same verse
 * NEVER collide.
 */
export function normalizeArabicText(text: string): string {
  if (!text) return '';
  return text
    // Remove Arabic diacritics (harakat), tanwin, sukun, shadda, Quranic marks, tatweel
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640\u08F0-\u08FF]/g, '')
    // Normalize alif variants to bare alif
    .replace(/[\u0625\u0623\u0622\u0671]/g, 'ا')
    // Normalize yaa & alif maqsura
    .replace(/[\u0649\u064a]/g, 'ي')
    // Normalize taa marbuta to haa
    .replace(/\u0629/g, 'ه')
    // Normalize hamza carriers
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    // Remove punctuation & special characters (keep Latin letters/digits, Arabic letters, whitespace)
    .replace(/[^\w\s\u0600-\u06FF]/g, ' ')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Builds a canonical signature from a question's options list and correct answer.
 * Two questions with identical prompts (e.g. "Ayat yang terdapat pada surat Al-Mulk")
 * but different verse options will produce completely different signatures.
 */
export function buildOptionsSignature(q: QuestionRecord): {
  optionsKey: string;
  answerKey: string;
  normalizedOptions: string[];
} {
  const rawOptions = Array.isArray(q.options) ? q.options : [];
  const normalizedOptions = rawOptions
    .map((o) => normalizeArabicText(o?.text || ''))
    .filter(Boolean)
    .sort();
  const optionsKey = normalizedOptions.join('||');
  const answerKey = normalizeArabicText(
    q.correct_answer || rawOptions.find((o) => o?.isCorrect)?.text || ''
  );
  return { optionsKey, answerKey, normalizedOptions };
}

/**
 * Checks whether two questions share the same normalized options set AND correct answer.
 */
export function hasMatchingOptionsAndAnswer(q1: QuestionRecord, q2: QuestionRecord): boolean {
  const sig1 = buildOptionsSignature(q1);
  const sig2 = buildOptionsSignature(q2);

  if (!sig1.answerKey || !sig2.answerKey) return false;
  if (sig1.answerKey !== sig2.answerKey) return false;

  if (sig1.optionsKey && sig2.optionsKey && sig1.optionsKey === sig2.optionsKey) {
    return true;
  }

  // Require strong overlap on options as well so differing option sets are not merged blindly
  if (sig1.normalizedOptions.length === 0 || sig2.normalizedOptions.length === 0) {
    return false;
  }
  const set1 = new Set(sig1.normalizedOptions);
  const overlap = sig2.normalizedOptions.filter((opt) => set1.has(opt)).length;
  const maxLen = Math.max(sig1.normalizedOptions.length, sig2.normalizedOptions.length);
  return overlap / maxLen >= 0.75;
}

/**
 * Calculate bigram Dice similarity coefficient between two strings (0.0 to 1.0)
 */
export function calculateDiceSimilarity(str1: string, str2: string): number {
  const s1 = normalizeArabicText(str1);
  const s2 = normalizeArabicText(str2);
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1.0;
  if (s1.length < 2 || s2.length < 2) return 0;

  const getBigrams = (str: string) => {
    const bigrams = new Map<string, number>();
    for (let i = 0; i < str.length - 1; i++) {
      const bg = str.slice(i, i + 2);
      bigrams.set(bg, (bigrams.get(bg) || 0) + 1);
    }
    return bigrams;
  };

  const b1 = getBigrams(s1);
  const b2 = getBigrams(s2);
  let intersection = 0;

  for (const [bg, count1] of Array.from(b1.entries())) {
    const count2 = b2.get(bg) || 0;
    intersection += Math.min(count1, count2);
  }

  const total = (s1.length - 1) + (s2.length - 1);
  return total > 0 ? (2 * intersection) / total : 0;
}

/**
 * Optional Gemini AI semantic duplicate evaluator (only called for same-package pairs
 * that ALSO share matching options/answers).
 */
export async function evaluateWithAI(
  q1: QuestionRecord,
  q2: QuestionRecord
): Promise<{ isDuplicate: boolean; confidence: number; reason: string }> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return {
      isDuplicate: false,
      confidence: 0,
      reason: 'GOOGLE_AI_API_KEY not configured, skipped AI verification',
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const opts1 = (q1.options || []).map((o) => o.text).join(' | ');
    const opts2 = (q2.options || []).map((o) => o.text).join(' | ');
    const prompt = `Anda adalah auditor bank soal Al-Qur'an Markaz Tikrar Indonesia (MTI).
Evaluasi apakah kedua soal pilihan ganda dalam PAKET YANG SAMA berikut adalah DUPLIKAT SEJATI (menanyakan ayat/hal yang sama persis beserta opsi dan kunci jawaban yang sama):

Soal 1 (Juz ${q1.juz_number}${q1.question_package}, Bagian ${q1.section_number}):
Teks: "${q1.question_text}"
Pilihan: "${opts1}"
Kunci Jawaban: "${q1.correct_answer || ''}"

Soal 2 (Juz ${q2.juz_number}${q2.question_package}, Bagian ${q2.section_number}):
Teks: "${q2.question_text}"
Pilihan: "${opts2}"
Kunci Jawaban: "${q2.correct_answer || ''}"

Penting: Jika teks pertanyaan mirip tetapi menanyakan surat/ayat/pilihan jawaban yang BERBEDA, maka BUKAN duplikat (isDuplicate: false).
Format JSON output persis:
{
  "isDuplicate": true | false,
  "confidence": 0.0 - 1.0,
  "reason": "Penjelasan singkat"
}`;

    const res = await model.generateContent(prompt);
    const text = res.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (err: any) {
    console.warn(`[AI Warning] Failed to evaluate with Gemini: ${err.message}`);
  }

  return { isDuplicate: false, confidence: 0, reason: 'AI parsing failed' };
}

/**
 * Scans questions and detects TRUE duplicates safely:
 * 1. Strictly scoped to the SAME (juz_number, question_package) — never merges Paket A with Paket B.
 * 2. Requires BOTH identical normalized question text AND identical normalized options & correct answer.
 * 3. No blind fuzzy (Dice >= 0.88) auto-deletion. Optional Gemini AI check only inspects
 *    same-package pairs whose options & correct answer already match.
 * 4. By default, only scans active questions (is_active = true), ignoring archived ones.
 */
export async function detectDuplicates(
  client: Pool | PoolClient,
  options: { juz?: number; useAi?: boolean; activeOnly?: boolean } = {}
): Promise<{ groups: DuplicateGroup[]; totalQuestions: number; totalDuplicateCount: number }> {
  const activeOnly = options.activeOnly !== false;

  let queryStr = `
    SELECT id, juz_number, juz_code, question_package, section_number, section_title,
           question_number, question_text, question_type, options, correct_answer,
           points, is_active, created_at
    FROM exam_questions
    WHERE 1=1
  `;
  const params: any[] = [];
  if (activeOnly) {
    queryStr += ` AND is_active = true`;
  }
  if (options.juz) {
    params.push(options.juz);
    queryStr += ` AND juz_number = $${params.length}`;
  }
  queryStr += ` ORDER BY juz_number, question_package, section_number, question_number, created_at ASC`;

  const { rows: questions } = await client.query(queryStr, params);

  // Check attempt usage for all questions
  const attemptUsageRes = await client.query(`
    SELECT answers::text as answers_str FROM exam_attempts WHERE answers IS NOT NULL;
  `);
  const attemptAnswers = attemptUsageRes.rows.map((r) => r.answers_str);

  const getAttemptCount = (id: string) => {
    let count = 0;
    for (const str of attemptAnswers) {
      if (str.includes(id)) count++;
    }
    return count;
  };

  const duplicateGroups: DuplicateGroup[] = [];
  const processedIds = new Set<string>();

  // 1. Exact/Normalized grouping strictly within SAME (juz_number, question_package)
  //    AND requiring identical normalized prompt + options + correct_answer.
  const exactMap = new Map<string, QuestionRecord[]>();

  for (const q of questions) {
    const pkg = (q.question_package || '').toUpperCase();
    const normPrompt = normalizeArabicText(q.question_text);
    const { optionsKey, answerKey } = buildOptionsSignature(q);

    // Key requires same Juz, same Package, same normalized prompt, same options, AND same answer
    const key = `${q.juz_number}::${pkg}::${normPrompt}::${optionsKey}::${answerKey}`;
    if (!exactMap.has(key)) {
      exactMap.set(key, []);
    }
    exactMap.get(key)!.push(q);
  }

  for (const [, qList] of Array.from(exactMap.entries())) {
    if (qList.length > 1) {
      const sorted = [...qList].sort((a, b) => {
        const attA = getAttemptCount(a.id);
        const attB = getAttemptCount(b.id);
        if (attB !== attA) return attB - attA; // higher attempts preferred
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      const canonical = sorted[0];
      const duplicates = sorted.slice(1);

      const isExactRaw = duplicates.every(
        (d) =>
          d.question_text.trim() === canonical.question_text.trim() &&
          (d.correct_answer || '').trim() === (canonical.correct_answer || '').trim()
      );

      duplicates.forEach((d) => processedIds.add(d.id));
      processedIds.add(canonical.id);

      const referencedInAttempts: Record<string, number> = {};
      referencedInAttempts[canonical.id] = getAttemptCount(canonical.id);
      duplicates.forEach((d) => {
        referencedInAttempts[d.id] = getAttemptCount(d.id);
      });

      duplicateGroups.push({
        juz_number: canonical.juz_number,
        matchType: isExactRaw ? 'exact' : 'normalized',
        canonical,
        duplicates,
        confidence: 1.0,
        reason: `Teks soal, pilihan jawaban, dan kunci jawaban identik dalam paket ${canonical.juz_number}${canonical.question_package}`,
        referencedInAttempts,
      });
    }
  }

  // 2. Optional AI Semantic verification strictly within SAME (juz_number, question_package)
  //    ONLY for pairs that ALSO have matching options & correct answer (never blind fuzzy matching!).
  if (options.useAi) {
    const remaining = questions.filter((q) => !processedIds.has(q.id));
    const pkgGroups = new Map<string, QuestionRecord[]>();
    for (const q of remaining) {
      const pkgKey = `${q.juz_number}::${(q.question_package || '').toUpperCase()}`;
      if (!pkgGroups.has(pkgKey)) pkgGroups.set(pkgKey, []);
      pkgGroups.get(pkgKey)!.push(q);
    }

    for (const [, pQuestions] of Array.from(pkgGroups.entries())) {
      for (let i = 0; i < pQuestions.length; i++) {
        const q1 = pQuestions[i];
        if (processedIds.has(q1.id)) continue;

        const similarGroup: QuestionRecord[] = [];

        for (let j = i + 1; j < pQuestions.length; j++) {
          const q2 = pQuestions[j];
          if (processedIds.has(q2.id)) continue;

          // Must share matching options & correct answer before even considering AI verification
          if (!hasMatchingOptionsAndAnswer(q1, q2)) continue;

          const dice = calculateDiceSimilarity(q1.question_text, q2.question_text);
          if (dice >= 0.85) {
            const aiRes = await evaluateWithAI(q1, q2);
            if (aiRes.isDuplicate && aiRes.confidence >= 0.9) {
              similarGroup.push(q2);
              processedIds.add(q2.id);
            }
          }
        }

        if (similarGroup.length > 0) {
          processedIds.add(q1.id);
          const allItems = [q1, ...similarGroup];
          allItems.sort((a, b) => {
            const attA = getAttemptCount(a.id);
            const attB = getAttemptCount(b.id);
            if (attB !== attA) return attB - attA;
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          });

          const canonical = allItems[0];
          const duplicates = allItems.slice(1);

          const referencedInAttempts: Record<string, number> = {};
          referencedInAttempts[canonical.id] = getAttemptCount(canonical.id);
          duplicates.forEach((d) => {
            referencedInAttempts[d.id] = getAttemptCount(d.id);
          });

          duplicateGroups.push({
            juz_number: canonical.juz_number,
            matchType: 'semantic',
            canonical,
            duplicates,
            confidence: 0.95,
            reason: `Duplikat terverifikasi AI (opsi & kunci identik dalam paket ${canonical.juz_number}${canonical.question_package})`,
            referencedInAttempts,
          });
        }
      }
    }
  }

  const totalDuplicateCount = duplicateGroups.reduce((acc, g) => acc + g.duplicates.length, 0);

  return {
    groups: duplicateGroups,
    totalQuestions: questions.length,
    totalDuplicateCount,
  };
}

/**
 * Resolves duplicates by updating attempt references and either archiving or deleting duplicates
 */
export async function resolveDuplicates(
  client: PoolClient,
  groups: DuplicateGroup[],
  mode: 'archive' | 'delete'
): Promise<{ resolvedCount: number; remappedAttempts: number }> {
  let resolvedCount = 0;
  let remappedAttempts = 0;

  for (const group of groups) {
    const canonicalId = group.canonical.id;

    for (const dup of group.duplicates) {
      const dupId = dup.id;

      // 1. Remap duplicate questionId in exam_attempts answers
      const remapRes = await client.query(
        `
        UPDATE exam_attempts
        SET answers = replace(answers::text, $1, $2)::jsonb,
            updated_at = NOW()
        WHERE answers::text LIKE '%' || $1 || '%';
      `,
        [dupId, canonicalId]
      );

      remappedAttempts += remapRes.rowCount || 0;

      // 2. Either delete or archive the duplicate record
      if (mode === 'delete') {
        await client.query(`DELETE FROM exam_questions WHERE id = $1`, [dupId]);
      } else {
        await client.query(
          `UPDATE exam_questions SET is_active = false, updated_at = NOW() WHERE id = $1`,
          [dupId]
        );
      }

      resolvedCount++;
    }
  }

  return { resolvedCount, remappedAttempts };
}

// CLI Execution entrypoint
async function main() {
  const args = process.argv.slice(2);
  const isApply = args.includes('--apply');
  const isDelete = args.includes('--delete');
  const useAi = args.includes('--use-ai');
  const includeArchived = args.includes('--include-archived');
  const activeOnly = !includeArchived;
  const juzArg = args.find((a) => a.startsWith('--juz='));
  const juz = juzArg ? parseInt(juzArg.split('=')[1], 10) : undefined;

  console.log('===============================================================');
  console.log('🔍 MTI EXAM QUESTION SAFE DEDUPLICATION UTILITY');
  console.log('===============================================================');
  console.log(
    `Mode: ${isApply ? (isDelete ? 'APPLY (HARD DELETE & REMAP)' : 'APPLY (ARCHIVE & REMAP)') : 'DRY RUN (AUDIT ONLY)'}`
  );
  console.log(
    `Filter Soal: ${activeOnly ? 'HANYA SOAL AKTIF (is_active = true, mengabaikan arsip)' : 'SEMUA SOAL (TERMASUK ARSIP)'}`
  );
  console.log(`Cakupan: Ketat per Paket (juz_number + question_package) & cocok Teks + Opsi + Kunci`);
  if (juz) console.log(`Filter Juz: ${juz}`);
  console.log(`AI Semantic Check: ${useAi ? 'ENABLED (Gemini)' : 'DISABLED (Deterministic Exact+Normalized)'}`);
  console.log('---------------------------------------------------------------');

  const pool = new Pool({ connectionString: getDatabaseUrl() });
  const client = await pool.connect();

  try {
    const { groups, totalQuestions, totalDuplicateCount } = await detectDuplicates(client, {
      juz,
      useAi,
      activeOnly,
    });

    console.log(`\n📊 Scan Complete:`);
    console.log(`- Total Soal Diperiksa: ${totalQuestions}`);
    console.log(`- Total Grup Duplikasi Ditemukan: ${groups.length}`);
    console.log(`- Total Soal Duplikat Redundan: ${totalDuplicateCount}`);

    if (groups.length === 0) {
      console.log('\n✅ Tidak ditemukan duplikasi soal ujian. Bank soal bersih dan optimal.');
      return;
    }

    console.log('\n📋 Rincian Temuan Duplikasi:');
    groups.forEach((g, idx) => {
      console.log(`\n[#${idx + 1}] Juz ${g.juz_number} (Tipe: ${g.matchType.toUpperCase()}) - ${g.reason}`);
      console.log(`   🟢 CANONICAL (DIPERTAHANKAN):`);
      console.log(
        `      ID: ${g.canonical.id} | Paket: ${g.canonical.question_package} | Bagian: ${g.canonical.section_number} | Q#: ${g.canonical.question_number}`
      );
      console.log(`      Teks: ${g.canonical.question_text.slice(0, 90)}...`);
      console.log(`      Kunci: ${g.canonical.correct_answer || '-'}`);
      console.log(`      Referensi Jawaban Siswa: ${g.referencedInAttempts[g.canonical.id] || 0}x`);

      g.duplicates.forEach((d) => {
        console.log(`   🔴 DUPLIKAT (DIHAPUS/DIARSIPKAN):`);
        console.log(
          `      ID: ${d.id} | Paket: ${d.question_package} | Bagian: ${d.section_number} | Q#: ${d.question_number}`
        );
        console.log(`      Referensi Jawaban Siswa: ${g.referencedInAttempts[d.id] || 0}x`);
      });
    });

    if (!isApply) {
      console.log('\n---------------------------------------------------------------');
      console.log('💡 Ini adalah simulasi (Dry Run). Tidak ada data yang diubah.');
      console.log('Untuk mengeksekusi penghapusan aman & sinkronisasi riwayat ujian:');
      console.log('   npx tsx scripts/deduplicate-exam-questions.ts --apply --delete');
      console.log('Atau untuk mengarsipkan tanpa menghapus:');
      console.log('   npx tsx scripts/deduplicate-exam-questions.ts --apply --archive');
      console.log('===============================================================');
      return;
    }

    // Apply changes inside a transaction
    console.log('\n⏳ Menjalankan proses deduplikasi...');
    await client.query('BEGIN');
    const { resolvedCount, remappedAttempts } = await resolveDuplicates(
      client,
      groups,
      isDelete ? 'delete' : 'archive'
    );
    await client.query('COMMIT');

    console.log('\n===============================================================');
    console.log('🎉 PROSES DEDUPLIKASI BERHASIL!');
    console.log(`- Jumlah soal duplikat yang di-${isDelete ? 'hapus' : 'arsipkan'}: ${resolvedCount}`);
    console.log(`- Jumlah riwayat ujian thalibah yang di-remap secara aman: ${remappedAttempts}`);
    console.log('===============================================================');
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('❌ Terjadi kesalahan:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  main().catch(console.error);
}
