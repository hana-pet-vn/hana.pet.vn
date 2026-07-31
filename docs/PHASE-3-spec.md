# Phase 3 — Tổng quan + Kênh Marketing + Cài đặt

*Chốt 31/07/2026. Mỗi chức năng có dòng **"Nói dễ hiểu"** cho chủ shop.*

---

## F1. Tổng quan (dashboard)

**Nói dễ hiểu:** mở lên là biết hôm nay phải làm gì và có gì đang cháy — mọi con số bấm vào được, nhảy thẳng tới nơi xử lý.

**Khối "Việc cần làm" (cả hai vai đều thấy):**
- Đơn chờ xác nhận (bấm → tab Chờ xác nhận)
- Đơn đã xác nhận chưa xuất BigSeller (bấm → tab Đã xác nhận)
- SKU sắp hết — tồn ≤ ngưỡng báo, mặc định 10 (bấm → tab Sắp hết)
- Phân loại đang bán nhưng CHƯA khai SKU BigSeller (bấm → bảng ánh xạ)

**Khối "Nhắc định kỳ" (vàng khi quá hạn):**
- Đồng bộ kho lần cuối: X ngày trước (vàng nếu > 5 ngày)
- Đối soát BigSeller lần cuối: X ngày trước (vàng nếu > 10 ngày)

**Khối "Doanh thu" (theo công tắc `see_revenue`, mặc định chỉ owner):**
- Ghi nhãn rõ: **"Doanh thu WEBSITE"** — số ở đây chỉ tính đơn web, KHÔNG gồm Shopee/TikTok (mấy kênh đó xem bên BigSeller). Ghi thẳng nhãn này lên màn hình để không ai hiểu lầm là tổng shop.
- Hôm nay / 7 ngày / 30 ngày; biểu đồ đơn theo ngày; tính từ đơn không-huỷ.

**Kỹ thuật:** mọi số đếm dùng chung nguồn với badge sidebar (một hàm, một sự thật); realtime như F1 Phase 1.

## F2. Voucher (nâng cấp nhẹ — có thể cắt)

**Nói dễ hiểu:** hiện tại một mã giảm giá sống MÃI MÃI và không giới hạn lượt — mã lọt ra nhóm chat là chảy máu tiền không có van khoá. Nâng cấp nhẹ để chủ shop có van.

Voucher hiện có: `{code, pct}`. Thêm 4 trường, mỗi trường ĐỀU được để trống (trống = như cũ, không giới hạn):
- **Bật/Tắt** — van khẩn cấp, một gạt là mã chết ngay (mặc định Bật)
- **Hạn dùng** (ngày hết hạn)
- **Đơn tối thiểu** (₫)
- **Giới hạn lượt** + cột "đã dùng" (đếm từ đơn không-huỷ có gắn mã)

Kỹ thuật: khách nhập mã đi qua API kiểm tra phía máy chủ (route đã có từ trước) — luật mới kiểm ở đó, KHÔNG kiểm ở trình duyệt. Bảng voucher vẫn khoá theo công tắc `manage_vouchers` (Phase 0). Giảm theo số tiền cố định (thay vì %) — KHÔNG làm đợt này, ghi sổ để sau.

> **Chủ shop có quyền veto:** nếu muốn ship nhanh nhất có thể, cắt còn đúng 2 trường Bật/Tắt + Hạn dùng — 2 trường này là van an toàn tối thiểu, mình khuyên không cắt sâu hơn.

## F3. Danh mục

**Nói dễ hiểu:** sắp xếp các ngăn hàng hiển thị ngoài web, kéo thả đổi thứ tự.

Giữ đúng năng lực cũ (thêm/sửa/xoá/thứ tự), chỉ thay UI: kéo-thả, ConfirmModal khi xoá danh mục còn sản phẩm (báo rõ "N sản phẩm sẽ thành 'Chưa phân loại', không mất hàng").

## F4. Cài đặt (chỉ owner)

**Nói dễ hiểu:** bảng cầu dao 5 công tắc + danh sách nhân viên, thêm người mới chỉ cần email.

**Khu 1 — Phân quyền nhân viên:** 5 công tắc (đúng bảng Phase 0), mỗi cái một dòng mô tả dễ hiểu + trạng thái. Gạt là ăn ngay (ghi vào bảng công tắc, Toast xác nhận). Công tắc áp cho MỌI nhân viên như nhau (không chia từng người — đúng thiết kế 2 vai đã chốt).

**Khu 2 — Tài khoản nhân viên:**
- Danh sách: email, vai, lần đăng nhập cuối, trạng thái.
- **Thêm nhân viên:** nhập email → hệ thống gửi email mời tự đặt mật khẩu (luồng mời chuẩn của Supabase, chạy qua API máy chủ dùng chìa khoá vạn năng). **Không ai gõ hay nhìn thấy mật khẩu của ai — kể cả owner.**
- **Khoá / mở tài khoản:** nhân viên nghỉ → bấm Khoá, hết đăng nhập được ngay. Không xoá tài khoản (giữ dấu vết ai từng làm gì).
- Owner không tự khoá được chính mình (chặn tự bắn vào chân).

**Kỹ thuật:** cần 2 route máy chủ mới (`/api/admin/staff/invite`, `/api/admin/staff/ban`) — service key, CHỈ owner gọi được (kiểm role trong route, không tin phía trình duyệt).

---

## Nghiệm thu Phase 3 — checklist chủ shop

1. ☐ Tổng quan: mỗi con số bấm vào ra đúng danh sách tương ứng; để quá 5 ngày không đồng bộ kho → hiện nhắc vàng.
2. ☐ Doanh thu ghi rõ chữ "WEBSITE"; tài khoản staff (công tắc `see_revenue` TẮT) không thấy khối này.
3. ☐ Tạo mã TEST10 giới hạn 2 lượt → đặt 2 đơn dùng mã → đơn thứ 3 nhập mã bị từ chối. Gạt Tắt mã → nhập mã bị từ chối ngay.
4. ☐ Huỷ 1 trong 2 đơn trên → cột "đã dùng" tụt xuống 1.
5. ☐ Thêm 1 email nhân viên thử → nhận được email mời, tự đặt mật khẩu, đăng nhập thấy đúng giao diện staff.
6. ☐ Khoá tài khoản đó → đăng nhập lại bị chặn ngay.
7. ☐ Đăng nhập staff, gõ thẳng link trang Cài đặt → bị đá về Tổng quan; gọi API invite bằng tài khoản staff → bị từ chối.
