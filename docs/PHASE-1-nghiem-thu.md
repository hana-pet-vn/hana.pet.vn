# Phase 1 — Checklist nghiệm thu (chủ shop tự tick)

*Trang mới: đăng nhập rồi vào `/admin2/orders`. Admin cũ `/admin` vẫn chạy song song, không bị đụng.*

## Trước khi test — làm 1 lần

- [ ] Chạy `supabase/PHASE-1-realtime.sql` trong Supabase Dashboard → SQL Editor (bật realtime bảng orders).
- [ ] Kiểm bảng khai mã SKU BigSeller đã điền đủ (hiện vẫn khai ở admin cũ, tab Kho → BigSeller — Phase 2 chuyển về admin mới).

## F0 — Bảng quy trình gắn tường

- [ ] Đầu tab có bảng "Quy trình đơn hàng — dán tường", bấm bước 1 nhảy tab Chờ xác nhận, bước 2 nhảy Đã xác nhận, bước 3 mở màn Đối soát.
- [ ] Thu gọn được; thu gọn xong tải lại trang vẫn gọn (nhớ theo tài khoản).

## F1 — Danh sách + tab + tự cập nhật

- [ ] Tab đếm số như Shopee, badge đỏ chỉ ở "Chờ xác nhận".
- [ ] Mở 2 máy/2 tab: đặt 1 đơn test ngoài web → đơn TỰ hiện bên admin (không F5), chuông topbar nhảy số.
- [ ] Đơn "Đã xác nhận" chưa xuất BS có dòng vàng "⚠ Chưa xuất BS"; xuất rồi thành "✓ Đã xuất BS".
- [ ] Tắt mạng thử: trang KHÔNG trắng, hiện banner vàng "đang thử lại".

## F2 — Tìm & lọc

- [ ] Gõ "0912 384 756" và "0912384756" ra cùng kết quả; tìm tên không dấu vẫn ra.
- [ ] Đổi tab không mất từ khoá. Copy URL đang lọc gửi máy khác → ra đúng màn hình.

## F3 — Xác nhận

- [ ] Đơn Pending có nút "✓ Xác nhận" — bấm xong sang tab Đã xác nhận, có Toast.
- [ ] Tick nhiều đơn → thanh đen dưới đáy "✓ Xác nhận N đơn".
- [ ] KHÔNG có nút nào kéo đơn đi lùi ngoài menu "…" → "Trả về Chờ xác nhận" (có hỏi xác nhận).

## F4 — Xuất BigSeller

- [ ] Tab Đã xác nhận → tick → "📤 Xuất BigSeller" → thấy màn XEM TRƯỚC (số đơn, số dòng, cảnh báo) rồi mới tải file.
- [ ] Đơn Pending lọt vào lô bị loại + ghi lý do, các đơn khác vẫn xuất bình thường.
- [ ] Xuất lại đơn đã xuất: bị chặn bằng cảnh báo đơn đôi, bấm "vẫn xuất lại" mới đi tiếp.
- [ ] File nhập vào BS nhận được (Xử lý đơn hàng → Nhập đơn hàng thủ công → Up file lên).

## F5 — Đối soát

- [ ] Nút "🔄 Đối soát BigSeller" → thả file CSV (xuất 7 ngày gần nhất, ĐỦ các trang) → thấy 4 khối: sẽ cập nhật / không đổi / trạng thái lạ / đơn thiếu trong file.
- [ ] Trên 20 thay đổi thì phải gõ đúng con số mới bấm được Áp dụng.
- [ ] Đơn BS báo huỷ → web chuyển Đã huỷ + hoàn kho; BS báo "Trả hàng & Hoàn tiền" → web hiện "Hoàn hàng — chờ kiểm", kho KHÔNG tự cộng.

## F6 — Huỷ đơn

- [ ] Huỷ 1 đơn test CÓ COMBO → kiểm tồn từng món con trong combo được cộng trả đúng (việc "test tay 1 đơn combo" trong spec — làm 1 lần trước khi tin).
- [ ] Huỷ đơn đã xuất BS → có cảnh báo đỏ "nhớ huỷ cả bên BS".

## F7 — Chi tiết đơn

- [ ] Bấm dòng đơn → thấy pipeline, khách, món + tiền, vận đơn (nếu có), ghi chú nội bộ lưu được.
- [ ] Menu "…": Copy địa chỉ / Copy SĐT chạy; "Tạo vận đơn GHN" CHỈ chủ shop thấy.

## F8 — Webhook (tăng cường)

- [ ] (Khi bật GHTK) webhook đến muộn không kéo đơn Đã giao về Đang giao — xem log Vercel thấy `skipped: no-backward`.

## F9 — Tạo đơn tay

- [ ] "+ Tạo đơn (FB/Zalo)" → điền form, món hết hàng bị mờ không chọn được → tạo xong đơn nằm tab Chờ xác nhận, nguồn đúng, kho ĐÃ trừ.
- [ ] Đơn này xuất BigSeller chung lô với đơn web bình thường.

---

*Ghi chú kỹ thuật: `lib/bigseller.js` chỉ vá bảng map trạng thái (2 trạng thái thiếu) — logic xuất/đối soát giữ nguyên, đã test tự động (chỉ-đẩy-tới, giữ 'Chờ xử lý', combo chia giá khớp tổng). File `/api/orders/create` nhận thêm `source` khi có token admin. Khi Phase 1 chạy ổn vài ngày với nhân viên thật mới sang Phase 2.*
