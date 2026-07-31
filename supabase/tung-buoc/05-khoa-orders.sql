-- BƯỚC 05 — Khoá bảng ĐƠN HÀNG. Chạy xong: web ẩn danh ĐẶT THỬ 1 ĐƠN phải thành công.
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
