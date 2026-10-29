-- A partner choice in daftar_ulang_submissions is locked once (partner_status || status) is
-- submitted/approved (see lib/partner-choice.ts); locked self-match choices reveal the
-- partner's WhatsApp. submitDaftarUlang used to leave partner_status NULL, so those choices
-- were locked only through the overall status — which resetAkadThalibah flips back to
-- 'draft', letting a thalibah reopen her choice and point it at someone else. New submissions
-- now write partner_status = 'submitted'; this backfills existing rows the same way.
--
-- Rows without a partner choice (e.g. only the akad step submitted) are left untouched.
-- Readers that use (partner_status || status) see the same value as before.
-- Idempotent: only fills NULLs.

ALTER TABLE public.daftar_ulang_submissions
  ADD COLUMN IF NOT EXISTS partner_status character varying(20);

UPDATE public.daftar_ulang_submissions
   SET partner_status = status
 WHERE partner_status IS NULL
   AND NULLIF(partner_type, '') IS NOT NULL
   AND status IN ('submitted', 'approved');
