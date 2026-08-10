-- ==============================================================================
-- FIX SCRIPT: CẬP NHẬT LẠI CHI NHÁNH CHO CÁC CHIẾN DỊCH BỊ NHẦM
-- ==============================================================================

-- 1. Chuyển 6 Chiến dịch cụ thể về Dân Hòa
UPDATE public.crm_campaigns
SET branch_id = 'Dân Hòa'
WHERE name IN (
    'TOP 100 trường TH Cao dương',
    'Khách hàng Diệu chăm sóc',
    'KH cô Ly',
    'KH cô Diệu',
    'KH cô Hươnh',
    'TH Dân Hòa 2026'
);

-- 2. Chuyển TẤT CẢ các chiến dịch còn lại về Việt Trì 1 
-- (Bao gồm cả các chiến dịch đang bị gán là Hệ thống hoặc Dân Hòa mà không thuộc danh sách trên)
UPDATE public.crm_campaigns
SET branch_id = 'Việt Trì 1'
WHERE name NOT IN (
    'TOP 100 trường TH Cao dương',
    'Khách hàng Diệu chăm sóc',
    'KH cô Ly',
    'KH cô Diệu',
    'KH cô Hươnh',
    'TH Dân Hòa 2026'
);

-- ==============================================================================
-- Lưu ý: Sau khi chạy lệnh này, tất cả chiến dịch cũ đã được quy về đúng 2 nhánh!
-- ==============================================================================
