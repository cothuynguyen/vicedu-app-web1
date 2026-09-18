CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id text REFERENCES public.users(id) ON DELETE CASCADE,
    title text NOT NULL,
    content text NOT NULL,
    is_read boolean DEFAULT false,
    link_url text,
    reference_id text,
    created_at timestamp with time zone DEFAULT now()
);

-- Thêm cột reference_id nếu bảng đã tồn tại
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS reference_id text;

-- Bật Row Level Security (RLS) để bảo mật
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 1. Mở khóa Bảo mật (RLS) để Super Admin / Admin thấy được thông báo của mình
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;

CREATE POLICY "Users can view their own notifications" ON public.notifications 
FOR SELECT USING ( user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()) );

CREATE POLICY "Users can update their own notifications" ON public.notifications 
FOR UPDATE USING ( user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()) );

CREATE POLICY "Users can delete their own notifications" ON public.notifications 
FOR DELETE USING ( user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()) );

-- Cho phép thêm mới (Trigger dùng bypass nên không cần thiết, nhưng đề phòng)
CREATE POLICY "Enable insert for authenticated users" ON public.notifications FOR INSERT WITH CHECK (true);

-- 2. Viết hàm Trigger xử lý khi có Lead mới từ Landing Page
CREATE OR REPLACE FUNCTION public.handle_new_lead()
RETURNS trigger AS $$
DECLARE
    target_user RECORD;
    is_viet_tri boolean;
BEGIN
    -- Kiểm tra xem chi nhánh của Lead có chữ 'Việt Trì' không
    is_viet_tri := (NEW.branch_id IS NOT NULL AND NEW.branch_id ILIKE '%Việt Trì%');

    -- Quét tất cả Users có role là Super Admin hoặc Admin
    FOR target_user IN 
        SELECT id, role, branch_id FROM public.users 
        WHERE role IN ('Super Admin', 'Admin')
    LOOP
        -- Logic 1: Super Admin nhận TẤT CẢ thông báo
        IF target_user.role = 'Super Admin' THEN
            INSERT INTO public.notifications (user_id, title, content, link_url, reference_id)
            VALUES (target_user.id, '🎉 Đăng ký mới từ Landing Page!', 'Khách hàng ' || NEW.full_name || ' vừa điền form!', '/sales/leads', NEW.phone);
        
        -- Logic 2: Admin chi nhánh
        ELSIF target_user.role = 'Admin' THEN
            IF (target_user.branch_id = NEW.branch_id) OR (is_viet_tri AND target_user.branch_id ILIKE '%Việt Trì%') THEN
                INSERT INTO public.notifications (user_id, title, content, link_url, reference_id)
                VALUES (target_user.id, '🎉 Đăng ký mới từ Landing Page!', 'Khách hàng ' || NEW.full_name || ' thuộc chi nhánh ' || COALESCE(NEW.branch_id, '') || ' vừa điền form!', '/sales/leads', NEW.phone);
            END IF;
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Gắn Trigger vào bảng leads khi tạo mới
DROP TRIGGER IF EXISTS on_lead_created ON public.leads;
CREATE TRIGGER on_lead_created
    AFTER INSERT ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_lead();

-- 4. Viết hàm Trigger xử lý khi xóa Lead
CREATE OR REPLACE FUNCTION public.handle_delete_lead()
RETURNS trigger AS $$
BEGIN
    -- Xóa tất cả thông báo liên quan đến SĐT của Lead bị xóa
    DELETE FROM public.notifications WHERE reference_id = OLD.phone;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Gắn Trigger vào bảng leads khi xóa
DROP TRIGGER IF EXISTS on_lead_deleted ON public.leads;
CREATE TRIGGER on_lead_deleted
    BEFORE DELETE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_delete_lead();
