-- ==============================================================================
-- UPDATE CRM SCHEMA: QUẢN TRỊ CHIẾN DỊCH (CAMPAIGN)
-- ==============================================================================

-- Bảng: Nguồn / Chiến dịch
CREATE TABLE IF NOT EXISTS public.crm_campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    branch_id TEXT NOT NULL, -- Chiến dịch thuộc chi nhánh nào
    status TEXT DEFAULT 'Đang chạy', -- Đang chạy, Đã đóng
    created_by TEXT REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Bảng crm_campaigns
ALTER TABLE public.crm_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tất cả mọi người đều xem được chiến dịch của chi nhánh mình" 
    ON public.crm_campaigns FOR SELECT 
    USING (
        branch_id = (SELECT branch_id FROM public.users WHERE id = auth.uid()::text)
        OR auth.uid()::text IN (SELECT id FROM public.users WHERE role IN ('Super Admin', 'Giám đốc', 'Quản lý'))
    );

CREATE POLICY "Chỉ Quản lý/Admin được tạo/sửa chiến dịch" 
    ON public.crm_campaigns FOR ALL 
    USING (
        auth.uid()::text IN (SELECT id FROM public.users WHERE role IN ('Super Admin', 'Giám đốc', 'Quản lý'))
    );

-- Thêm cột campaign_id vào bảng crm_customers hiện tại
ALTER TABLE public.crm_customers
ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.crm_campaigns(id) ON DELETE SET NULL;

-- Tạo index để truy vấn lọc theo chiến dịch nhanh hơn (Tối ưu Free Tier)
CREATE INDEX IF NOT EXISTS idx_crm_customers_campaign_id ON public.crm_customers(campaign_id);
CREATE INDEX IF NOT EXISTS idx_crm_customers_phone ON public.crm_customers(phone);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_action_type ON public.crm_interactions(action_type);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_created_at ON public.crm_interactions(created_at);
