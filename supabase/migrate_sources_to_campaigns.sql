-- ==============================================================================
-- MIGRATE SCRIPT: CHUYỂN ĐỔI NGUỒN CŨ (source_name) SANG CHIẾN DỊCH (crm_campaigns)
-- ==============================================================================

DO $$
DECLARE
    src RECORD;
    new_campaign_id UUID;
    v_branch_id TEXT;
    v_created_by TEXT;
BEGIN
    -- Lặp qua các nguồn duy nhất hiện có trong database
    FOR src IN 
        SELECT DISTINCT source_name
        FROM public.crm_customers 
        WHERE source_name IS NOT NULL 
          AND source_name != '' 
          AND campaign_id IS NULL
    LOOP
        -- Lấy ra 1 branch_id và created_by đại diện cho nguồn này
        SELECT branch_id, created_by 
        INTO v_branch_id, v_created_by
        FROM public.crm_customers
        WHERE source_name = src.source_name
        LIMIT 1;

        -- Kiểm tra xem Chiến dịch này đã được ai đó tạo tay chưa
        SELECT id INTO new_campaign_id 
        FROM public.crm_campaigns 
        WHERE name = src.source_name AND branch_id = v_branch_id 
        LIMIT 1;

        -- Nếu chưa có thì tự động tạo mới
        IF new_campaign_id IS NULL THEN
            INSERT INTO public.crm_campaigns (name, description, branch_id, status, created_by)
            VALUES (src.source_name, 'Tạo tự động từ dữ liệu Nguồn cũ', v_branch_id, 'Đang chạy', v_created_by)
            RETURNING id INTO new_campaign_id;
        END IF;

        -- Cập nhật lại toàn bộ khách hàng có source_name này thành campaign_id
        UPDATE public.crm_customers 
        SET campaign_id = new_campaign_id 
        WHERE source_name = src.source_name AND campaign_id IS NULL;
    END LOOP;
END $$;
