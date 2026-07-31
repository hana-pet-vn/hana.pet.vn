-- ═══════════════════════════════════════════════════════════════════
-- PHASE 0 — PHÂN QUYỀN HANA PET ADMIN
-- Chạy trong Supabase SQL Editor. Chạy LẦN LƯỢT từng mục, không dán cả file.
-- File này chạy lại nhiều lần không sao (idempotent).
--
-- ⚠ TRƯỚC KHI CHẠY MỤC 4 (bật RLS): mở PHASE-0-rollback.sql ra để sẵn
--   trong 1 tab khác. Nếu storefront chết, dán rollback là web sống lại ngay.
-- ═══════════════════════════════════════════════════════════════════


-- ═══ MỤC 0 — KIỂM TRA TRƯỚC KHI ĐỘNG VÀO GÌ ════════════════════════
-- Chạy 3 câu này, đọc kết quả, rồi mới đi tiếp.

-- 0.1 Bảng nào đã bật RLS sẵn? (nếu có bảng đã bật mà web vẫn chạy → đã có policy cũ, phải xem trước khi đè)
select tablename, rowsecurity from pg_tables
where schemaname = 'public'
  and tablename in ('products','orders','site_config','categories','vouchers','subscribers');

-- 0.2 Có policy nào đang tồn tại không?
select tablename, policyname, cmd from pg_policies
where schemaname = 'public' order by tablename;

-- 0.3 Tên cột thật của bảng products (tham khảo, không bắt buộc)
select column_name, data_type from information_schema.columns
where table_schema = 'public' and table_name = 'products' order by ordinal_position;


-- ═══ MỤC 1 — BẢNG 5 CÔNG TẮC ═══════════════════════════════════════
create table if not exists public.staff_permissions (
  key     text primary key,
  allowed boolean not null default false,
  label   text not null
);

insert into public.staff_permissions (key, allowed, label) values
  -- edit_price BẬT sẵn theo quyết định chủ shop 31/07: nhân viên cần chỉnh giá theo camp
  ('edit_price',      true,  'Nhân viên được sửa giá bán'),
  ('add_products',    false, 'Nhân viên được thêm/xoá sản phẩm'),
  ('manage_vouchers', false, 'Nhân viên được quản lý khuyến mãi & danh mục'),
  ('edit_store',      false, 'Nhân viên được sửa trang trí gian hàng'),
  ('see_revenue',     false, 'Nhân viên được xem doanh thu')
on conflict (key) do nothing;

-- Chạy lại trên DB cũ vẫn ăn: gạt BẬT edit_price (quyết định 31/07)
update public.staff_permissions set allowed = true where key = 'edit_price';


-- ═══ MỤC 2 — HAI HÀM DÙNG CHUNG ════════════════════════════════════
-- search_path cố định: bắt buộc với security definer, tránh bị đánh tráo hàm.

create or replace function public.admin_role()
returns text language sql stable
set search_path = public as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
$$;

create or replace function public.staff_can(perm text)
returns boolean language sql stable security definer
set search_path = public as $$
  select case
    when public.admin_role() = 'owner' then true
    when public.admin_role() = 'staff'
      then coalesce((select allowed from public.staff_permissions where key = perm), false)
    else false
  end;
$$;


-- ═══ MỤC 3 — GÁN VAI ═══════════════════════════════════════════════
-- Chỉ cần EMAIL. KHÔNG BAO GIỜ dán mật khẩu vào đây.
-- Phải đăng xuất rồi đăng nhập lại mới nhận vai mới.

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"owner"}'::jsonb
where email = 'tung.le@hana.pet';

-- Nhân viên (bỏ dấu -- và điền email khi cần):
-- update auth.users
-- set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"staff"}'::jsonb
-- where email = '<email nhân viên>';

-- Kiểm lại:
select email, raw_app_meta_data ->> 'role' as role from auth.users;


-- ═══ MỤC 4 — RLS ═══════════════════════════════════════════════════
-- ĐÂY LÀ MỤC NGUY HIỂM. Chạy TỪNG BẢNG một, sau mỗi bảng mở web
-- bằng chế độ ẩn danh xem trang chủ còn sống không.

-- ─── 4.1 PRODUCTS ──────────────────────────────────────────────────
alter table public.products enable row level security;

drop policy if exists "public read products"       on public.products;
drop policy if exists "admin update products"      on public.products;
drop policy if exists "insert products by switch"  on public.products;
drop policy if exists "delete products by switch"  on public.products;

create policy "public read products" on public.products
  for select using (true);
create policy "admin update products" on public.products
  for update using (public.admin_role() in ('owner','staff'))
         with check (public.admin_role() in ('owner','staff'));
create policy "insert products by switch" on public.products
  for insert with check (public.staff_can('add_products'));
create policy "delete products by switch" on public.products
  for delete using (public.staff_can('add_products'));

-- ─── 4.2 ORDERS ────────────────────────────────────────────────────
alter table public.orders enable row level security;

drop policy if exists "admin read orders"   on public.orders;
drop policy if exists "admin update orders" on public.orders;
drop policy if exists "admin insert orders" on public.orders;

create policy "admin read orders" on public.orders
  for select using (public.admin_role() in ('owner','staff'));
create policy "admin update orders" on public.orders
  for update using (public.admin_role() in ('owner','staff'))
         with check (public.admin_role() in ('owner','staff'));

-- ★ VÁ 1 (mới, không có trong spec gốc) — cho F9 Phase 1 "Tạo đơn tay từ FB/Zalo".
--   Thiếu dòng này thì tới Phase 1 nhân viên bấm + Tạo đơn sẽ báo lỗi.
--   Đơn của khách web KHÔNG đi qua đây (dùng service key, bỏ qua RLS).
create policy "admin insert orders" on public.orders
  for insert with check (public.admin_role() in ('owner','staff'));

