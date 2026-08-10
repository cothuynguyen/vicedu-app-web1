-- ==========================================
-- VICEDU LMS - DATABASE SCHEMA
-- ==========================================

-- Bảng 1: users (Danh sách Nhân sự / Phân quyền)
CREATE TABLE users (
    id TEXT PRIMARY KEY, -- Ví dụ: NV001
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    branch_id TEXT NOT NULL, -- Ví dụ: Việt Trì 1, Lâm Thao...
    department TEXT NOT NULL, -- Đào tạo, Tư vấn, Kế toán, Quản lý
    role TEXT NOT NULL DEFAULT 'User', -- Admin, User
    status TEXT NOT NULL DEFAULT 'Thử việc', -- Chính thức, Thử việc, Nghỉ việc
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Bảng 1.1: course_levels (Danh mục Lộ trình học)
CREATE TABLE course_levels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_name TEXT NOT NULL, -- Kindy, Kids, Teen...
    level_name TEXT NOT NULL, -- Kindy 1, Kids 1A...
    default_months INTEGER NOT NULL,
    total_hours INTEGER NOT NULL,
    default_hours_per_session NUMERIC NOT NULL DEFAULT 2
);

-- Bảng 2: classes (Danh mục Lớp học)
CREATE TABLE classes (
    id TEXT PRIMARY KEY, -- Ví dụ: Vic Edu - Kindy 9.1
    branch_id TEXT NOT NULL,
    course_level_id UUID REFERENCES course_levels(id),
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Đang mở', -- Đang mở, Đã đóng
    foreign_teacher_id TEXT REFERENCES users(id),
    vietnamese_teacher_id TEXT REFERENCES users(id),
    room TEXT,
    tuition_fee NUMERIC DEFAULT 0,
    expected_students INTEGER DEFAULT 0,
    start_date DATE,
    end_date DATE,
    total_sessions INTEGER DEFAULT 0,
    hours_per_session NUMERIC DEFAULT 2,
    zalo_group_link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Bảng 2.1: class_sessions (Danh sách Buổi học của Lớp)
CREATE TABLE class_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id TEXT REFERENCES classes(id) ON DELETE CASCADE,
    session_number INTEGER NOT NULL, -- 1, 2, 3...
    date DATE,
    content TEXT
);

-- Bảng 3: students (Hồ sơ học viên)
CREATE TABLE students (
    id TEXT PRIMARY KEY, -- Ví dụ: VIC001
    branch_id TEXT NOT NULL,
    full_name TEXT NOT NULL,
    nickname TEXT,
    date_of_birth DATE,
    parent_name TEXT,
    parent_phone TEXT,
    status TEXT NOT NULL DEFAULT 'Đang học', -- Đang học, Nghỉ học
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Bảng 4: enrollments (Đăng ký / Phiếu thu)
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    branch_id TEXT NOT NULL,
    course_level_id UUID REFERENCES course_levels(id),
    registered_hours INTEGER NOT NULL,
    bonus_hours INTEGER DEFAULT 0,
    tuition_fee NUMERIC NOT NULL,
    payment_method TEXT NOT NULL, -- Trả thẳng, Trả góp
    accountant_id TEXT REFERENCES users(id),
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Bảng 4.1: installments (Theo dõi Trả góp)
CREATE TABLE installments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id UUID REFERENCES enrollments(id) ON DELETE CASCADE,
    student_id TEXT REFERENCES students(id),
    card_swiped_amount NUMERIC DEFAULT 0,
    installment_amount NUMERIC DEFAULT 0,
    installment_months INTEGER DEFAULT 0,
    interest_fee NUMERIC DEFAULT 0,
    bank_submission_status TEXT DEFAULT 'Chưa gửi', -- Đã gửi, Chưa gửi
    conversion_status TEXT DEFAULT 'Pending', -- Done, Pending
    expected_end_date DATE
);

-- Bảng 5: attendance (Nhật ký Điểm danh)
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id UUID REFERENCES enrollments(id) ON DELETE CASCADE,
    class_session_id UUID REFERENCES class_sessions(id) ON DELETE CASCADE,
    presence_status TEXT NOT NULL, -- Có mặt, Vắng phép, Không phép, Bảo lưu
    homework_status TEXT, -- Có làm, Không làm, Không giao
    teacher_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

-- Ví dụ về Policy: Nhân sự chỉ xem được học sinh của Chi nhánh mình
-- (Trong thực tế cần kết nối với Auth của Supabase, ở đây là ví dụ minh họa logic RLS)
/*
CREATE POLICY "Users can only see students in their branch"
ON students
FOR SELECT
USING (branch_id = (SELECT branch_id FROM users WHERE email = auth.jwt()->>'email'));
*/
