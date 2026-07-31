# HANDOFF — Rework Admin Hanapet

*Bàn giao 31/07/2026, sau 2 ngày planning giữa chủ shop (Tùng) và Claude. Người nhận: phiên Claude Code (hoặc dev) bắt đầu triển khai. Đọc file này TRƯỚC, sau đó đọc theo thứ tự ở mục 2.*

---

## 1. Bối cảnh 30 giây

Shop pet care **Hana Pet** (hana.pet.vn — Next.js + Supabase) bán web + Shopee/TikTok qua **BigSeller**. Admin cũ là 1 file SPA 2.661 dòng vá chồng nhiều đời (các comment v20–v22 trong code là danh sách bug đã trả học phí — **bản mới phải giữ nguyên các fix đó**). Rework theo bố cục Shopee Seller Center, dựng ở `/admin2` chạy song song admin cũ, cutover khi xong.

Chủ shop **không rành code** — giao tiếp không thuật ngữ, quyết định kinh doanh phải nói rõ và chờ duyệt, phần kỹ thuật tự quyết rồi báo lại kèm lý do ("discuss trước khi làm").

## 2. Đọc hồ sơ theo thứ tự này

| # | File | Đọc để |
|---|---|---|
| 1 | `ROADMAP-rework-admin.md` | Bức tranh lớn: giữ/gộp/cắt, 5 module |
| 2 | `LUONG-VAN-HANH.md` | Luồng web ↔ BigSeller (KHÔNG ĐƯỢC hiểu sai file này) |
| 3 | `PHASE-0-spec.md` | Việc đầu tiên: phân quyền 3 tầng + 5 công tắc (SQL chạy được) |
| 4 | `PHASE-1-spec.md` → `PHASE-4-spec.md` | Spec từng module, làm tuần tự |
| — | `demo-admin-hanapet-v2.html` | Chuẩn giao diện ĐÃ DUYỆT — làm giống demo, màu navy #1b295b, font Baloo 2 / Be Vietnam Pro |

Câu lệnh khởi động đề xuất cho Claude Code: **"Đọc HANDOFF.md rồi PHASE-0-spec.md, lập kế hoạch Phase 0 và bắt đầu."**

## 3. Các quyết định ĐÃ KHOÁ (đừng mở lại)

1. **Không đổi schema Supabase.** Bảng products/orders/site_config/categories/vouchers/subscribers giữ nguyên. Chỉ thêm: role trong `app_metadata`, bảng `staff_permissions`, cờ/khoá mới nằm TRONG JSON sẵn có.
2. **`lib/bigseller.js` bê nguyên, không viết lại.** Đã đối chiếu file thật 31/07: 39 cột xuất khớp template BS 100%. Chỉ vá bảng map trạng thái (thiếu `Chờ xử lý` và `Trả hàng & Hoàn tiền` — cách xử trong PHASE-1 F5).
3. **Kho: BigSeller là sổ cái duy nhất, web là bản sao** + ngưỡng an toàn. Đồng bộ bằng file (định dạng thật đã chốt trong PHASE-2 F6: sheet "SKU đơn độc", cột "Toàn bộ kho khả dụng").
4. **Cập nhật trạng thái đơn: file đối soát MỖI CHIỀU là đường chính.** Webhook = tăng cường làm sau. Xuất file theo khoảng 7 ngày gần nhất.
5. **Phân quyền: 2 vai + 5 công tắc**, khoá thật ở database (RLS + trigger), role trong `app_metadata` (KHÔNG BAO GIỜ `user_metadata`).
6. **Ảnh: BỎ crop hoàn toàn.** `ImageGate` kiểm tỉ lệ → từ chối kèm hướng dẫn hoặc tự thu nhỏ + nén. Mascot kiểm thêm độ tối.
7. **Ghim sản phẩm lên trang chủ: nút 📌 ở trang Sản phẩm**; Trang trí chỉ sắp thứ tự + preview.
8. **Trang trí = trình sửa 2 cột live preview** (nhúng trang chủ thật), ẩn/hiện khối + mũi tên đảo thứ tự. KHÔNG page builder.
9. **Combo nằm TRONG sản phẩm mẹ** (đúng cấu trúc data thật, có `*scent*`) — không tách thành sản phẩm riêng.
10. **"Xoá" sản phẩm = lưu trữ**, không xoá cứng. Sửa đơn = huỷ rồi đặt lại. Lý do huỷ: ghi tự do. Ngưỡng báo sắp hết mặc định 10.
11. **Phase 5 (sau cutover): nối Messenger** kéo hội thoại lúc lên đơn (đã bỏ phương án dán chat). Nguyên tắc: máy điền — người soát — người bấm tạo.

## 4. Nguyên tắc làm việc

- Mỗi phase XONG (theo checklist nghiệm thu trong spec, chủ shop tự tick được) mới sang phase sau; Phase 1 phải được nhân viên dùng thật vài ngày.
- File < 400 dòng; component chung ở `_components`; màu/spacing từ `tokens.js`; Toast thay `alert()`, ConfirmModal nói rõ hậu quả thay `confirm()`.
- Mọi thao tác nguy hiểm: xem trước → xác nhận → áp dụng.
- KHÔNG BAO GIỜ xin hoặc nhận mật khẩu/token qua chat. Bí mật vào biến môi trường server.
- Chủ shop có quyền veto mọi quyết định đã đề xuất — các điểm còn mở veto ghi rõ trong spec (voucher rút gọn; cách xử "Trả hàng & Hoàn tiền").

## 5. Trạng thái lúc bàn giao

- ✅ Toàn bộ spec chốt xong, file mẫu BS (3 file) đã phân tích và ghi vào spec.
- ✅ Đã xác minh: `/api/orders/create` dùng service key (bật RLS không vỡ storefront).
- ⏳ Chủ shop còn 1 việc: **đổi mật khẩu tài khoản gốc `tung.le@hana.pet`** (mật khẩu cũ từng lộ qua chat — coi như đã cháy).
- 📌 Backlog ghi ở cuối PHASE-4: Messenger (Phase 5), webhook GHN, easter egg khi mua (chủ đề riêng của chủ shop, chưa bàn).
- Lưu ý: file demo từng được sửa song song bởi phiên khác (đoạn `guideStrip`) — nếu có nhiều phiên cùng làm, phân công rõ để không giẫm chân.

**Bắt đầu từ Phase 0. Chúc code vui — nền móng trước, không nhảy cóc.**
