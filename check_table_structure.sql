-- Check what columns exist in your course_packs table
-- Run this in Supabase SQL Editor

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'course_packs'
ORDER BY 
    ordinal_position;

-- Expected output for new schema:
-- column_name   | data_type | is_nullable | column_default
-- --------------|-----------+-------------+------------------
-- id            | uuid      | NO          | uuid_generate_v4()
-- user_id       | uuid      | NO          | NULL
-- course_packs  | jsonb     | NO          | '[]'::jsonb
-- created_at    | timestamp | NO          | timezone('utc'...)
