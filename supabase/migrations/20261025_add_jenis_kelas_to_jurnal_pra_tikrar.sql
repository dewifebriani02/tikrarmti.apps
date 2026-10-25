-- Migration: Add jenis_kelas and complementary fields to jurnal_pra_tikrar
-- Sesuai format dropdown bimbingan Pra-Tikrar:
-- 1. jenis_kelas: Kurikulum / metode tahsin (Tahsin Juz 30, Makharijul Huruf, Talaqqi Zoom, dsb)
-- 2. jenis_kelas_custom: Teks manual jika memilih 'lainnya'
-- 3. asal_bimbingan: 'internal_mti' (23 Sesi Zoom MTI) atau 'eksternal_luar'
-- 4. kategori_kelas: 'umum' (halaqah terbuka) atau 'privat' (1-on-1 / kelompok intensif)

ALTER TABLE public.jurnal_pra_tikrar 
ADD COLUMN IF NOT EXISTS jenis_kelas TEXT DEFAULT 'tahsin_juz30',
ADD COLUMN IF NOT EXISTS jenis_kelas_custom TEXT,
ADD COLUMN IF NOT EXISTS asal_bimbingan TEXT DEFAULT 'internal_mti',
ADD COLUMN IF NOT EXISTS kategori_kelas TEXT DEFAULT 'umum';

-- Update existing rows if any
UPDATE public.jurnal_pra_tikrar
SET jenis_kelas = 'tahsin_juz30'
WHERE jenis_kelas IS NULL;

UPDATE public.jurnal_pra_tikrar
SET asal_bimbingan = 'internal_mti'
WHERE asal_bimbingan IS NULL;

UPDATE public.jurnal_pra_tikrar
SET kategori_kelas = 'umum'
WHERE kategori_kelas IS NULL;
