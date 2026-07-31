-- BƯỚC 08 — Khoá MÃ GIẢM GIÁ. Chạy xong: web ẩn danh NHẬP THỬ 1 MÃ GIẢM GIÁ phải ăn. Hỏng → dán file 99.
-- ─── 4.5 VOUCHERS ──────────────────────────────────────────────────
-- Bảng này bắt buộc phải khoá: saveVouchers hiện XOÁ SẠCH bảng rồi chèn lại.
alter table public.vouchers enable row level security;

drop policy if exists "vouchers by switch" on public.vouchers;
create policy "vouchers by switch" on public.vouchers
  for all using (public.staff_can('manage_vouchers'))
      with check (public.staff_can('manage_vouchers'));

-- ⚠ NGAY SAU KHI CHẠY DÒNG NÀY: mở web ẩn danh, đặt 1 đơn CÓ NHẬP MÃ GIẢM GIÁ.
--   Nếu báo "mã không tồn tại" → route kiểm mã đang dùng khoá anon chứ không
--   phải service key. Dán rollback mục 4.5, sửa route xong mới bật lại.
