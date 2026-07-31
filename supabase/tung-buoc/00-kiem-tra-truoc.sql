-- BƯỚC 00 — Kiểm tra hiện trạng (chỉ ĐỌC, không sửa gì)
-- Dán cả file, bấm Run. Đọc kết quả rồi sang file 01.
-- 0.1 Bảng nào đã bật RLS sẵn? (nếu có bảng đã bật mà web vẫn chạy → đã có policy cũ, phải xem trước khi đè)
select tablename, rowsecurity from pg_tables
where schemaname = 'public'
  and tablename in ('products','orders','site_config','categories','vouchers','subscribers');

-- 0.2 Có policy nào đang tồn tại không?
select tablename, policyname, cmd from pg_policies
where schemaname = 'public' order by tablename;

-- 0.3 Tên cột thật của bảng products (tham khảo, không bắt buộc)
select column_name, data_type from information_schema.columns
where table_schema = 'public' and table_name = 'products' order by ordinal_position;
