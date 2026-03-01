-- Simple course_packs table with JSONB array
-- This is the schema you want: one row per user with array of course packs

-- Drop existing table if you want to start fresh (WARNING: deletes all data)
-- DROP TABLE IF EXISTS public.course_packs CASCADE;

-- Create simple course_packs table
CREATE TABLE IF NOT EXISTS public.course_packs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  course_packs JSONB DEFAULT '[]'::jsonb NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.course_packs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own course packs" ON public.course_packs;
CREATE POLICY "Users can view own course packs"
  ON public.course_packs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own course packs" ON public.course_packs;
CREATE POLICY "Users can insert own course packs"
  ON public.course_packs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own course packs" ON public.course_packs;
CREATE POLICY "Users can update own course packs"
  ON public.course_packs FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own course packs" ON public.course_packs;
CREATE POLICY "Users can delete own course packs"
  ON public.course_packs FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_course_packs_user_id ON public.course_packs(user_id);
CREATE INDEX IF NOT EXISTS idx_course_packs_jsonb ON public.course_packs USING GIN (course_packs);

-- Comment
COMMENT ON TABLE public.course_packs IS 
'Simple course packs table: one row per user, course_packs column contains JSONB array of all course packs for that user';

COMMENT ON COLUMN public.course_packs.course_packs IS 
'JSONB array of course pack objects. Each object structure:
{
  "course_pack_id": "course_xxxxx",
  "title": "Course Title",
  "document_name": "file.pdf",
  "topic_session": {
    "topic_id": "topic_001",
    "title": "Topic Title",
    "state": "diagnostic|learning_session|final_quiz|completed",
    "subskills": [...],
    "diagnostic": {...},
    "learning_session": {...},
    "final_quiz": {...}
  },
  "created_at": "ISO timestamp",
  "progress": 0,
  "status": "in_progress"
}';
