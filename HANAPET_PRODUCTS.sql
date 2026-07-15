-- ============================================================
-- HANAPET — nạp 2 SKU thật (thay 4 sản phẩm mẫu)
-- Chạy trong Supabase → SQL Editor → Run. Chạy lại nhiều lần OK.
-- ⚠️ GIÁ đang là ước tính từ Shopee — sửa lại trong admin nếu sai.
-- ============================================================

-- Xoá 4 sản phẩm mẫu seed cũ (nếu còn)
DELETE FROM products WHERE id IN ('p1','p2','p3','p4');

-- SKU 1: Misty Fresh (2 loại: Chai xịt / Refill)
INSERT INTO products (id,name,price,original,category,rating,stock,min_stock,sku,flash_sale,flash_end,tags,story,img,reviews,variants,variant_label,sort_order,created_at,updated_at)
VALUES (
  'misty-fresh','Misty Fresh',245000,275000,'Khử mùi',5.0,50,5,'HP-MISTY',false,0,
  'Chó, Mèo, Khử mùi',
  E'Xịt khử mùi khử khuẩn cho thú cưng.\nHết mùi sau 30 giây · Diệt 99,99% vi khuẩn · An toàn khi liếm.',
  '/products/misty-spray.png','[]'::jsonb,
  '[{"id":"v1","name":"Chai xịt","price":245000,"original":275000,"stock":50,"img":""},
    {"id":"v2","name":"Refill — Lõi thay thế","price":180000,"original":200000,"stock":50,"img":""}]'::jsonb,
  'Chọn loại',1,NOW(),NOW()
)
ON CONFLICT (id) DO UPDATE SET variants=EXCLUDED.variants, variant_label=EXCLUDED.variant_label, story=EXCLUDED.story, img=EXCLUDED.img;

-- SKU 2: Waterless Bubble Shampoo (5 mùi)
INSERT INTO products (id,name,price,original,category,rating,stock,min_stock,sku,flash_sale,flash_end,tags,story,img,reviews,variants,variant_label,sort_order,created_at,updated_at)
VALUES (
  'wbs-mini','Waterless Bubble Shampoo',165000,185000,'Tắm gội',5.0,50,5,'HP-WBS',false,0,
  'Chó, Mèo, Tắm khô',
  E'Tắm khô dạng bọt, không cần nước — sạch thơm mà không stress.\nĐầu cọ massage silicon · Dịu nhẹ cho da nhạy cảm.',
  '/products/wbs-baby-powder.png','[]'::jsonb,
  '[{"id":"v1","name":"Baby Powder","price":165000,"original":185000,"stock":50,"img":""},
    {"id":"v2","name":"Lavender","price":165000,"original":185000,"stock":50,"img":""},
    {"id":"v3","name":"Peach Yogurt","price":165000,"original":185000,"stock":50,"img":""},
    {"id":"v4","name":"Quince","price":165000,"original":185000,"stock":50,"img":""},
    {"id":"v5","name":"Cotton Candy","price":165000,"original":185000,"stock":50,"img":""}]'::jsonb,
  'Chọn mùi hương',2,NOW(),NOW()
)
ON CONFLICT (id) DO UPDATE SET variants=EXCLUDED.variants, variant_label=EXCLUDED.variant_label, story=EXCLUDED.story, img=EXCLUDED.img;

-- Danh mục khớp
INSERT INTO categories (name) VALUES ('Khử mùi'),('Tắm gội') ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- XONG.
-- ============================================================
