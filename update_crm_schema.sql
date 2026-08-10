-- ==============================================================================
-- UPDATE CRM SCHEMA: QUẢN TRỊ KHÁCH HÀNG (SALE)
-- MỚI: crm_customers (JSONB touchpoints), crm_interactions
-- ==============================================================================

-- Bảng 1: Thông tin Khách hàng (Lưu Điểm chạm bằng JSONB)
CREATE TABLE IF NOT EXISTS public.crm_customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    branch_id TEXT NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    address TEXT,
    
    -- Thông tin gia đình
    parent_role TEXT NOT NULL DEFAULT 'Khác', -- Bố/Mẹ/Khác
    children JSONB DEFAULT '[]'::jsonb, -- Danh sách các con [{name: 'A', yob: 2018}, ...]
    
    
    -- Thông tin chuyên môn
    insight TEXT,
    speaking_tester TEXT,
    entry_level TEXT,
    
    -- Quản trị trạng thái và Điểm chạm (Tối ưu data)
    status TEXT DEFAULT 'Mới', -- Mới, Đang chăm sóc, Đã chốt, Hủy
    touchpoints JSONB DEFAULT '[]'::jsonb, -- Checklist các điểm chạm khách hàng (SOP)
    
    -- Phân quyền
    assigned_to TEXT REFERENCES public.users(id), -- Sale đang chăm sóc (Cập nhật khi có nghỉ việc)
    created_by TEXT REFERENCES public.users(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Bảng crm_customers
ALTER TABLE public.crm_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sale xem khách hàng của mình hoặc quản lý xem tất cả" 
    ON public.crm_customers FOR SELECT 
    USING (
        auth.uid() = assigned_to 
        OR auth.uid() IN (SELECT id FROM public.users WHERE role IN ('Super Admin', 'Giám đốc', 'Quản lý'))
    );

CREATE POLICY "Sale được thêm mới khách hàng" 
    ON public.crm_customers FOR INSERT 
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Sale được sửa khách của mình hoặc quản lý sửa" 
    ON public.crm_customers FOR UPDATE 
    USING (
        auth.uid() = assigned_to 
        OR auth.uid() IN (SELECT id FROM public.users WHERE role IN ('Super Admin', 'Giám đốc', 'Quản lý'))
    );


-- Bảng 2: Nhật ký tương tác / Dòng thời gian Khách hàng
CREATE TABLE IF NOT EXISTS public.crm_interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES public.crm_customers(id) ON DELETE CASCADE,
    sale_id TEXT REFERENCES public.users(id),
    action_type TEXT NOT NULL, -- "Tạo mới", "Nhận bàn giao", "Gọi điện", "Ghi chú", "Đổi trạng thái"
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Bảng crm_interactions
ALTER TABLE public.crm_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cho phép xem lịch sử của khách hàng được quyền xem" 
    ON public.crm_interactions FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.crm_customers c 
            WHERE c.id = customer_id 
            AND (
                c.assigned_to = auth.uid() 
                OR auth.uid() IN (SELECT id FROM public.users WHERE role IN ('Super Admin', 'Giám đốc', 'Quản lý'))
            )
        )
    );

CREATE POLICY "Cho phép Sale thêm nhật ký cho khách của mình" 
    ON public.crm_interactions FOR INSERT 
    WITH CHECK (auth.uid() = sale_id);

-- Cập nhật updatedAt trigger cho crm_customers
CREATE TRIGGER update_crm_customers_modtime
    BEFORE UPDATE ON public.crm_customers
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
