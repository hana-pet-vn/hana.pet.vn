-- BƯỚC 02 — Tạo 2 hàm kiểm quyền (an toàn, chưa khoá gì)
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
