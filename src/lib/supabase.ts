import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * SQL Schema migration for Supabase to support Leo AI Anandi-NEAT platform.
 * Users can run this in the Supabase SQL editor.
 */
export const SUPABASE_SCHEMA_SQL = `
-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE,
  target_exam TEXT DEFAULT 'Anandi-NEAT 2026',
  streak_days INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Questions Bank Table
CREATE TABLE IF NOT EXISTS public.questions (
  id TEXT PRIMARY KEY,
  section TEXT NOT NULL,
  subtopic TEXT NOT NULL,
  difficulty INT NOT NULL,
  type TEXT NOT NULL,
  prompt TEXT NOT NULL,
  options JSONB,
  answer_key JSONB NOT NULL,
  numeric_tolerance FLOAT,
  solution TEXT NOT NULL,
  rubric JSONB,
  expected_pace_seconds INT DEFAULT 90,
  verification_metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Test Sessions Table
CREATE TABLE IF NOT EXISTS public.test_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  title TEXT NOT NULL,
  section TEXT,
  is_full_mock BOOLEAN DEFAULT FALSE,
  total_questions INT NOT NULL,
  time_limit_seconds INT NOT NULL,
  score FLOAT DEFAULT 0,
  accuracy_rate FLOAT DEFAULT 0,
  avg_pace_seconds INT DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 4. User Attempts Table
CREATE TABLE IF NOT EXISTS public.user_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT REFERENCES public.test_sessions(id) ON DELETE CASCADE,
  question_id TEXT REFERENCES public.questions(id),
  user_answer JSONB NOT NULL,
  is_correct BOOLEAN NOT NULL,
  score_earned FLOAT DEFAULT 0,
  time_spent_seconds INT NOT NULL,
  mistake_tag TEXT DEFAULT 'none',
  eval_feedback JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. User Memory & Weak Topics
CREATE TABLE IF NOT EXISTS public.user_memory (
  user_id TEXT PRIMARY KEY,
  weak_subtopics JSONB DEFAULT '[]'::jsonb,
  strong_subtopics JSONB DEFAULT '[]'::jsonb,
  mistake_distribution JSONB DEFAULT '{}'::jsonb,
  spaced_review_queue JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Enable Permissive Access for Frontend Anon Key
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memory ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access on profiles') THEN
    CREATE POLICY "Allow public access on profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access on questions') THEN
    CREATE POLICY "Allow public access on questions" ON public.questions FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access on test_sessions') THEN
    CREATE POLICY "Allow public access on test_sessions" ON public.test_sessions FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access on user_attempts') THEN
    CREATE POLICY "Allow public access on user_attempts" ON public.user_attempts FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public access on user_memory') THEN
    CREATE POLICY "Allow public access on user_memory" ON public.user_memory FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
`;
