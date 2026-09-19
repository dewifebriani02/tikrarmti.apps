-- ==============================================================================
-- MIGRATE SUPABASE STORAGE URLS TO LOCAL VPS UPLOADS URL
-- ==============================================================================

BEGIN;

-- 1. Pendaftaran Tikrar Tahfidz (Audio Rekaman Seleksi)
UPDATE public.pendaftaran_tikrar_tahfidz
SET oral_submission_url = REPLACE(oral_submission_url, 'https://nmbvklixthlqtkkgqnjl.supabase.co/storage/v1/object/public/', 'https://markaztikrar.id/uploads/')
WHERE oral_submission_url LIKE '%supabase.co%';

UPDATE public.pendaftaran_tikrar_tahfidz
SET oral_assessment_audio_url = REPLACE(oral_assessment_audio_url, 'https://nmbvklixthlqtkkgqnjl.supabase.co/storage/v1/object/public/', 'https://markaztikrar.id/uploads/')
WHERE oral_assessment_audio_url LIKE '%supabase.co%';

-- 2. Daftar Ulang Submissions (Akad & Dokumen)
UPDATE public.daftar_ulang_submissions
SET akad_url = REPLACE(akad_url, 'https://nmbvklixthlqtkkgqnjl.supabase.co/storage/v1/object/public/', 'https://markaztikrar.id/uploads/')
WHERE akad_url LIKE '%supabase.co%';

UPDATE public.daftar_ulang_submissions
SET akad_files = REPLACE(akad_files::text, 'https://nmbvklixthlqtkkgqnjl.supabase.co/storage/v1/object/public/', 'https://markaztikrar.id/uploads/')::jsonb
WHERE akad_files::text LIKE '%supabase.co%';

-- 3. Jurnal Records (Screenshot Tarteel)
UPDATE public.jurnal_records
SET tarteel_screenshot_url = REPLACE(tarteel_screenshot_url, 'https://nmbvklixthlqtkkgqnjl.supabase.co/storage/v1/object/public/', 'https://markaztikrar.id/uploads/')
WHERE tarteel_screenshot_url LIKE '%supabase.co%';

-- 4. Users (Avatar & Image)
UPDATE public.users
SET avatar_url = REPLACE(avatar_url, 'https://nmbvklixthlqtkkgqnjl.supabase.co/storage/v1/object/public/', 'https://markaztikrar.id/uploads/')
WHERE avatar_url LIKE '%supabase.co%';

UPDATE public.users
SET image = REPLACE(image, 'https://nmbvklixthlqtkkgqnjl.supabase.co/storage/v1/object/public/', 'https://markaztikrar.id/uploads/')
WHERE image LIKE '%supabase.co%';

-- 5. Donations
UPDATE public.donations
SET proof_url = REPLACE(proof_url, 'https://nmbvklixthlqtkkgqnjl.supabase.co/storage/v1/object/public/', 'https://markaztikrar.id/uploads/')
WHERE proof_url LIKE '%supabase.co%';

-- 6. Testimonials
UPDATE public.testimonials
SET video_url = REPLACE(video_url, 'https://nmbvklixthlqtkkgqnjl.supabase.co/storage/v1/object/public/', 'https://markaztikrar.id/uploads/')
WHERE video_url LIKE '%supabase.co%';

COMMIT;
