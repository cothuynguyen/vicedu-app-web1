-- Thêm cột số giờ còn lại và trạng thái cho Bảng Hóa đơn (Enrollments)
ALTER TABLE enrollments
ADD COLUMN IF NOT EXISTS remaining_hours INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';

-- Khởi tạo số giờ còn lại = số giờ đăng ký cho các hóa đơn hiện hữu
UPDATE enrollments 
SET remaining_hours = registered_hours 
WHERE remaining_hours = 0 OR remaining_hours IS NULL;

-- Thêm cột hóa đơn (enrollment_id) vào bảng Xếp lớp (class_students)
ALTER TABLE class_students
ADD COLUMN IF NOT EXISTS enrollment_id UUID REFERENCES enrollments(id);
