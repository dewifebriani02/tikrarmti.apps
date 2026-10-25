-- Migration: 20261025_update_users_roles_constraint_and_sync_muallimah.sql
-- Description:
-- 1. Updates users_roles_check constraint on table public.users to allow 'super_admin', 'raisah', and 'roisah'
-- 2. Sets role and adds 'super_admin' to owner account (dewifebriani@gmail.com)
-- 3. Syncs 'muallimah' role to all active teaching muallimah in halaqah, approved registrations, and halaqah_mentors

BEGIN;

-- 1. Update check constraint on users.roles
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_roles_check;
ALTER TABLE public.users ADD CONSTRAINT users_roles_check 
  CHECK (roles <@ ARRAY[
    'super_admin'::text, 
    'admin'::text, 
    'musyrifah'::text, 
    'raisah'::text, 
    'roisah'::text, 
    'muallimah'::text, 
    'thalibah'::text, 
    'calon_thalibah'::text, 
    'pengurus'::text
  ]);

-- 2. Add 'super_admin' to owner account
UPDATE public.users
SET 
  role = 'super_admin',
  roles = array_append(COALESCE(roles, ARRAY[]::text[]), 'super_admin')
WHERE email = 'dewifebriani@gmail.com'
  AND NOT ('super_admin' = ANY(roles));

-- 3. Synchronize 'muallimah' role for all teachers (halaqah, approved registrations, halaqah_mentors)
UPDATE public.users
SET 
  role = CASE 
    WHEN role IN ('thalibah', 'calon_thalibah') THEN 'muallimah'
    ELSE role 
  END,
  roles = array_append(COALESCE(roles, ARRAY[]::text[]), 'muallimah')
WHERE id IN (
  SELECT muallimah_id FROM public.halaqah WHERE muallimah_id IS NOT NULL
  UNION
  SELECT user_id FROM public.muallimah_registrations WHERE status = 'approved'
  UNION
  SELECT mentor_id FROM public.halaqah_mentors WHERE role = 'ustadzah'
)
AND NOT ('muallimah' = ANY(roles));

COMMIT;
