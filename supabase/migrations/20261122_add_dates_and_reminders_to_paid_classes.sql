-- Add start_date, estimated_end_date, and pre-start H-1 WhatsApp reminder tracking columns
ALTER TABLE public.muallimah_paid_classes
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS estimated_end_date DATE,
  ADD COLUMN IF NOT EXISTS reminder_h1_ustadzah_sent_at TIMESTAMPTZ;

ALTER TABLE public.paid_class_registrations
  ADD COLUMN IF NOT EXISTS reminder_h1_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_muallimah_paid_classes_status_start_date
  ON public.muallimah_paid_classes (status, start_date);
