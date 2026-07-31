-- BƯỚC 07 — Khoá DANH MỤC. Chạy xong: trang chủ vẫn hiện danh mục sản phẩm.
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
