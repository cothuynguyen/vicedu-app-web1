ALTER TABLE public.event_tasks ADD COLUMN co_assignees jsonb DEFAULT '[]'::jsonb;
