# Lắp bộ khung /admin2 vào dự án — 3 bước

*Phase 0 phần code. Làm SAU khi đã chạy PHASE-0-migration.sql.*

## Bước 1 — Chép thư mục
Chép nguyên thư mục `app/admin2/` trong gói này vào `app/` của dự án
(nằm cạnh `app/admin/` cũ — hai bản chạy song song, không đụng nhau).

## Bước 2 — Thay middleware
Thay file `middleware.js` ở GỐC dự án bằng file `middleware.js` trong gói này.
(Bản mới giữ nguyên 100% hành vi của /admin cũ, chỉ thêm luật cho /admin2.)

## Bước 3 — Chạy thử
```
npm run dev
```
Mở `http://localhost:3000/admin2` → phải bị đưa về trang đăng nhập.
Đăng nhập bằng tài khoản chủ shop → thấy sidebar 6 mục.

## Sau đó: nghiệm thu theo checklist 6 ô trong PHASE-0-spec.md
Lưu ý ô số 3 đã ĐỔI theo quyết định 31/07: công tắc sửa giá BẬT sẵn
→ nhân viên sửa giá phải ĐƯỢC (gạt tắt mới bị chặn).

## Có gì trong gói
```
middleware.js                  ← thay file gốc
app/admin2/
  layout.js                    ← khung sidebar + topbar + phát quyền xuống các trang
  login/page.js                ← đăng nhập (port từ bản cũ + báo lỗi "chưa có vai")
  page.js                      ← Tổng quan (chờ Phase 3)
  orders/ products/ marketing/ store/ settings/   ← trang chờ, xây ở Phase 1–4
  _lib/tokens.js               ← bảng màu/font DUY NHẤT (đổi màu đổi ở đây)
  _lib/roles.js                ← hàm can() — mọi nút hỏi quyền qua đây
  _components/
    Toast.js                   ← thông báo góc màn hình (thay alert)
    ConfirmModal.js            ← hộp xác nhận nói rõ hậu quả (thay confirm)
    ui.js                      ← Tabs / StatusBadge / SearchBar / DataTable
    GuideStrip.js              ← bảng quy trình gắn tường (bấm được từng bước)
    ImageGate.js               ← gác cổng ảnh: sai tỉ lệ từ chối, to quá tự nén
```
