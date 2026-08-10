-- Update students table
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS bonus_points INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS target_points INT DEFAULT NULL;

-- Update student_care_logs table
ALTER TABLE public.student_care_logs
ADD COLUMN IF NOT EXISTS bonus_points INT DEFAULT 0;

-- Update attendance table
ALTER TABLE public.attendance
ADD COLUMN IF NOT EXISTS bonus_points INT DEFAULT 0;

-- Optionally, backfill existing nulls if any
UPDATE public.students SET bonus_points = 0 WHERE bonus_points IS NULL;
UPDATE public.student_care_logs SET bonus_points = 0 WHERE bonus_points IS NULL;
UPDATE public.attendance SET bonus_points = 0 WHERE bonus_points IS NULL;
