-- BƯỚC 06 — Khoá CẤU HÌNH TRANG. Chạy xong: mở trang chủ, giao diện phải bình thường.
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
