-- Fix RLS (Row Level Security) cho bảng crm_campaigns
-- Cho phép bất kỳ user nào đã đăng nhập đều có thể UPDATE các chiến dịch

-- Bật RLS (Nếu chưa bật)
ALTER TABLE public.crm_campaigns ENABLE ROW LEVEL SECURITY;

-- Xóa policy cũ nếu có (bỏ qua lỗi nếu không tồn tại)
DROP POLICY IF EXISTS "Allow authenticated users to update campaigns" ON public.crm_campaigns;

-- Tạo policy mới: Cho phép mọi tài khoản đã đăng nhập được phép Sửa (UPDATE)
CREATE POLICY "Allow authenticated users to update campaigns"
ON public.crm_campaigns
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- (Tùy chọn) Đảm bảo có quyền SELECT và INSERT
DROP POLICY IF EXISTS "Allow authenticated users to insert campaigns" ON public.crm_campaigns;
CREATE POLICY "Allow authenticated users to insert campaigns"
ON public.crm_campaigns
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to select campaigns" ON public.crm_campaigns;
CREATE POLICY "Allow authenticated users to select campaigns"
ON public.crm_campaigns
FOR SELECT
TO authenticated
USING (true);
