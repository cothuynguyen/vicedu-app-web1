-- 1. Thêm cột schedule_type để phân biệt loại lịch (mặc định là 'Marketing')
ALTER TABLE marketing_schedules ADD COLUMN schedule_type TEXT DEFAULT 'Marketing';

-- 2. Thêm cột class_id liên kết tới lớp học được dạy thay
ALTER TABLE marketing_schedules ADD COLUMN class_id TEXT REFERENCES classes(id) ON DELETE SET NULL;

-- 3. Thêm cột substituted_teacher_name lưu tên giáo viên chính thức bị thay thế
ALTER TABLE marketing_schedules ADD COLUMN substituted_teacher_name TEXT;

-- 4. Tạo chỉ mục tối ưu hóa tìm kiếm theo lớp học
CREATE INDEX IF NOT EXISTS idx_marketing_schedules_class_id ON marketing_schedules(class_id);
