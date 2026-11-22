-- Add duration_info and student_prerequisites to muallimah_paid_classes
ALTER TABLE public.muallimah_paid_classes
  ADD COLUMN IF NOT EXISTS duration_info TEXT,
  ADD COLUMN IF NOT EXISTS student_prerequisites TEXT;
