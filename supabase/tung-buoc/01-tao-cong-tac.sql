-- BƯỚC 01 — Tạo bảng 5 công tắc (an toàn, chưa khoá gì)
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
