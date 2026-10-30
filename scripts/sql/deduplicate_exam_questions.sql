-- ==============================================================================
-- MARKAZ TIKRAR INDONESIA (MTI)
-- SQL SCRIPT: DETEKSI & DEDUPLIKASI BANK SOAL UJIAN (EXAM QUESTIONS)
-- ==============================================================================
-- Tujuan:
-- 1. Mendeteksi soal duplikat pada tabel exam_questions (baik dalam paket yang sama
--    maupun antar paket A, B, Both).
-- 2. Mempertahankan 1 soal kanonikal (yang sudah memiliki referensi riwayat ujian siswa
--    atau yang dibuat paling awal).
-- 3. Me-remap ID soal duplikat di kolom answers exam_attempts agar riwayat ujian aman.
-- 4. Menghapus / mengarsipkan soal duplikat redundan.
-- ==============================================================================

-- 1. PREVIEW: LIHAT DAFTAR SOAL DUPLIKAT (RUN INI DULU UNTUK INSPEKSI)
WITH normalized_questions AS (
  SELECT 
    id,
    juz_number,
    question_package,
    section_number,
    question_number,
    question_text,
    correct_answer,
    is_active,
    created_at,
    -- Normalisasi teks Arab: hilangkan harakat / tashkeel & spasi ganda
    regexp_replace(
      regexp_replace(
        regexp_replace(question_text, '[\u064B-\u065F\u0670\u06D6-\u06ED]', '', 'g'),
        '[إأآٱ]', 'ا', 'g'
      ),
      '\s+', ' ', 'g'
    ) AS norm_text
  FROM exam_questions
),
duplicate_candidates AS (
  SELECT 
    id,
    juz_number,
    question_package,
    section_number,
    question_number,
    question_text,
    correct_answer,
    is_active,
    created_at,
    norm_text,
    ROW_NUMBER() OVER (
      PARTITION BY juz_number, norm_text, COALESCE(correct_answer, '')
      ORDER BY is_active DESC, created_at ASC
    ) AS rank_order,
    FIRST_VALUE(id) OVER (
      PARTITION BY juz_number, norm_text, COALESCE(correct_answer, '')
      ORDER BY is_active DESC, created_at ASC
    ) AS canonical_id,
    COUNT(*) OVER (
      PARTITION BY juz_number, norm_text, COALESCE(correct_answer, '')
    ) AS total_in_group
  FROM normalized_questions
)
SELECT 
  juz_number,
  question_package,
  section_number,
  question_number,
  id,
  canonical_id,
  rank_order,
  CASE WHEN rank_order = 1 THEN 'KANONIKAL (DIPERTAHANKAN)' ELSE 'DUPLIKAT (DIHAPUS/ARSIP)' END AS status_aksi,
  substring(question_text from 1 for 80) AS cuplikan_soal,
  correct_answer
FROM duplicate_candidates
WHERE total_in_group > 1
ORDER BY juz_number, norm_text, rank_order;


-- ==============================================================================
-- 2. EKSEKUSI PEMBERSIHAN DENGAN TRANSAKSI AMAN
-- ==============================================================================
BEGIN;

-- Buat tabel temporer penampung pemetaan (duplicate_id -> canonical_id)
CREATE TEMP TABLE tmp_question_dups ON COMMIT DROP AS
WITH normalized_questions AS (
  SELECT 
    id,
    juz_number,
    question_package,
    section_number,
    question_number,
    question_text,
    correct_answer,
    is_active,
    created_at,
    regexp_replace(
      regexp_replace(
        regexp_replace(question_text, '[\u064B-\u065F\u0670\u06D6-\u06ED]', '', 'g'),
        '[إأآٱ]', 'ا', 'g'
      ),
      '\s+', ' ', 'g'
    ) AS norm_text
  FROM exam_questions
),
duplicate_ranking AS (
  SELECT 
    id,
    FIRST_VALUE(id) OVER (
      PARTITION BY juz_number, norm_text, COALESCE(correct_answer, '')
      ORDER BY is_active DESC, created_at ASC
    ) AS canonical_id,
    ROW_NUMBER() OVER (
      PARTITION BY juz_number, norm_text, COALESCE(correct_answer, '')
      ORDER BY is_active DESC, created_at ASC
    ) AS rank_order
  FROM normalized_questions
)
SELECT 
  id AS dup_id, 
  canonical_id 
FROM duplicate_ranking 
WHERE rank_order > 1;

-- Cek jumlah duplikat yang akan dieksekusi
SELECT count(*) AS total_soal_duplikat_ditemukan FROM tmp_question_dups;

-- Step A: Remap riwayat jawaban di exam_attempts jika ada ID duplikat yang pernah dijawab siswa
UPDATE exam_attempts a
SET 
  answers = replace(a.answers::text, m.dup_id::text, m.canonical_id::text)::jsonb,
  updated_at = NOW()
FROM tmp_question_dups m
WHERE a.answers::text LIKE '%' || m.dup_id::text || '%';

-- Step B: Hapus baris duplikat dari exam_questions
DELETE FROM exam_questions
WHERE id IN (SELECT dup_id FROM tmp_question_dups);

-- Step C: Verifikasi bahwa seluruh duplikasi telah bersih
SELECT 
  juz_number,
  question_package,
  count(*) as total_soal_aktif
FROM exam_questions
WHERE is_active = true
GROUP BY juz_number, question_package
ORDER BY juz_number, question_package;

COMMIT;
