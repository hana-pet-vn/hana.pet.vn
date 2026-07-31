-- BƯỚC 03 — Gán vai chủ shop (sau khi chạy: ĐĂNG XUẤT + ĐĂNG NHẬP LẠI mới nhận vai)
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"owner"}'::jsonb
where email = 'tung.le@hana.pet';

-- Nhân viên (bỏ dấu -- và điền email khi cần):
-- update auth.users
-- set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"staff"}'::jsonb
-- where email = '<email nhân viên>';

-- Kiểm lại:
select email, raw_app_meta_data ->> 'role' as role from auth.users;
