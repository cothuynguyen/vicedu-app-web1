-- Thêm cột commitment_images kiểu JSONB vào bảng students để lưu mảng đối tượng:
-- [{"url": "...", "uploaded_at": "...", "uploaded_by": "..."}]
ALTER TABLE students ADD COLUMN IF NOT EXISTS commitment_images JSONB DEFAULT '[]';
