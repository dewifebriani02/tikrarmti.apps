-- Migration: Add registration_edit_history table for tracking post-cutoff edits across all registration forms
-- and storing WhatsApp notification summaries when Mu'allimah schedules change.

CREATE TABLE IF NOT EXISTS public.registration_edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (
    entity_type IN (
      'tikrar',
      'pra_tikrar',
      'muallimah',
      'musyrifah',
      'paid_class',
      'paid_class_registration'
    )
  ),
  entity_id UUID NOT NULL,
  user_id UUID NOT NULL,
  batch_id UUID NULL,
  edit_phase TEXT NOT NULL CHECK (
    edit_phase IN ('before_daftar_ulang', 'after_daftar_ulang')
  ),
  changed_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  edit_reason TEXT NULL,
  notifications_sent JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reg_edit_history_entity
  ON public.registration_edit_history (entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reg_edit_history_user
  ON public.registration_edit_history (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reg_edit_history_batch
  ON public.registration_edit_history (batch_id)
  WHERE batch_id IS NOT NULL;
