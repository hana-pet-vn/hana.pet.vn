-- ============================================================
-- Thêm cột 'images' (nhiều ảnh gallery) vào bảng products
-- Chạy trong Supabase → SQL Editor → Run. An toàn, chạy lại OK.
-- Sửa lỗi: "Could not find the 'images' column of 'products'"
-- ============================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Cột video (đa nguồn YouTube/TikTok/Instagram) — thêm luôn cho chắc
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS video_url TEXT NOT NULL DEFAULT '';

-- Banner riêng cho từng sản phẩm
ALTER TABLE products ADD COLUMN IF NOT EXISTS banner TEXT NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS banner_video TEXT NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS banner_text TEXT NOT NULL DEFAULT '';

-- ============================================================
-- XONG. Không có dòng đỏ là thành công.
-- ============================================================
