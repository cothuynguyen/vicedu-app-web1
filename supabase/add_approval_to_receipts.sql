-- Thêm các cột phục vụ tính năng duyệt phiếu thu vào bảng receipts
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Chờ duyệt';
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
