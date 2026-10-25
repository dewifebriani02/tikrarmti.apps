-- Migration: 20261025_separate_raisah_from_musyrifah.sql
-- Description:
-- 1. Updates halaqah_mentors role from 'musyrifah' to 'raisah' for the 28 halaqahs in Tahfidz Tikrar Batch 3
-- 2. Grants 'raisah' role to Nurhayati (fr4946702@gmail.com) while keeping her 'musyrifah' role for Pra-Tikrar
-- 3. Replaces 'musyrifah' with 'raisah' for the 27 other Raisah users in table public.users and sets primary role accordingly

BEGIN;

-- 1. Update halaqah_mentors role for Tahfidz Tikrar halaqah assistants
UPDATE public.halaqah_mentors
SET role = 'raisah'
WHERE id IN (
  SELECT hm.id
  FROM public.halaqah_mentors hm
  JOIN public.halaqah h ON h.id = hm.halaqah_id
  JOIN public.programs p ON p.id = h.program_id
  JOIN public.batches b ON b.id = p.batch_id
  WHERE b.name ILIKE '%Batch 3%'
    AND p.class_type = 'tikrar_tahfidz'
    AND hm.role = 'musyrifah'
);

-- 2. Add 'raisah' to Nurhayati (who serves both as Pra-Tikrar Musyrifah and Tahfidz Tikrar Raisah)
UPDATE public.users
SET roles = array_append(roles, 'raisah')
WHERE email = 'fr4946702@gmail.com'
  AND NOT ('raisah' = ANY(roles));

-- 3. Update the other 27 Raisah: replace 'musyrifah' with 'raisah' in roles and adjust primary role
WITH raisah_users AS (
  SELECT DISTINCT hm.mentor_id as user_id
  FROM public.halaqah_mentors hm
  JOIN public.halaqah h ON h.id = hm.halaqah_id
  JOIN public.programs p ON p.id = h.program_id
  JOIN public.batches b ON b.id = p.batch_id
  WHERE b.name ILIKE '%Batch 3%'
    AND p.class_type = 'tikrar_tahfidz'
    AND hm.role = 'raisah'
    AND hm.mentor_id != (SELECT id FROM public.users WHERE email = 'fr4946702@gmail.com')
)
UPDATE public.users u
SET 
  role = CASE 
    WHEN u.role = 'admin' THEN 'admin'
    WHEN 'muallimah' = ANY(u.roles) THEN 'muallimah'
    ELSE 'raisah'
  END,
  roles = array_append(array_remove(u.roles, 'musyrifah'), 'raisah')
FROM raisah_users ru
WHERE u.id = ru.user_id;

COMMIT;
