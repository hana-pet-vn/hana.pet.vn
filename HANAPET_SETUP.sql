-- ============================================================
-- HANAPET — FULL DATABASE SETUP
-- Run this ONCE in: Supabase → SQL Editor → New Query
-- This creates all tables + applies all security fixes.
-- Safe to run even if some tables already exist.
-- ============================================================

-- ── 1. TABLES ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS site_config (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  price       INTEGER NOT NULL,
  original    INTEGER NOT NULL,
  category    TEXT NOT NULL,
  rating      NUMERIC(3,1) DEFAULT 4.5,
  stock       INTEGER DEFAULT 0,
  min_stock   INTEGER DEFAULT 5,
  sku         TEXT DEFAULT '',
  flash_sale  BOOLEAN DEFAULT FALSE,
  flash_end   BIGINT DEFAULT 0,
  tags        TEXT DEFAULT '',
  story       TEXT DEFAULT '',
  img         TEXT DEFAULT '',
  reviews     JSONB DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id            TEXT PRIMARY KEY,
  code          TEXT NOT NULL UNIQUE,
  status        TEXT DEFAULT 'Pending',
  customer      JSONB NOT NULL,
  items         JSONB NOT NULL,
  total         INTEGER NOT NULL,
  subtotal      INTEGER DEFAULT 0,
  discount      INTEGER DEFAULT 0,
  disc_pct      INTEGER DEFAULT 0,
  voucher       TEXT DEFAULT '',
  shipping      TEXT DEFAULT 'GHN',
  shipping_fee  INTEGER DEFAULT 0,
  tracking_code TEXT DEFAULT '',
  est_delivery  TEXT DEFAULT '',
  source        TEXT DEFAULT 'website',
  note          TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS subscribers (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. ADD COLUMNS (in case orders table already existed without these) ────────

ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_fee INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal     INTEGER DEFAULT 0;

-- ── 3. INDEXES ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_orders_tracking_code ON orders(tracking_code);
CREATE INDEX IF NOT EXISTS idx_orders_status        ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at    ON orders(created_at DESC);

-- ── 4. ROW LEVEL SECURITY ─────────────────────────────────────────────────────

ALTER TABLE products    ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read products"      ON products;
DROP POLICY IF EXISTS "Public read categories"    ON categories;
DROP POLICY IF EXISTS "Public read config"        ON site_config;
DROP POLICY IF EXISTS "Public insert orders"      ON orders;
DROP POLICY IF EXISTS "Public insert subscribers" ON subscribers;
DROP POLICY IF EXISTS "Admin all products"        ON products;
DROP POLICY IF EXISTS "Admin all orders"          ON orders;
DROP POLICY IF EXISTS "Admin all config"          ON site_config;
DROP POLICY IF EXISTS "Admin read subscribers"    ON subscribers;

CREATE POLICY "Public read products"   ON products    FOR SELECT USING (true);
CREATE POLICY "Public read categories" ON categories  FOR SELECT USING (true);
CREATE POLICY "Public read config"     ON site_config FOR SELECT USING (true);

CREATE POLICY "Public insert subscribers" ON subscribers FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin all products"     ON products    FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin all orders"       ON orders      FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin all config"       ON site_config FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin read subscribers" ON subscribers FOR SELECT USING (auth.role() = 'authenticated');

-- ── 5. SUPABASE STORAGE BUCKET ────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('hanapet-media', 'hanapet-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read hanapet-media"  ON storage.objects;
DROP POLICY IF EXISTS "Admin upload hanapet-media" ON storage.objects;
DROP POLICY IF EXISTS "Admin update hanapet-media" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete hanapet-media" ON storage.objects;

CREATE POLICY "Public read hanapet-media"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'hanapet-media' );

CREATE POLICY "Admin upload hanapet-media"
  ON storage.objects FOR INSERT
  WITH CHECK ( bucket_id = 'hanapet-media' AND auth.role() = 'authenticated' );

CREATE POLICY "Admin update hanapet-media"
  ON storage.objects FOR UPDATE
  USING ( bucket_id = 'hanapet-media' AND auth.role() = 'authenticated' );

CREATE POLICY "Admin delete hanapet-media"
  ON storage.objects FOR DELETE
  USING ( bucket_id = 'hanapet-media' AND auth.role() = 'authenticated' );

-- ── 6. SAMPLE DATA (chỉ nạp khi bảng trống — xoá/sửa thoải mái trong admin) ────

INSERT INTO categories (name)
SELECT name FROM (VALUES ('Đồ ăn'), ('Phụ kiện')) AS v(name)
WHERE NOT EXISTS (SELECT 1 FROM categories LIMIT 1);

INSERT INTO products
SELECT * FROM (VALUES
  ('p1','Pate cho mèo',35000,45000,'Đồ ăn',4.9,50,5,'HP-PATE-001',false,0,
   'Mèo, Ăn dặm','Pate thơm ngon giàu dinh dưỡng cho mèo mọi lứa tuổi.',
   'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&h=400&fit=crop',
   '[]'::jsonb, NOW(),NOW()),
  ('p2','Vòng cổ chuông',29000,39000,'Phụ kiện',5.0,30,5,'HP-VC-001',false,0,
   'Chó, Mèo','Vòng cổ có chuông xinh xắn, nhiều màu.',
   'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&h=400&fit=crop',
   '[]'::jsonb, NOW(),NOW()),
  ('p3','Đồ chơi gặm xương',49000,65000,'Phụ kiện',4.7,20,5,'HP-DC-001',false,0,
   'Chó','Đồ chơi gặm giúp cún sạch răng, đỡ buồn miệng.',
   'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&h=400&fit=crop',
   '[]'::jsonb, NOW(),NOW()),
  ('p4','Hạt cho chó con',120000,150000,'Đồ ăn',4.8,40,5,'HP-HAT-001',false,0,
   'Chó, Puppy','Hạt dinh dưỡng cho chó con dưới 12 tháng.',
   'https://images.unsplash.com/photo-1568640347023-a616a30bc3bd?w=400&h=400&fit=crop',
   '[]'::jsonb, NOW(),NOW())
) AS v(id,name,price,original,category,rating,stock,min_stock,sku,flash_sale,flash_end,
        tags,story,img,reviews,created_at,updated_at)
WHERE NOT EXISTS (SELECT 1 FROM products LIMIT 1);

INSERT INTO site_config (key, value, updated_at)
SELECT key, value, NOW() FROM (VALUES
  ('brand',    '{"name":"Hanapet","tagline":"Vì thú cưng của bạn 🐾","primary":"#1b295b","secondary":"#ffffff","logoText":"HP"}'::jsonb),
  ('popup',    '{"enabled":true,"delayMs":3500,"title":"Giảm ngay 15%!","body":"Đăng ký để nhận mã giảm giá đầu tiên","btnLabel":"Nhận mã ngay 🎁","successTitle":"Hanapet!","successBody":"Code giảm giá đang được gửi đến Email của bạn","voucherCode":"WELCOME15"}'::jsonb),
  ('banners',  '[{"id":"b1","title":"Hanapet","sub":"Vì thú cưng của bạn 🐾","cta":"Mua ngay","img":"https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=1200&h=400&fit=crop","bg":"#1b295b"},{"id":"b2","title":"Flash Sale!","sub":"Giảm đến 30% — Số lượng có hạn","cta":"Săn ngay ⚡","img":"https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&h=400&fit=crop","bg":"#FF3D00"}]'::jsonb),
  ('trustbar', '[{"id":"t1","icon":"🚀","title":"Giao hàng toàn quốc","sub":"GHN & GHTK"},{"id":"t2","icon":"🐾","title":"Vì thú cưng","sub":"Sản phẩm chọn lọc"},{"id":"t3","icon":"🔄","title":"Đổi trả trong 7 ngày","sub":"Không cần lý do"},{"id":"t4","icon":"⭐","title":"Khách hàng yêu thích","sub":"Đánh giá trung bình 4.8/5"}]'::jsonb),
  ('flashbar', '{"title":"⚡ Flash Sale!","sub":"Nhanh tay trước khi hết giờ"}'::jsonb),
  ('about',    '{"heading":"Vì thú cưng của bạn 🐾","body":"Hanapet — cửa hàng đồ dùng và phụ kiện thú cưng tại Việt Nam. Chúng tôi chọn lọc từng sản phẩm để các bé cưng của bạn luôn khoẻ mạnh và hạnh phúc.","socialHeading":"Kết nối với chúng tôi 📱"}'::jsonb),
  ('footer',   '{"city":"Hà Nội, Việt Nam","tagline2":"Đồ dùng thú cưng · Giao hàng toàn quốc ❤️"}'::jsonb),
  ('socials',  '[{"id":"s1","name":"Facebook","icon":"f","color":"#1877f2","url":"https://facebook.com"},{"id":"s2","name":"Zalo","icon":"Z","color":"#0068ff","url":"https://zalo.me"},{"id":"s3","name":"Instagram","icon":"ig","color":"#e1306c","url":"https://instagram.com"},{"id":"s4","name":"TikTok","icon":"tt","color":"#010101","url":"https://tiktok.com"}]'::jsonb)
) AS v(key, value)
ON CONFLICT (key) DO NOTHING;

-- ── 7. CÁC MIGRATION MỚI NHẤT (variants, ảnh mobile, TikTok, sort order) ───────

ALTER TABLE products ADD COLUMN IF NOT EXISTS variants JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS variant_label TEXT NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS img_mobile TEXT NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS tiktok_url TEXT NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order BIGINT NOT NULL DEFAULT 0;

UPDATE products SET sort_order = sub.rn
FROM (SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn FROM products) sub
WHERE products.id = sub.id AND products.sort_order = 0;

-- Quyền ghi categories cho admin
DROP POLICY IF EXISTS "Admin all categories" ON categories;
CREATE POLICY "Admin all categories" ON categories FOR ALL USING (auth.role() = 'authenticated');

-- ── 8. VOUCHERS — bảng riêng, KHÔNG đọc công khai ─────────────────────────────

CREATE TABLE IF NOT EXISTS vouchers (
  id         SERIAL PRIMARY KEY,
  code       TEXT NOT NULL UNIQUE,
  pct        INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin all vouchers" ON vouchers;
CREATE POLICY "Admin all vouchers" ON vouchers FOR ALL USING (auth.role() = 'authenticated');

INSERT INTO vouchers (code, pct) VALUES
  ('HANAPET10', 10),
  ('WELCOME15', 15),
  ('PET20', 20)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- XONG. Không có dòng lỗi đỏ nào bên dưới là thành công.
-- ============================================================
