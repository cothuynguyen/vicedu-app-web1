-- ==========================================
-- VICEDU LMS - CRM & LANDING PAGES SCHEMA
-- ==========================================

-- Bảng 1: landing_pages (Cấu hình Landing Page)
CREATE TABLE public.landing_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    branch_id TEXT NOT NULL DEFAULT 'Chỉ Admin được dùng', -- Phân quyền chi nhánh
    config JSONB DEFAULT '{}'::jsonb, 
    post_submit_action TEXT NOT NULL DEFAULT 'THANK_YOU', 
    granted_course_ids JSONB DEFAULT '[]'::jsonb, 
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by TEXT REFERENCES public.users(id) 
);

-- Bảng 2: leads (Khách hàng tiềm năng)
CREATE TABLE public.leads (
    phone TEXT PRIMARY KEY, 
    full_name TEXT NOT NULL,
    email TEXT,
    branch_id TEXT NOT NULL DEFAULT 'Chỉ Admin được dùng', -- Kế thừa từ Landing Page đầu tiên họ điền
    status TEXT NOT NULL DEFAULT 'Mới', 
    assigned_to TEXT REFERENCES public.users(id), 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Bảng 3: customer_activities (Lịch sử chăm sóc / Touchpoints)
CREATE TABLE public.customer_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone TEXT NOT NULL REFERENCES public.leads(phone) ON DELETE CASCADE,
    activity_type TEXT NOT NULL, 
    description TEXT NOT NULL,
    landing_page_id UUID REFERENCES public.landing_pages(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by TEXT REFERENCES public.users(id) 
);

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_activities ENABLE ROW LEVEL SECURITY;

-- Policies (Cho phép Admin/Sale truy cập)
CREATE POLICY "Cho phép tất cả đọc landing_pages" ON public.landing_pages FOR SELECT USING (true);
CREATE POLICY "Cho phép Admin sửa landing_pages" ON public.landing_pages FOR ALL USING (true); 

CREATE POLICY "Cho phép Web 2 insert leads" ON public.leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Cho phép tất cả đọc leads" ON public.leads FOR SELECT USING (true);
CREATE POLICY "Cho phép Admin/Sale sửa leads" ON public.leads FOR UPDATE USING (true);

CREATE POLICY "Cho phép Web 2 insert activities" ON public.customer_activities FOR INSERT WITH CHECK (true);
CREATE POLICY "Cho phép tất cả đọc activities" ON public.customer_activities FOR SELECT USING (true);

-- Cập nhật function auto set updated_at cho leads
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_leads_modtime
BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
