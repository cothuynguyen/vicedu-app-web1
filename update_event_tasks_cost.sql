-- Chạy lệnh này trong Supabase SQL Editor để thêm cột chi phí (cost) vào bảng event_tasks
ALTER TABLE public.event_tasks ADD COLUMN cost numeric DEFAULT 0;
