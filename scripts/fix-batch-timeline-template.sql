-- Template untuk mengisi timeline dates untuk batch yang kosong
-- GANTI <BATCH_ID> dengan ID batch yang tidak memiliki timeline

-- Contoh: Untuk batch 2026
-- Sesuaikan tanggal sesuai kebutuhan program Anda

UPDATE public.batches
SET
  -- Phase 1: Pendaftaran
  registration_start_date = '2025-12-20',
  registration_end_date = '2026-01-10',

  -- Phase 2: Seleksi
  selection_start_date = '2026-01-06',
  selection_end_date = '2026-01-15',
  selection_result_date = '2026-01-17',

  -- Phase 3: Daftar Ulang
  re_enrollment_date = '2026-01-18',

  -- Phase 4: Opening Class
  opening_class_date = '2026-01-25',

  -- Phase 5: Pekan 1 (Tashih)
  first_week_start_date = '2026-01-26',
  first_week_end_date = '2026-02-01',

  -- Phase 6-7: Pekan 2-11 (Pembelajaran)
  -- Dihitung dari first_week_end_date + 1 hari sampai review_week_start_date - 1 hari

  -- Phase 8: Pekan 12 (Muraja'ah)
  review_week_start_date = '2026-04-06',
  review_week_end_date = '2026-04-12',

  -- Phase 9: Pekan 13 (Ujian Akhir)
  final_exam_start_date = '2026-04-13',
  final_exam_end_date = '2026-04-19',

  -- Phase 10: Kelulusan & Syahadah
  graduation_start_date = '2026-04-20',
  graduation_end_date = '2026-04-26'
WHERE id = '<BATCH_ID>'; -- Ganti dengan batch_id yang sebenarnya

-- Cek hasil update
SELECT id, name,
  registration_start_date,
  selection_start_date,
  re_enrollment_date,
  opening_class_date
FROM public.batches
WHERE id = '<BATCH_ID>';
