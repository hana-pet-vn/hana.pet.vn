-- BƯỚC 09 — Khoá ĐĂNG KÝ NHẬN TIN. Chạy xong: web ẩn danh đăng ký email thử phải được.
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
