-- /api/admin/tikrar/unapprove and /api/admin/tikrar/bulk-approve (reject / unapprove) write
-- pendaftaran_tikrar_tahfidz.rejection_reason, but no migration ever created that column
-- (it only exists on daftar_ulang_submissions). Without it those admin actions fail with
-- "column does not exist". Idempotent: safe whether or not the column was added by hand.

ALTER TABLE public.pendaftaran_tikrar_tahfidz
  ADD COLUMN IF NOT EXISTS rejection_reason text;

COMMENT ON COLUMN public.pendaftaran_tikrar_tahfidz.rejection_reason IS
  'Alasan admin saat menolak atau membatalkan persetujuan pendaftaran (prefix UNAPPROVED: untuk unapprove)';