-- ⚠ CHƯA KIỂM ĐƯỢC: nếu web có trang tra cứu đơn / trang cảm ơn hiển thị lại
--   đơn vừa đặt bằng khoá anon, trang đó sẽ TRẮNG sau khi bật RLS.
--   Phải soi source trước. Nếu có, sửa trang đó gọi qua API server (service key).

-- ─── 4.3 SITE_CONFIG ───────────────────────────────────────────────
alter table public.site_config enable row level security;

drop policy if exists "public read config"      on public.site_config;
drop policy if exists "write config by switch"  on public.site_config;
drop policy if exists "update config by switch" on public.site_config;
drop policy if exists "delete config by switch" on public.site_config;

create policy "public read config" on public.site_config
  for select using (true);
create policy "write config by switch" on public.site_config
  for insert with check (public.staff_can('edit_store'));
create policy "update config by switch" on public.site_config
  for update using (public.staff_can('edit_store'))
         with check (public.staff_can('edit_store'));
create policy "delete config by switch" on public.site_config
  for delete using (public.staff_can('edit_store'));

-- ─── 4.4 CATEGORIES ────────────────────────────────────────────────
alter table public.categories enable row level security;

drop policy if exists "public read categories"      on public.categories;
drop policy if exists "write categories by switch"  on public.categories;
drop policy if exists "update categories by switch" on public.categories;
drop policy if exists "delete categories by switch" on public.categories;

create policy "public read categories" on public.categories
  for select using (true);
create policy "write categories by switch" on public.categories
  for insert with check (public.staff_can('manage_vouchers'));
create policy "update categories by switch" on public.categories
  for update using (public.staff_can('manage_vouchers'))
         with check (public.staff_can('manage_vouchers'));
create policy "delete categories by switch" on public.categories
  for delete using (public.staff_can('manage_vouchers'));

-- ─── 4.5 VOUCHERS ──────────────────────────────────────────────────
-- Bảng này bắt buộc phải khoá: saveVouchers hiện XOÁ SẠCH bảng rồi chèn lại.
alter table public.vouchers enable row level security;

drop policy if exists "vouchers by switch" on public.vouchers;
create policy "vouchers by switch" on public.vouchers
  for all using (public.staff_can('manage_vouchers'))
      with check (public.staff_can('manage_vouchers'));

-- ⚠ NGAY SAU KHI CHẠY DÒNG NÀY: mở web ẩn danh, đặt 1 đơn CÓ NHẬP MÃ GIẢM GIÁ.
--   Nếu báo "mã không tồn tại" → route kiểm mã đang dùng khoá anon chứ không
--   phải service key. Dán rollback mục 4.5, sửa route xong mới bật lại.

-- ─── 4.6 SUBSCRIBERS ───────────────────────────────────────────────
alter table public.subscribers enable row level security;

drop policy if exists "public insert subscribers" on public.subscribers;
drop policy if exists "owner read subscribers"    on public.subscribers;
drop policy if exists "owner delete subscribers"  on public.subscribers;

create policy "public insert subscribers" on public.subscribers
  for insert with check (true);
create policy "owner read subscribers" on public.subscribers
  for select using (public.admin_role() = 'owner');
create policy "owner delete subscribers" on public.subscribers
  for delete using (public.admin_role() = 'owner');

-- ─── 4.7 STAFF_PERMISSIONS (bảng công tắc tự bảo vệ mình) ──────────
alter table public.staff_permissions enable row level security;

drop policy if exists "admins read switches" on public.staff_permissions;
drop policy if exists "owner flips switches" on public.staff_permissions;

create policy "admins read switches" on public.staff_permissions
  for select using (public.admin_role() in ('owner','staff'));
create policy "owner flips switches" on public.staff_permissions
  for update using (public.admin_role() = 'owner')
         with check (public.admin_role() = 'owner');
-- Cố ý KHÔNG có insert/delete: 5 công tắc là cố định, chỉ gạt allowed.


-- ═══ MỤC 5 — TRIGGER CHẶN SỬA GIÁ ══════════════════════════════════
-- RLS chặn theo HÀNG, không chặn theo CỘT → phải dùng trigger cho cột giá.

-- ─── 5.1 Giá gốc (price / original) ────────────────────────────────
create or replace function public.protect_price_columns()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if public.admin_role() = 'staff' and not public.staff_can('edit_price') then
    if new.price is distinct from old.price
    or new.original is distinct from old.original then
      raise exception 'Chỉ chủ shop được sửa giá bán (hoặc bật công tắc edit_price)';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_price on public.products;
create trigger trg_protect_price
  before update on public.products
  for each row execute function public.protect_price_columns();

-- ─── 5.2 (ĐÃ BỎ 31/07) ────────────────────────────────────────────
-- Vá giá combo bị bỏ theo quyết định chủ shop: nhân viên được sửa giá
-- (điều chỉnh theo camp). Công tắc edit_price gạt sẵn BẬT ở mục 1.
-- Trigger 5.1 vẫn giữ để công tắc có tác dụng nếu sau này gạt TẮT —
-- lưu ý khi đó giá trong variants/combos (JSON) KHÔNG bị chặn.

-- ═══ MỤC 6 — TỰ KIỂM ═══════════════════════════════════════════════
select 'công tắc' as muc, count(*)::text as ket_qua from public.staff_permissions
union all
select 'policy đã tạo', count(*)::text from pg_policies where schemaname = 'public'
union all
select 'trigger giá', count(*)::text from pg_trigger where tgname = 'trg_protect_price';
-- Kỳ vọng: 5 công tắc · 21 policy · 1 trigger.
