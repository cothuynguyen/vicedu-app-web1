-- Chạy đoạn mã này trong SQL Editor của Supabase để cập nhật thêm các cột còn thiếu
ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS nationality TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS position TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT;
