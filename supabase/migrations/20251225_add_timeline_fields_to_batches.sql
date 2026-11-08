-- ============================================================================
-- Add Timeline Phase Fields to Batches Table
-- ============================================================================
-- Purpose: Add timeline phase date fields to make perjalanan-saya page dynamic
-- Date: 2025-12-25
-- ============================================================================

-- Add timeline phase date fields
ALTER TABLE public.batches
ADD COLUMN IF NOT EXISTS selection_start_date DATE,
ADD COLUMN IF NOT EXISTS selection_end_date DATE,
ADD COLUMN IF NOT EXISTS selection_result_date DATE,
ADD COLUMN IF NOT EXISTS re_enrollment_date DATE,
ADD COLUMN IF NOT EXISTS opening_class_date DATE,
ADD COLUMN IF NOT EXISTS first_week_start_date DATE,
ADD COLUMN IF NOT EXISTS first_week_end_date DATE,
ADD COLUMN IF NOT EXISTS review_week_start_date DATE,
ADD COLUMN IF NOT EXISTS review_week_end_date DATE,
ADD COLUMN IF NOT EXISTS final_exam_start_date DATE,
ADD COLUMN IF NOT EXISTS final_exam_end_date DATE,
ADD COLUMN IF NOT EXISTS graduation_start_date DATE,
ADD COLUMN IF NOT EXISTS graduation_end_date DATE;

-- Add comments to document each field
COMMENT ON COLUMN public.batches.selection_start_date IS 'Start date of selection phase (tests and interviews)';
COMMENT ON COLUMN public.batches.selection_end_date IS 'End date of selection phase';
COMMENT ON COLUMN public.batches.selection_result_date IS 'Date when selection results are announced';
COMMENT ON COLUMN public.batches.re_enrollment_date IS 'Date for re-enrollment confirmation';
COMMENT ON COLUMN public.batches.opening_class_date IS 'Date of opening class (Kelas Perdana Gabungan)';
COMMENT ON COLUMN public.batches.first_week_start_date IS 'Start date of first learning week (Pekan 1 - Tashih)';
COMMENT ON COLUMN public.batches.first_week_end_date IS 'End date of first learning week';
COMMENT ON COLUMN public.batches.review_week_start_date IS 'Start date of review/muraja''ah week (Pekan 12)';
COMMENT ON COLUMN public.batches.review_week_end_date IS 'End date of review week';
COMMENT ON COLUMN public.batches.final_exam_start_date IS 'Start date of final exam week (Pekan 13)';
COMMENT ON COLUMN public.batches.final_exam_end_date IS 'End date of final exam week';
COMMENT ON COLUMN public.batches.graduation_start_date IS 'Start date of graduation week (Penerbitan Syahadah & Kelulusan)';
COMMENT ON COLUMN public.batches.graduation_end_date IS 'End date of graduation week';
