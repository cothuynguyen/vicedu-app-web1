-- Tạo bảng lưu trữ tài liệu đào tạo nội bộ
CREATE TABLE IF NOT EXISTS public.internal_trainings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    scopes TEXT[] NOT NULL DEFAULT '{}', -- Lưu danh sách các phòng ban được áp dụng
    link_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cho phép đọc/ghi tất cả (RLS sẽ được chặn ở Frontend theo Role)
ALTER TABLE public.internal_trainings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all users to read internal_trainings" ON public.internal_trainings FOR SELECT USING (true);
CREATE POLICY "Allow all to insert internal_trainings" ON public.internal_trainings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all to update internal_trainings" ON public.internal_trainings FOR UPDATE USING (true);
CREATE POLICY "Allow all to delete internal_trainings" ON public.internal_trainings FOR DELETE USING (true);
