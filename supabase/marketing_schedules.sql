-- Tạo bảng lưu trữ Lịch Marketing của Giáo viên Nước ngoài
CREATE TABLE IF NOT EXISTS public.marketing_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    branch_id TEXT NOT NULL,
    teacher_name TEXT NOT NULL,
    date DATE NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    location TEXT NOT NULL,
    hours NUMERIC NOT NULL,
    status TEXT DEFAULT 'Chưa làm' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_by UUID REFERENCES auth.users(id)
);

-- Tạo Index để tối ưu truy vấn
CREATE INDEX IF NOT EXISTS idx_marketing_schedules_branch ON public.marketing_schedules(branch_id);
CREATE INDEX IF NOT EXISTS idx_marketing_schedules_date ON public.marketing_schedules(date);
CREATE INDEX IF NOT EXISTS idx_marketing_schedules_teacher ON public.marketing_schedules(teacher_name);

-- Phân quyền RLS (Row Level Security)
ALTER TABLE public.marketing_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cho phép tất cả người dùng xem lịch marketing" 
ON public.marketing_schedules FOR SELECT 
USING (true);

CREATE POLICY "Cho phép tất cả người dùng đã xác thực thêm lịch marketing" 
ON public.marketing_schedules FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Cho phép tất cả người dùng đã xác thực sửa lịch marketing" 
ON public.marketing_schedules FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Cho phép tất cả người dùng đã xác thực xóa lịch marketing" 
ON public.marketing_schedules FOR DELETE 
USING (auth.role() = 'authenticated');
