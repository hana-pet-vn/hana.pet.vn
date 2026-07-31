# TIẾN ĐỘ — Rework Admin Hanapet

*Nhật ký chốt cuối mỗi phiên. Phiên mới / dev: đọc HANDOFF.md trước, rồi file này để biết đang đứng ở đâu.*

## 31/07/2026 — Phiên 2 (sau bàn giao)

### ✅ Phase 0 — HOÀN THÀNH & NGHIỆM THU
- SQL phân quyền đã chạy trên Supabase: **5 công tắc · 21 policy · 1 trigger giá** (con số chuẩn là 21, spec cũ ghi 20 là thiếu policy "admin insert orders" thêm cho F9).
- Đã **dọn 12 policy đời cũ** (Admin all …, site_config write…) từng đè lên khoá mới — file `supabase/DON-LUAT-CU.sql`.
- Bộ khung `/admin2` (layout, login, tokens, roles, Toast, ConfirmModal, ui, GuideStrip, ImageGate) + middleware mới đã push GitHub, deploy, test đạt: staff bị chặn đúng chỗ, khách web đặt đơn + mã giảm giá + đăng ký tin bình thường.
- Mật khẩu tài khoản gốc đã đổi.

### 🔁 Quyết định MỚI (cập nhật so với HANDOFF)
1. **Công tắc `edit_price` BẬT sẵn** — nhân viên được sửa giá (điều chỉnh theo campaign). Không chặn giá trong `variants`/`combos`. Muốn khoá lại: gạt công tắc (trigger 5.1 vẫn nằm sẵn; lưu ý khi TẮT thì giá trong JSON không bị chặn).
2. Checklist nghiệm thu ô 3 đổi nghĩa theo đó: staff sửa giá phải ĐƯỢC.

### 🔎 Đã xác minh code thật
- `/api/voucher/validate`: service key + rate limit → an toàn với RLS. ✔
- `/api/shipping/create`: dùng anon key, xác thực nửa vời, **không ai gọi** → route mồ côi. **Việc Phase 1: sửa sang service key + kiểm role, hoặc xoá.**
- Trang `dat-hang-thanh-cong` chỉ đọc URL param → an toàn. Reviews / webhook GHTK / orders-create: service key. ✔

### ✅ Phase 1 — DEMO ĐÃ CHỐT (31/07)
File: `docs/demo-phase1-don-hang.html` (panel gốc: `docs/quy-trinh-panel.html`).
Đã duyệt gồm:
- **Panel quy trình** (cam san hô, kiểu Shopee): 4 bước / 3 nhóm A·B·C, lịch chốt ca **11:30 & 16:30**, đối soát **cuối ca chiều**; chip nút BigSeller ①→②→③; tick từng bước + "x/4 xong hôm nay" + Đặt lại; thu gọn bấm header; toggle Bật/Tắt — **khi TẮT header GIỮ MÀU CAM** (việc mỗi ngày, không cho chìm); bước 1 nhảy tab Đã xác nhận, bước 4 mở đối soát.
- Tab trạng thái đếm số (badge đỏ chỉ ở Chờ xác nhận) · tìm kiếm bỏ dấu/bỏ cách · lọc ngày + nguồn.
- Xác nhận lẻ + hàng loạt · Xuất BS (cảnh báo đơn đôi, báo bung combo) · Đối soát xem trước 4 khối → áp dụng · Huỷ + hoàn kho + lý do ghi tự do + nhắc huỷ bên BS · Chi tiết đơn (pipeline, copy SĐT/địa chỉ, ghi chú nội bộ) · + Tạo đơn tay FB/Zalo.
- Trạng thái mới **"Hoàn hàng — chờ kiểm"** (BS: Trả hàng & Hoàn tiền) — KHÔNG tự hoàn kho.

### ⏭ VIỆC KẾ TIẾP (phiên sau)
**Code thật Phase 1** vào `app/admin2/orders/` theo demo đã chốt + PHASE-1-spec.md, làm tuần tự F0→F9. Kèm việc kỹ thuật: sửa/xoá `/api/shipping/create`; panel lưu trạng thái theo tài khoản (server-side) + tự reset checklist theo ngày (đã chốt hướng, không cần hỏi lại).

### 📌 Việc còn mở
- Lịch đối soát "cuối ca chiều mỗi ngày" = mặc định chủ shop chưa phản đối; coi như chốt trừ khi có ý kiến mới.
- Dòng xử lý lệch đơn "chụp màn hình gửi quản lý" = placeholder, thay bằng quy định thật khi code.
- Backlog không đổi: Messenger (Phase 5), webhook GHN, easter egg.

## Quy tắc phiên làm việc
- Demo trước → chủ shop duyệt → mới code thật.
- Cuối MỖI phiên: cập nhật memory + file TIEN-DO này.
- Admin cũ `/admin` chạy song song tới hết Phase 4.
