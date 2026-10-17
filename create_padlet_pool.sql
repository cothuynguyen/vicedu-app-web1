-- ==============================================================================
-- BẢNG KHO LINK & API PADLET DỰ TRỮ (PADLET POOL INVENTORY)
-- Giải pháp tự động hóa cấp link Padlet và API Padlet cho học viên mới của VicEdu
-- ==============================================================================

CREATE TABLE IF NOT EXISTS padlet_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  padlet_url TEXT NOT NULL,
  padlet_api TEXT NOT NULL,
  status TEXT DEFAULT 'available', -- 'available' (sẵn sàng), 'assigned' (đã cấp)
  assigned_to_student_id TEXT,
  assigned_to_student_name TEXT,
  assigned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  note TEXT
);

-- Index tối ưu tốc độ lấy link FIFO (link nào nạp trước cấp trước)
CREATE INDEX IF NOT EXISTS idx_padlet_pool_status_created ON padlet_pool (status, created_at ASC);

-- Row Level Security (RLS)
ALTER TABLE padlet_pool ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cho phép đọc ghi kho Padlet" ON padlet_pool;
CREATE POLICY "Cho phép đọc ghi kho Padlet" ON padlet_pool FOR ALL USING (true);
