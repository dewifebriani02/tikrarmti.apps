-- Migration: Create Murojaah 40X Progress, Logs, and User Badges
-- Date: 2026-10-23
-- Description: Supports post-completion 40x murojaah (1/2 juz) with methods, warrior badge, and juz progression requirement

-- ============================================================================
-- 1. TABLE: murojaah_40x_progress
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.murojaah_40x_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  juz_code VARCHAR(10) NOT NULL, -- e.g. '28A', '28B', '29B', '30B'
  is_part_b BOOLEAN DEFAULT false,
  include_part_a BOOLEAN DEFAULT false, -- Optional A segment for B participants
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ NULL,
  total_completed INTEGER NOT NULL DEFAULT 0 CHECK (total_completed >= 0 AND total_completed <= 40),
  is_warrior_eligible BOOLEAN NOT NULL DEFAULT false, -- true if completed within 20 days
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_batch_juz UNIQUE (user_id, batch_id, juz_code)
);

CREATE INDEX IF NOT EXISTS idx_murojaah_40x_progress_user ON public.murojaah_40x_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_murojaah_40x_progress_batch ON public.murojaah_40x_progress(batch_id);
CREATE INDEX IF NOT EXISTS idx_murojaah_40x_progress_juz ON public.murojaah_40x_progress(juz_code);

-- ============================================================================
-- 2. TABLE: murojaah_40x_logs
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.murojaah_40x_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  progress_id UUID NOT NULL REFERENCES public.murojaah_40x_progress(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL CHECK (round_number >= 1 AND round_number <= 40),
  juz_segment VARCHAR(20) NOT NULL DEFAULT 'primary', -- 'primary' (e.g. 28B) or 'part_a_optional' (28A)
  completed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  methods TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT murojaah_methods_check CHECK (
    methods <@ ARRAY['pasangan', 'tarteel', 'sholat', 'aktifitas_lain']::TEXT[]
  ),
  CONSTRAINT unique_round_per_segment UNIQUE (progress_id, juz_segment, round_number)
);

CREATE INDEX IF NOT EXISTS idx_murojaah_40x_logs_progress ON public.murojaah_40x_logs(progress_id);
CREATE INDEX IF NOT EXISTS idx_murojaah_40x_logs_user ON public.murojaah_40x_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_murojaah_40x_logs_completed_at ON public.murojaah_40x_logs(completed_at);

-- ============================================================================
-- 3. TABLE: user_badges
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  badge_code VARCHAR(50) NOT NULL, -- e.g. 'murojaah_warrior'
  badge_name VARCHAR(100) NOT NULL, -- e.g. 'Murojaah Warrior'
  description TEXT,
  icon_url TEXT,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  CONSTRAINT unique_user_badge UNIQUE (user_id, badge_code)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_code ON public.user_badges(badge_code);

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE public.murojaah_40x_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.murojaah_40x_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- 4.1. Policies for murojaah_40x_progress
DROP POLICY IF EXISTS "Users can view own murojaah progress" ON public.murojaah_40x_progress;
CREATE POLICY "Users can view own murojaah progress" ON public.murojaah_40x_progress
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own murojaah progress" ON public.murojaah_40x_progress;
CREATE POLICY "Users can insert own murojaah progress" ON public.murojaah_40x_progress
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own murojaah progress" ON public.murojaah_40x_progress;
CREATE POLICY "Users can update own murojaah progress" ON public.murojaah_40x_progress
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Staff and Admin can view all murojaah progress" ON public.murojaah_40x_progress;
CREATE POLICY "Staff and Admin can view all murojaah progress" ON public.murojaah_40x_progress
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND (
      'admin' = ANY(roles) OR
      'musyrifah' = ANY(roles) OR
      'muallimah' = ANY(roles)
    )
  ));

DROP POLICY IF EXISTS "Admins can manage all murojaah progress" ON public.murojaah_40x_progress;
CREATE POLICY "Admins can manage all murojaah progress" ON public.murojaah_40x_progress
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND 'admin' = ANY(roles)
  ));

-- 4.2. Policies for murojaah_40x_logs
DROP POLICY IF EXISTS "Users can view own murojaah logs" ON public.murojaah_40x_logs;
CREATE POLICY "Users can view own murojaah logs" ON public.murojaah_40x_logs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own murojaah logs" ON public.murojaah_40x_logs;
CREATE POLICY "Users can insert own murojaah logs" ON public.murojaah_40x_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own murojaah logs" ON public.murojaah_40x_logs;
CREATE POLICY "Users can update own murojaah logs" ON public.murojaah_40x_logs
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own murojaah logs" ON public.murojaah_40x_logs;
CREATE POLICY "Users can delete own murojaah logs" ON public.murojaah_40x_logs
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Staff and Admin can view all murojaah logs" ON public.murojaah_40x_logs;
CREATE POLICY "Staff and Admin can view all murojaah logs" ON public.murojaah_40x_logs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND (
      'admin' = ANY(roles) OR
      'musyrifah' = ANY(roles) OR
      'muallimah' = ANY(roles)
    )
  ));

DROP POLICY IF EXISTS "Admins can manage all murojaah logs" ON public.murojaah_40x_logs;
CREATE POLICY "Admins can manage all murojaah logs" ON public.murojaah_40x_logs
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND 'admin' = ANY(roles)
  ));

-- 4.3. Policies for user_badges
DROP POLICY IF EXISTS "Authenticated users can view badges" ON public.user_badges;
CREATE POLICY "Authenticated users can view badges" ON public.user_badges
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert own badge" ON public.user_badges;
CREATE POLICY "Users can insert own badge" ON public.user_badges
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all badges" ON public.user_badges;
CREATE POLICY "Admins can manage all badges" ON public.user_badges
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND 'admin' = ANY(roles)
  ));

-- ============================================================================
-- 5. TRIGGER: updated_at
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS trg_murojaah_40x_progress_updated_at ON public.murojaah_40x_progress;
    CREATE TRIGGER trg_murojaah_40x_progress_updated_at
      BEFORE UPDATE ON public.murojaah_40x_progress
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
