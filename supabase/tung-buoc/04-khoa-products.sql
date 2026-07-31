-- BƯỚC 04 — Khoá bảng SẢN PHẨM. Chạy xong: mở web ẨN DANH → trang chủ phải còn hiện sản phẩm.
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
