-- Thêm cột deducted_hours vào bảng marketing_schedules để lưu số giờ bị trừ của giáo viên chính thức bị dạy thay
ALTER TABLE marketing_schedules ADD COLUMN deducted_hours NUMERIC;
