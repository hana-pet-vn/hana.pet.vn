-- BƯỚC 10 — Bảng công tắc tự bảo vệ mình. Không ảnh hưởng web khách.
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
