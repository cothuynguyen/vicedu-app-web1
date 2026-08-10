-- ==============================================================================
-- TELESALE MIGRATION: Thêm trường quản lý cuộc gọi vào crm_customers
-- Chạy script này trên Supabase Dashboard > SQL Editor
-- ==============================================================================

-- Bước 1: Thêm các cột telesale mới
ALTER TABLE public.crm_customers
  ADD COLUMN IF NOT EXISTS source_name    TEXT,
  ADD COLUMN IF NOT EXISTS call_count     INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_called_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS callback_date  DATE,
  ADD COLUMN IF NOT EXISTS call_result    TEXT,
  ADD COLUMN IF NOT EXISTS lead_status    TEXT DEFAULT 'Chưa gọi';

-- Bước 2: Cập nhật tất cả khách hàng hiện có → lead_status = 'Chưa gọi'
UPDATE public.crm_customers
SET lead_status = 'Chưa gọi'
WHERE lead_status IS NULL;

-- Bước 3: Thêm index để query nhanh hơn (callback_date, lead_status)
CREATE INDEX IF NOT EXISTS idx_crm_customers_lead_status
  ON public.crm_customers(lead_status);

CREATE INDEX IF NOT EXISTS idx_crm_customers_callback_date
  ON public.crm_customers(callback_date);

CREATE INDEX IF NOT EXISTS idx_crm_customers_phone
  ON public.crm_customers(phone);

-- Xác nhận kết quả
SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'crm_customers'
  AND column_name IN ('source_name', 'call_count', 'last_called_at', 'callback_date', 'call_result', 'lead_status')
ORDER BY column_name;
