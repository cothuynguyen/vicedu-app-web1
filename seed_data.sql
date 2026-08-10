-- DỮ LIỆU MẪU (SEED DATA)
-- Chạy đoạn mã này trong SQL Editor của Supabase để có dữ liệu test.

-- 1. Thêm một số Nhân sự (Giáo viên)
INSERT INTO users (id, full_name, email, branch_id, department, role, status) VALUES 
('NV001', 'Nguyễn Thị Admin', 'admin@vicedu.com', 'Việt Trì 1', 'Quản lý', 'Admin', 'Chính thức'),
('NV002', 'Trần Văn Giáo Viên', 'gv_vn@vicedu.com', 'Việt Trì 1', 'Đào tạo', 'User', 'Chính thức'),
('NV003', 'John Doe (Native)', 'gv_nn@vicedu.com', 'Việt Trì 1', 'Đào tạo', 'User', 'Chính thức'),
('NV004', 'Lê Kế Toán', 'ketoan@vicedu.com', 'Việt Trì 1', 'Kế toán', 'User', 'Chính thức');

-- 2. Thêm một số Lộ trình học (Dựa theo tài liệu của VicEdu)
INSERT INTO course_levels (group_name, level_name, default_months, total_hours, default_hours_per_session) VALUES 
('Kindy', 'Kindy 1', 9, 72, 2),
('Kindy', 'Kindy 2', 9, 72, 2),
('Kids', 'Kids 1A', 12, 96, 2),
('Kids', 'Kids 1B', 12, 96, 2),
('Pre Teens', 'Pre Teens A', 12, 96, 2),
('Teens', 'Teen 1A', 12, 96, 2);
