-- ==========================================
-- VICEDU LMS - CASHBOOKS RLS POLICIES
-- ==========================================
-- Chạy đoạn mã này trong SQL Editor của Supabase để bảo mật dữ liệu Sổ Quỹ Thu Chi.

-- 1. Bật tính năng Row Level Security (RLS) cho bảng cashbooks
ALTER TABLE cashbooks ENABLE ROW LEVEL SECURITY;

-- 2. Xóa các Policy cũ nếu có để tránh xung đột
DROP POLICY IF EXISTS "Users can view cashbooks of their own branch or if they have global roles" ON cashbooks;
DROP POLICY IF EXISTS "Users can modify cashbooks of their own branch or if they have global roles" ON cashbooks;

-- 3. Tạo chính sách xem dữ liệu (SELECT)
-- Cho phép:
--   - Các vai trò toàn hệ thống (Super Admin, Giám đốc, Kế toán HO, Kiểm toán HO, Quản lý hệ thống) xem toàn bộ.
--   - Các tài khoản khác chỉ được xem dữ liệu thuộc chi nhánh của mình.
CREATE POLICY "Users can view cashbooks of their own branch or if they have global roles"
ON cashbooks FOR SELECT
USING (
  (SELECT role FROM users WHERE auth_id = auth.uid()) IN ('Super Admin', 'Giám đốc', 'Kế toán HO', 'Kiểm toán HO', 'Quản lý hệ thống')
  OR branch_id = (SELECT branch_id FROM users WHERE auth_id = auth.uid())
);

-- 4. Tạo chính sách thay đổi dữ liệu (INSERT / UPDATE / DELETE)
-- Cho phép:
--   - Các vai trò toàn hệ thống (Super Admin, Giám đốc, Kế toán HO, Kiểm toán HO, Quản lý hệ thống) thao tác trên mọi chi nhánh.
--   - Các tài khoản chi nhánh chỉ được thao tác trên dữ liệu thuộc chi nhánh của mình.
CREATE POLICY "Users can modify cashbooks of their own branch or if they have global roles"
ON cashbooks FOR ALL
USING (
  (SELECT role FROM users WHERE auth_id = auth.uid()) IN ('Super Admin', 'Giám đốc', 'Kế toán HO', 'Kiểm toán HO', 'Quản lý hệ thống')
  OR branch_id = (SELECT branch_id FROM users WHERE auth_id = auth.uid())
);
