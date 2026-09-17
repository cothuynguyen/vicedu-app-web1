-- 1. Tạo bảng notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    title text NOT NULL,
    content text NOT NULL,
    is_read boolean DEFAULT false,
    link_url text,
    created_at timestamp with time zone DEFAULT now()
);

-- Bật Row Level Security (RLS) để bảo mật
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Chính sách: Mỗi người chỉ xem được thông báo của riêng mình
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
-- Chính sách: Mỗi người chỉ có thể cập nhật thông báo của mình (đánh dấu đã đọc)
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
-- Cho phép thêm mới (Trigger dùng bypass nên không cần thiết, nhưng đề phòng)
CREATE POLICY "Enable insert for authenticated users" ON public.notifications FOR INSERT WITH CHECK (true);

-- 2. Viết hàm Trigger xử lý khi có khách hàng mới
CREATE OR REPLACE FUNCTION public.handle_new_crm_customer()
RETURNS trigger AS $$
DECLARE
    target_user RECORD;
    is_viet_tri boolean;
BEGIN
    -- Kiểm tra xem chi nhánh của Khách hàng có chữ 'Việt Trì' không
    is_viet_tri := (NEW.branch_id IS NOT NULL AND NEW.branch_id ILIKE '%Việt Trì%');

    -- Quét tất cả Users có role là Super Admin hoặc Admin
    FOR target_user IN 
        SELECT id, role, branch_id FROM public.users 
        WHERE role IN ('Super Admin', 'Admin')
    LOOP
        -- Logic 1: Super Admin nhận TẤT CẢ thông báo
        IF target_user.role = 'Super Admin' THEN
            INSERT INTO public.notifications (user_id, title, content, link_url)
            VALUES (target_user.id, '🎉 Lead mới: ' || COALESCE(NEW.source_name, 'Landing Page'), 'Khách hàng ' || NEW.full_name || ' vừa đăng ký!', '/sales/crm');
        
        -- Logic 2: Admin chi nhánh
        ELSIF target_user.role = 'Admin' THEN
            -- Điều kiện a: Chi nhánh của khách trùng khớp chi nhánh của Admin
            -- Điều kiện b: Cả 2 đều có chữ 'Việt Trì' (so khớp chéo)
            IF (target_user.branch_id = NEW.branch_id) OR (is_viet_tri AND target_user.branch_id ILIKE '%Việt Trì%') THEN
                INSERT INTO public.notifications (user_id, title, content, link_url)
                VALUES (target_user.id, '🎉 Lead mới: ' || COALESCE(NEW.source_name, 'Landing Page'), 'Khách hàng ' || NEW.full_name || ' thuộc chi nhánh ' || COALESCE(NEW.branch_id, '') || ' vừa đăng ký!', '/sales/crm');
            END IF;
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Gắn Trigger vào bảng crm_customers
DROP TRIGGER IF EXISTS on_crm_customer_created ON public.crm_customers;
CREATE TRIGGER on_crm_customer_created
    AFTER INSERT ON public.crm_customers
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_crm_customer();
