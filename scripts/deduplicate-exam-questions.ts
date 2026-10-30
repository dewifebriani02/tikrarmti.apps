#!/usr/bin/env node
/**
 * scripts/deduplicate-exam-questions.ts
 *
 * MTI Exam Question AI & Heuristic Deduplication Utility
 * Detects and resolves duplicate questions across packages (A, B, Both) and within packages.
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
 * Normalizes text for comparison:
 * 1. Strips Arabic diacritics / tashkeel / quranic symbols
 * 2. Normalizes Arabic letter variants (alif, yaa, taa marbuta)
 * 3. Strips punctuation, Latin noise, and excess whitespace
 */
export function normalizeArabicText(text: string): string {
  if (!text) return '';
  return text
    // Remove Arabic diacritics (harakat), tanwin, sukun, shadda, Quranic marks
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    // Normalize alif variants to bare alif
    .replace(/[\u0625\u0623\u0622\u0671]/g, 'ا')
    // Normalize yaa & alif maqsura
    .replace(/[\u0649\u064a]/g, 'ي')
    // Normalize taa marbuta to haa
    .replace(/\u0629/g, 'ه')
    // Normalize common Latin prefix/suffix phrases in exam questions
    .replace(/terdapat pada halaman/gi, '')
    .replace(/ayat ini terletak pada surat/gi, '')
    .replace(/lanjutan ayat ini adalah/gi, '')
    // Remove punctuation & special characters
    .replace(/[^\w\s\u0600-\u06FF]/g, '')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
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
 * Optional Gemini AI semantic duplicate evaluator
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
      reason: 'GOOGLE_AI_API_KEY not configured, skipped AI verification'
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `Anda adalah auditor bank soal Al-Qur'an Markaz Tikrar Indonesia (MTI).
Evaluasi apakah kedua soal pilihan ganda berikut adalah DUPLIKAT (menanyakan ayat/hal yang sama persis walau mungkin ada perbedaan harakat/format):

Soal 1 (Paket ${q1.question_package}, Bagian ${q1.section_number}):
Teks: "${q1.question_text}"
Kunci Jawaban: "${q1.correct_answer || ''}"

Soal 2 (Paket ${q2.question_package}, Bagian ${q2.section_number}):
Teks: "${q2.question_text}"
Kunci Jawaban: "${q2.correct_answer || ''}"

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
 * Scans questions and detects all duplicates
 * By default, only scans active questions (is_active = true), ignoring archived ones.
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
  const attemptAnswers = attemptUsageRes.rows.map(r => r.answers_str);

  const getAttemptCount = (id: string) => {
    let count = 0;
    for (const str of attemptAnswers) {
      if (str.includes(id)) count++;
    }
    return count;
  };

  const duplicateGroups: DuplicateGroup[] = [];
  const processedIds = new Set<string>();

  // 1. Group by exact normalized text + juz_number + section_number
  const normalizedMap = new Map<string, QuestionRecord[]>();

  for (const q of questions) {
    const norm = normalizeArabicText(q.question_text);
    // Key by juz and normalized text
    const key = `${q.juz_number}::${norm}`;
    if (!normalizedMap.has(key)) {
      normalizedMap.set(key, []);
    }
    normalizedMap.get(key)!.push(q);
  }

  for (const [, qList] of Array.from(normalizedMap.entries())) {
    if (qList.length > 1) {
      // Find canonical: question with most student attempts, or earliest created
      const sorted = [...qList].sort((a, b) => {
        const attA = getAttemptCount(a.id);
        const attB = getAttemptCount(b.id);
        if (attB !== attA) return attB - attA; // higher attempts preferred
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      const canonical = sorted[0];
      const duplicates = sorted.slice(1);

      duplicates.forEach(d => processedIds.add(d.id));
      processedIds.add(canonical.id);

      const referencedInAttempts: Record<string, number> = {};
      referencedInAttempts[canonical.id] = getAttemptCount(canonical.id);
      duplicates.forEach(d => {
        referencedInAttempts[d.id] = getAttemptCount(d.id);
      });

      duplicateGroups.push({
        juz_number: canonical.juz_number,
        matchType: 'normalized',
        canonical,
        duplicates,
        confidence: 1.0,
        reason: `Teks soal identik secara fonetik/harakat antar paket (${qList.map(x => x.question_package).join(', ')})`,
        referencedInAttempts,
      });
    }
  }

  // 2. Fuzzy / Dice similarity for questions within the same Juz not already grouped
  const remaining = questions.filter(q => !processedIds.has(q.id));
  const juzGroups = new Map<number, QuestionRecord[]>();
  for (const q of remaining) {
    if (!juzGroups.has(q.juz_number)) juzGroups.set(q.juz_number, []);
    juzGroups.get(q.juz_number)!.push(q);
  }

  for (const [, jQuestions] of Array.from(juzGroups.entries())) {
    for (let i = 0; i < jQuestions.length; i++) {
      const q1 = jQuestions[i];
      if (processedIds.has(q1.id)) continue;

      const similarGroup: QuestionRecord[] = [];

      for (let j = i + 1; j < jQuestions.length; j++) {
        const q2 = jQuestions[j];
        if (processedIds.has(q2.id)) continue;

        const dice = calculateDiceSimilarity(q1.question_text, q2.question_text);
        if (dice >= 0.88) {
          // Strong heuristic match
          similarGroup.push(q2);
          processedIds.add(q2.id);
        } else if (options.useAi && dice >= 0.70) {
          // Ask Gemini AI for confirmation
          const aiRes = await evaluateWithAI(q1, q2);
          if (aiRes.isDuplicate && aiRes.confidence >= 0.8) {
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
        duplicates.forEach(d => {
          referencedInAttempts[d.id] = getAttemptCount(d.id);
        });

        duplicateGroups.push({
          juz_number: canonical.juz_number,
          matchType: options.useAi ? 'semantic' : 'normalized',
          canonical,
          duplicates,
          confidence: 0.92,
          reason: `Kemiripan teks tinggi (>88%) pada bagian ${canonical.section_number}`,
          referencedInAttempts,
        });
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
      const remapRes = await client.query(`
        UPDATE exam_attempts
        SET answers = replace(answers::text, $1, $2)::jsonb,
            updated_at = NOW()
        WHERE answers::text LIKE '%' || $1 || '%';
      `, [dupId, canonicalId]);

      remappedAttempts += remapRes.rowCount || 0;

      // 2. Either delete or archive the duplicate record
      if (mode === 'delete') {
        await client.query(`DELETE FROM exam_questions WHERE id = $1`, [dupId]);
      } else {
        await client.query(`UPDATE exam_questions SET is_active = false, updated_at = NOW() WHERE id = $1`, [dupId]);
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
  const isArchive = args.includes('--archive');
  const useAi = args.includes('--use-ai');
  const includeArchived = args.includes('--include-archived');
  const activeOnly = !includeArchived;
  const juzArg = args.find(a => a.startsWith('--juz='));
  const juz = juzArg ? parseInt(juzArg.split('=')[1], 10) : undefined;

  console.log('===============================================================');
  console.log('🔍 MTI EXAM QUESTION AI & HEURISTIC DEDUPLICATION UTILITY');
  console.log('===============================================================');
  console.log(`Mode: ${isApply ? (isDelete ? 'APPLY (HARD DELETE & REMAP)' : 'APPLY (ARCHIVE & REMAP)') : 'DRY RUN (AUDIT ONLY)'}`);
  console.log(`Filter Soal: ${activeOnly ? 'HANYA SOAL AKTIF (is_active = true, mengabaikan arsip)' : 'SEMUA SOAL (TERMASUK ARSIP)'}`);
  if (juz) console.log(`Filter Juz: ${juz}`);
  console.log(`AI Semantic Check: ${useAi ? 'ENABLED (Gemini)' : 'DISABLED (Deterministic NLP)'}`);
  console.log('---------------------------------------------------------------');

  const pool = new Pool({ connectionString: getDatabaseUrl() });
  const client = await pool.connect();

  try {
    const { groups, totalQuestions, totalDuplicateCount } = await detectDuplicates(client, { juz, useAi, activeOnly });

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
      console.log(`      ID: ${g.canonical.id} | Paket: ${g.canonical.question_package} | Bagian: ${g.canonical.section_number} | Q#: ${g.canonical.question_number}`);
      console.log(`      Teks: ${g.canonical.question_text.slice(0, 90)}...`);
      console.log(`      Kunci: ${g.canonical.correct_answer || '-'}`);
      console.log(`      Referensi Jawaban Siswa: ${g.referencedInAttempts[g.canonical.id] || 0}x`);

      g.duplicates.forEach(d => {
        console.log(`   🔴 DUPLIKAT (DIHAPUS/DIARSIPKAN):`);
        console.log(`      ID: ${d.id} | Paket: ${d.question_package} | Bagian: ${d.section_number} | Q#: ${d.question_number}`);
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
    console.log(`- Jumlah riwayat ujian santriwati yang di-remap secara aman: ${remappedAttempts}`);
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
