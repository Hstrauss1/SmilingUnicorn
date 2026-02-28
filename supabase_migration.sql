-- ============================================
-- COURSE PACK DATABASE SCHEMA
-- Based on schema.json structure
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- COURSE PACKS TABLE
-- Main table for learning roadmaps
-- ============================================
CREATE TABLE IF NOT EXISTS public.course_packs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_pack_id TEXT UNIQUE,
  title TEXT NOT NULL,
  document_name TEXT,
  document_url TEXT,
  learning_goal TEXT,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- TOPIC SESSIONS TABLE
-- Individual learning topics within a course pack
-- ============================================
CREATE TABLE IF NOT EXISTS public.topic_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  course_pack_id UUID REFERENCES public.course_packs(id) ON DELETE CASCADE NOT NULL,
  topic_id TEXT NOT NULL,
  title TEXT NOT NULL,
  state TEXT DEFAULT 'diagnostic' CHECK (state IN ('diagnostic', 'learning_session', 'final_quiz', 'completed')),
  completion_status TEXT DEFAULT 'not_started' CHECK (completion_status IN ('not_started', 'in_progress', 'completed')),
  order_index INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- SUBSKILLS TABLE
-- Skills and mastery levels for each topic
-- ============================================
CREATE TABLE IF NOT EXISTS public.subskills (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  topic_session_id UUID REFERENCES public.topic_sessions(id) ON DELETE CASCADE NOT NULL,
  subskill_id TEXT NOT NULL,
  name TEXT NOT NULL,
  mastery DECIMAL(3, 2) DEFAULT 0.0 CHECK (mastery >= 0 AND mastery <= 1),
  evidence_chunk_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- DIAGNOSTIC QUESTIONS TABLE
-- Questions for diagnostic quizzes
-- ============================================
CREATE TABLE IF NOT EXISTS public.diagnostic_questions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  topic_session_id UUID REFERENCES public.topic_sessions(id) ON DELETE CASCADE NOT NULL,
  question_id TEXT NOT NULL,
  subskill_id TEXT,
  type TEXT DEFAULT 'mcq' CHECK (type IN ('mcq', 'short_answer', 'coding')),
  difficulty INTEGER DEFAULT 1 CHECK (difficulty >= 1 AND difficulty <= 3),
  prompt TEXT NOT NULL,
  choices TEXT[] DEFAULT '{}',
  correct_answer TEXT,
  rubric TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- DIAGNOSTIC SUBMISSIONS TABLE
-- User submissions for diagnostic quizzes
-- ============================================
CREATE TABLE IF NOT EXISTS public.diagnostic_submissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  topic_session_id UUID REFERENCES public.topic_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  answers JSONB NOT NULL,
  score JSONB,
  analysis JSONB,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- LEARNING MODULES TABLE
-- Individual learning modules within a topic session
-- ============================================
CREATE TABLE IF NOT EXISTS public.learning_modules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  topic_session_id UUID REFERENCES public.topic_sessions(id) ON DELETE CASCADE NOT NULL,
  module_id TEXT NOT NULL,
  subskill_id TEXT,
  title TEXT NOT NULL,
  explanation TEXT,
  worked_example JSONB DEFAULT '{}',
  quick_check JSONB DEFAULT '{}',
  evidence_chunk_ids TEXT[] DEFAULT '{}',
  order_index INTEGER DEFAULT 0,
  status TEXT DEFAULT 'locked' CHECK (status IN ('locked', 'in_progress', 'completed')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- FINAL QUIZ TABLE
-- Final assessment for topic completion
-- ============================================
CREATE TABLE IF NOT EXISTS public.final_quizzes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  topic_session_id UUID REFERENCES public.topic_sessions(id) ON DELETE CASCADE NOT NULL,
  quiz_id TEXT NOT NULL,
  questions JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- FINAL QUIZ SUBMISSIONS TABLE
-- User submissions for final quizzes
-- ============================================
CREATE TABLE IF NOT EXISTS public.final_quiz_submissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  final_quiz_id UUID REFERENCES public.final_quizzes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  answers JSONB NOT NULL,
  score JSONB,
  passed BOOLEAN DEFAULT FALSE,
  weak_subskills TEXT[] DEFAULT '{}',
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- ACTIVITY LOGS TABLE
-- Track user activity for analytics
-- ============================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  item TEXT NOT NULL,
  course_pack_id UUID REFERENCES public.course_packs(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.course_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subskills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostic_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.final_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.final_quiz_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Course Packs Policies
CREATE POLICY "Users can view own course packs"
  ON public.course_packs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own course packs"
  ON public.course_packs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own course packs"
  ON public.course_packs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own course packs"
  ON public.course_packs FOR DELETE
  USING (auth.uid() = user_id);

-- Topic Sessions Policies
CREATE POLICY "Users can view topic sessions of own course packs"
  ON public.topic_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.course_packs
      WHERE course_packs.id = topic_sessions.course_pack_id
      AND course_packs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert topic sessions for own course packs"
  ON public.topic_sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.course_packs
      WHERE course_packs.id = topic_sessions.course_pack_id
      AND course_packs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update topic sessions of own course packs"
  ON public.topic_sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.course_packs
      WHERE course_packs.id = topic_sessions.course_pack_id
      AND course_packs.user_id = auth.uid()
    )
  );

-- Subskills Policies
CREATE POLICY "Users can view subskills of own topic sessions"
  ON public.subskills FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.topic_sessions ts
      JOIN public.course_packs cp ON cp.id = ts.course_pack_id
      WHERE ts.id = subskills.topic_session_id
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert subskills for own topic sessions"
  ON public.subskills FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.topic_sessions ts
      JOIN public.course_packs cp ON cp.id = ts.course_pack_id
      WHERE ts.id = subskills.topic_session_id
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update subskills of own topic sessions"
  ON public.subskills FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.topic_sessions ts
      JOIN public.course_packs cp ON cp.id = ts.course_pack_id
      WHERE ts.id = subskills.topic_session_id
      AND cp.user_id = auth.uid()
    )
  );

