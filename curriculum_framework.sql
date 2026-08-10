-- ==========================================
-- VICEDU LMS - TRAINING PROGRAM FRAMEWORK SCHEMA
-- ==========================================

CREATE TABLE IF NOT EXISTS curriculum_framework (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program TEXT NOT NULL, -- KINDY, KIDS, TEENS, IELTS, GN, Special course
    level TEXT NOT NULL,
    coursebook_title TEXT,
    cefr_level TEXT,
    cambridge_certificate TEXT,
    course_syllabus_url TEXT,
    student_book_url TEXT,
    audio_url TEXT,
    workbook_url TEXT,
    pencil_paper_test_url TEXT,
    listening_test_audio_url TEXT,
    speaking_test_url TEXT,
    answer_key_url TEXT,
    frame_question_set_url TEXT,
    flashcards_url TEXT,
    video_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE curriculum_framework ENABLE ROW LEVEL SECURITY;

-- 1. Quyền ĐỌC: Tất cả user đã đăng nhập đều xem được tài liệu
DROP POLICY IF EXISTS "Allow read access for all authenticated users" ON curriculum_framework;
CREATE POLICY "Allow read access for all authenticated users"
ON curriculum_framework
FOR SELECT
TO authenticated
USING (true);

-- 2. Quyền THÊM/SỬA/XÓA: Chỉ dành cho Super Admin hoặc Trưởng phòng Đào tạo (Giáo viên + Trưởng phòng Đào tạo)
DROP POLICY IF EXISTS "Allow modify access for Super Admin and Head of Training" ON curriculum_framework;
CREATE POLICY "Allow modify access for Super Admin and Head of Training"
ON curriculum_framework
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.email = auth.jwt()->>'email' 
        AND (
            users.role = 'Super Admin' 
            OR (users.role = 'Giáo viên' AND users.position = 'Trưởng phòng Đào tạo')
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.email = auth.jwt()->>'email' 
        AND (
            users.role = 'Super Admin' 
            OR (users.role = 'Giáo viên' AND users.position = 'Trưởng phòng Đào tạo')
        )
    )
);
