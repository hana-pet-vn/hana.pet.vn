-- ═══════════════════════════════════════════════════════════════════
-- PHASE 0 — RỔ CỨU HOẢ
-- Mở sẵn file này trong 1 tab Supabase SQL Editor TRƯỚC KHI chạy mục 4
-- của file migration. Web chết → dán phần tương ứng → web sống lại.
-- ═══════════════════════════════════════════════════════════════════


-- ═══ CỨU NHANH — TẮT KHOÁ MỘT BẢNG ═════════════════════════════════
-- Dùng khi vừa bật RLS một bảng xong thì web hỏng. Chỉ tắt đúng bảng đó.

-- alter table public.products     disable row level security;
-- alter table public.orders       disable row level security;
-- alter table public.site_config  disable row level security;
-- alter table public.categories   disable row level security;
-- alter table public.vouchers     disable row level security;   ← hay gặp nhất (mã giảm giá)
-- alter table public.subscribers  disable row level security;


-- ═══ CỨU TOÀN BỘ — TRẢ VỀ NHƯ TRƯỚC PHASE 0 ════════════════════════
-- Chạy cả khối này là quay lại y như cũ. Dữ liệu KHÔNG mất, chỉ gỡ khoá.

alter table public.products           disable row level security;
alter table public.orders             disable row level security;
alter table public.site_config        disable row level security;
alter table public.categories         disable row level security;
alter table public.vouchers           disable row level security;
alter table public.subscribers        disable row level security;
alter table public.staff_permissions  disable row level security;

drop policy if exists "public read products"        on public.products;
drop policy if exists "admin update products"       on public.products;
drop policy if exists "insert products by switch"   on public.products;
drop policy if exists "delete products by switch"   on public.products;
drop policy if exists "admin read orders"           on public.orders;
drop policy if exists "admin update orders"         on public.orders;
drop policy if exists "admin insert orders"         on public.orders;
drop policy if exists "public read config"          on public.site_config;
drop policy if exists "write config by switch"      on public.site_config;
drop policy if exists "update config by switch"     on public.site_config;
drop policy if exists "delete config by switch"     on public.site_config;
drop policy if exists "public read categories"      on public.categories;
drop policy if exists "write categories by switch"  on public.categories;
drop policy if exists "update categories by switch" on public.categories;
drop policy if exists "delete categories by switch" on public.categories;
drop policy if exists "vouchers by switch"          on public.vouchers;
drop policy if exists "public insert subscribers"   on public.subscribers;
drop policy if exists "owner read subscribers"      on public.subscribers;
drop policy if exists "owner delete subscribers"    on public.subscribers;
drop policy if exists "admins read switches"        on public.staff_permissions;
drop policy if exists "owner flips switches"        on public.staff_permissions;

drop trigger  if exists trg_protect_price on public.products;
drop function if exists public.protect_price_columns();

-- Hai dòng dưới CỐ Ý để dấu -- : giữ lại hàm và bảng công tắc thì lần bật lại
-- không phải làm từ đầu, mà chúng cũng không gây hại khi RLS đã tắt.
-- drop function if exists public.staff_can(text);
-- drop function if exists public.admin_role();
-- drop table    if exists public.staff_permissions;

-- Vai trong app_metadata KHÔNG bị gỡ ở đây — vô hại khi RLS tắt, và gỡ đi
-- thì lần sau phải gán lại + bắt mọi người đăng nhập lại.
