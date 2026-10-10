-- Bổ sung cột star_points để quy định số Sao đổi quà cho học viên
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS star_points INTEGER DEFAULT 0;

-- Ghi chú cho cột
COMMENT ON COLUMN public.inventory_items.star_points IS 'Số điểm Sao cần tích lũy để đổi món quà này (0 = không áp dụng đổi sao)';
