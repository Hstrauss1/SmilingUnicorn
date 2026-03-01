-- Add course_pack_id column if it doesn't exist
-- Run this in your Supabase SQL editor

-- First, check if the column exists and add it if not
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'course_packs' 
        AND column_name = 'course_pack_id'
    ) THEN
        ALTER TABLE public.course_packs 
        ADD COLUMN course_pack_id TEXT;
        
        RAISE NOTICE 'Added course_pack_id column';
    ELSE
        RAISE NOTICE 'course_pack_id column already exists';
    END IF;
END $$;

-- Optionally, populate course_pack_id from roadmap_json for existing rows
UPDATE public.course_packs
SET course_pack_id = roadmap_json->>'course_pack_id'
WHERE course_pack_id IS NULL 
  AND roadmap_json->>'course_pack_id' IS NOT NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_course_packs_course_pack_id 
ON public.course_packs(course_pack_id);

CREATE INDEX IF NOT EXISTS idx_course_packs_user_id 
ON public.course_packs(user_id);
