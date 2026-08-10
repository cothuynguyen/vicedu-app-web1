-- Thêm cột branches để lưu trữ mảng chi nhánh được phép truy cập tài liệu
-- Mặc định là '{"Tất cả"}' để các tài liệu cũ vẫn hiển thị cho mọi người
ALTER TABLE public.internal_trainings 
ADD COLUMN IF NOT EXISTS branches TEXT[] NOT NULL DEFAULT '{"Tất cả"}';
