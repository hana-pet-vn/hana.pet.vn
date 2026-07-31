-- DỌN 12 LUẬT CŨ đang đè lên khoá mới. Dán cả file, bấm Run.
-- Chỉ xoá luật đời cũ (tên viết Hoa) — 21 luật mới giữ nguyên.

drop policy if exists "Admin all categories"      on public.categories;
drop policy if exists "Public read categories"    on public.categories;

drop policy if exists "Admin all orders"          on public.orders;

drop policy if exists "Admin all products"        on public.products;
drop policy if exists "Public read products"      on public.products;

drop policy if exists "Admin all config"          on public.site_config;
drop policy if exists "Public read config"        on public.site_config;
drop policy if exists "site_config read"          on public.site_config;
drop policy if exists "site_config write"         on public.site_config;

drop policy if exists "Admin read subscribers"    on public.subscribers;
drop policy if exists "Public insert subscribers" on public.subscribers;

drop policy if exists "Admin all vouchers"        on public.vouchers;

-- Tự kiểm: phải ra ĐÚNG 21
select count(*) as policy_con_lai from pg_policies where schemaname = 'public';
