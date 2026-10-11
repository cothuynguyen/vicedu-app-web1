-- Bổ sung cột min_stock để quy định Định mức tồn tối thiểu an toàn cho từng mặt hàng
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS min_stock INTEGER DEFAULT 5;

-- Ghi chú cho cột
COMMENT ON COLUMN public.inventory_items.min_stock IS 'Định mức tồn kho tối thiểu an toàn để cảnh báo sắp hết hàng (mặc định: 5)';
