-- 1. Thêm cột branch_id vào bảng inventory_items
ALTER TABLE inventory_items ADD COLUMN branch_id TEXT;

-- 2. Gán toàn bộ danh mục vật tư hiện tại cho chi nhánh mặc định là 'Việt Trì 1'
UPDATE inventory_items SET branch_id = 'Việt Trì 1' WHERE branch_id IS NULL;

-- 3. Nhân bản danh mục cho các chi nhánh khác và khớp lại ID trong bảng giao dịch lịch sử
DO $$
DECLARE
    item_rec RECORD;
    new_item_id UUID;
    target_branch TEXT;
    branches TEXT[] := ARRAY['Việt Trì 2', 'Lâm Thao', 'Tuyên Quang', 'Dân Hòa'];
BEGIN
    -- Lặp qua từng vật tư hiện có (đang thuộc Việt Trì 1)
    FOR item_rec IN SELECT * FROM inventory_items WHERE branch_id = 'Việt Trì 1' LOOP
        
        -- Lặp qua các chi nhánh còn lại để clone vật tư
        FOREACH target_branch IN ARRAY branches LOOP
            -- Tạo UUID ngẫu nhiên cho vật tư clone
            new_item_id := gen_random_uuid();
            
            -- Insert vật tư clone cho chi nhánh mục tiêu
            INSERT INTO inventory_items (id, category, name, image_url, unit, import_price, export_price, note, branch_id, created_at)
            VALUES (
                new_item_id,
                item_rec.category,
                item_rec.name,
                item_rec.image_url,
                item_rec.unit,
                item_rec.import_price,
                item_rec.export_price,
                item_rec.note,
                target_branch,
                item_rec.created_at
            );
            
            -- Cập nhật tất cả các giao dịch lịch sử cũ của chi nhánh đó đang trỏ tới ID cũ
            UPDATE inventory_transactions
            SET item_id = new_item_id
            WHERE branch_id = target_branch AND item_id = item_rec.id;
        END LOOP;
        
    END LOOP;
END $$;

-- 4. Đặt cột branch_id thành NOT NULL và thiết lập giá trị mặc định là 'Việt Trì 1'
ALTER TABLE inventory_items ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE inventory_items ALTER COLUMN branch_id SET DEFAULT 'Việt Trì 1';
