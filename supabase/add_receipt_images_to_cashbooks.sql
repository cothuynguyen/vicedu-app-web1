-- Thêm cột receipt_images lưu mảng link ảnh vào bảng cashbooks
ALTER TABLE cashbooks ADD COLUMN IF NOT EXISTS receipt_images TEXT[] DEFAULT '{}';