-- Diagnostic Questions Policies (Read-only for users)
CREATE POLICY "Users can view diagnostic questions of own topic sessions"
  ON public.diagnostic_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.topic_sessions ts
      JOIN public.course_packs cp ON cp.id = ts.course_pack_id
      WHERE ts.id = diagnostic_questions.topic_session_id
      AND cp.user_id = auth.uid()
    )
  );

-- Diagnostic Submissions Policies
CREATE POLICY "Users can view own diagnostic submissions"
  ON public.diagnostic_submissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own diagnostic submissions"
  ON public.diagnostic_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Learning Modules Policies
CREATE POLICY "Users can view learning modules of own topic sessions"
  ON public.learning_modules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.topic_sessions ts
      JOIN public.course_packs cp ON cp.id = ts.course_pack_id
      WHERE ts.id = learning_modules.topic_session_id
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update learning modules of own topic sessions"
  ON public.learning_modules FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.topic_sessions ts
      JOIN public.course_packs cp ON cp.id = ts.course_pack_id
      WHERE ts.id = learning_modules.topic_session_id
      AND cp.user_id = auth.uid()
    )
  );

-- Activity Logs Policies
CREATE POLICY "Users can view own activity logs"
  ON public.activity_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity logs"
  ON public.activity_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_course_packs_user_id ON public.course_packs(user_id);
CREATE INDEX idx_topic_sessions_course_pack_id ON public.topic_sessions(course_pack_id);
CREATE INDEX idx_subskills_topic_session_id ON public.subskills(topic_session_id);
CREATE INDEX idx_diagnostic_questions_topic_session_id ON public.diagnostic_questions(topic_session_id);
CREATE INDEX idx_diagnostic_submissions_topic_session_id ON public.diagnostic_submissions(topic_session_id);
CREATE INDEX idx_learning_modules_topic_session_id ON public.learning_modules(topic_session_id);
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_course_packs_updated_at BEFORE UPDATE ON public.course_packs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_topic_sessions_updated_at BEFORE UPDATE ON public.topic_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subskills_updated_at BEFORE UPDATE ON public.subskills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learning_modules_updated_at BEFORE UPDATE ON public.learning_modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================
-- Uncomment to insert sample data

/*
-- Insert sample course pack (replace 'YOUR_USER_ID' with actual user ID)
INSERT INTO public.course_packs (user_id, title, document_name, progress, status)
VALUES 
  ('YOUR_USER_ID', 'Machine Learning Fundamentals', 'ml-textbook.pdf', 35, 'in_progress');

-- Get the course pack ID
DO $$
DECLARE
  pack_id UUID;
BEGIN
  SELECT id INTO pack_id FROM public.course_packs WHERE title = 'Machine Learning Fundamentals' LIMIT 1;
  
  -- Insert topic sessions
  INSERT INTO public.topic_sessions (course_pack_id, topic_id, title, state, completion_status, order_index)
  VALUES 
    (pack_id, 'topic-1', 'Introduction to Machine Learning', 'completed', 'completed', 0),
    (pack_id, 'topic-2', 'Data Preprocessing', 'learning_session', 'in_progress', 1),
    (pack_id, 'topic-3', 'Supervised Learning', 'diagnostic', 'not_started', 2),
    (pack_id, 'topic-4', 'Unsupervised Learning', 'diagnostic', 'not_started', 3),
    (pack_id, 'topic-5', 'Neural Networks', 'diagnostic', 'not_started', 4);
END $$;
*/
