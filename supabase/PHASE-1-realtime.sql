-- supabase/PHASE-1-realtime.sql
-- ─────────────────────────────────────────────────────────────────────
-- Phase 1 (F1): bật realtime cho bảng orders để trang Đơn hàng /admin2
-- tự cập nhật (đơn mới tự hiện, badge tự nhảy, chuông topbar reo)
-- mà nhân viên không phải F5.
--
-- Chạy MỘT LẦN trong Supabase Dashboard → SQL Editor.
-- An toàn chạy lại: có kiểm tra tồn tại trước khi thêm.
-- ─────────────────────────────────────────────────────────────────────

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;

-- Kiểm tra lại (phải thấy dòng 'orders'):
select tablename from pg_publication_tables where pubname = 'supabase_realtime';
