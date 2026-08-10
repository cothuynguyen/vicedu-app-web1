-- 1. Tự động tìm và cập nhật tất cả các khóa ngoại (Foreign Keys) đang liên kết với bảng users
-- Chuyển chúng sang chế độ ON UPDATE CASCADE để cho phép đổi Mã nhân viên
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT tc.table_name, tc.constraint_name, kcu.column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'users' AND ccu.column_name = 'id'
    LOOP
        EXECUTE 'ALTER TABLE ' || quote_ident(r.table_name) || ' DROP CONSTRAINT ' || quote_ident(r.constraint_name);
        EXECUTE 'ALTER TABLE ' || quote_ident(r.table_name) || ' ADD CONSTRAINT ' || quote_ident(r.constraint_name) || ' FOREIGN KEY (' || quote_ident(r.column_name) || ') REFERENCES users(id) ON UPDATE CASCADE ON DELETE NO ACTION';
    END LOOP;
END $$;

-- 2. Tiến hành đổi tên Mã nhân viên từ NV001 -> NV009 thành NVVT001 -> NVVT009
UPDATE users 
SET id = REPLACE(id, 'NV00', 'NVVT00') 
WHERE id IN ('NV001', 'NV002', 'NV003', 'NV004', 'NV005', 'NV006', 'NV007', 'NV008', 'NV009');
