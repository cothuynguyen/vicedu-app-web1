-- Thêm cột Điểm chạm (touchpoints) lưu trữ dạng JSONB vào bảng Học viên (students)
ALTER TABLE students
ADD COLUMN IF NOT EXISTS touchpoints JSONB DEFAULT '[]'::jsonb;
