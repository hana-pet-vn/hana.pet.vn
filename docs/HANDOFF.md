# HANDOFF — Rework Admin Hanapet

*Bàn giao 31/07/2026, sau 2 ngày planning giữa chủ shop (Tùng) và Claude. Người nhận: phiên Claude Code (hoặc dev) bắt đầu triển khai. Đọc file này TRƯỚC, sau đó đọc theo thứ tự ở mục 2.*

> **CẬP NHẬT 05/08/2026 — PHASE 1 ĐÃ CODE XONG.** Toàn bộ F0→F9 của trang Đơn hàng `/admin2/orders` đã dựng theo PHASE-1-spec + demo v2 (kèm 2 quyết định mới ở mục 3: cắt GHN, phí ship theo vùng). Trạng thái thật xem mục 5. Phiên kế tiếp: chờ Phase 1 được nhân viên dùng thật vài ngày → nghiệm thu theo `PHASE-1-nghiem-thu.md` → mới bắt đầu **PHASE-2-spec.md** (Sản phẩm & Kho). Câu lệnh khởi động đề xuất: **"Đọc HANDOFF.md và PHASE-2-spec.md, xem thêm doc claude/phase-1-tien-do.md trong Project, lập kế hoạch Phase 2 và bắt đầu."**

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
12. **(05/08) CẮT HẲN GHN khỏi web** — chủ shop chốt. Địa chỉ 3 cấp lấy từ danh bạ tĩnh `lib/vn-address/` (63 tỉnh gắn miền B/T/N, field kiểu GHN nên UI không đổi). Web KHÔNG cần `GHN_TOKEN`. Nút "Tạo vận đơn GHN" đã gỡ khỏi /admin2; route `/api/shipping/create` + `lib/shipping.js` chỉ giữ cho admin cũ, xoá khi cutover.
13. **(05/08) Phí ship do web tự áng, 2 chế độ** (site_config `shipping_flat_fee`, chỉnh ở `/admin2/settings`): đồng giá toàn quốc, hoặc theo vùng 4 bậc nội tỉnh/cùng miền/cận miền/xuyên miền tính từ tỉnh shop. Kèm ngưỡng freeship. `computeShipFee()` trong lib/vn-address dùng CHUNG cho hiển thị checkout lẫn ghi đơn — không được tách đôi.
14. **(05/08) File BS báo "Trả hàng & Hoàn tiền"** → web hiện "Hoàn hàng — chờ kiểm" (`Return Check`), KHÔNG tự hoàn kho, máy không tự kéo trạng thái này đi đâu nữa. "Chờ xử lý" → giữ nguyên trạng thái web. (Chủ shop có quyền veto cách xử Trả hàng.)

## 4. Nguyên tắc làm việc

- Mỗi phase XONG (theo checklist nghiệm thu trong spec, chủ shop tự tick được) mới sang phase sau; Phase 1 phải được nhân viên dùng thật vài ngày.
- File < 400 dòng; component chung ở `_components`; màu/spacing từ `tokens.js`; Toast thay `alert()`, ConfirmModal nói rõ hậu quả thay `confirm()`.
- Mọi thao tác nguy hiểm: xem trước → xác nhận → áp dụng.
- KHÔNG BAO GIỜ xin hoặc nhận mật khẩu/token qua chat. Bí mật vào biến môi trường server.
- Chủ shop có quyền veto mọi quyết định đã đề xuất — các điểm còn mở veto ghi rõ trong spec (voucher rút gọn; cách xử "Trả hàng & Hoàn tiền").

## 5. Trạng thái lúc bàn giao (cập nhật 05/08/2026)

- ✅ Phase 0 (khung /admin2, phân quyền, tokens, Toast/ConfirmModal): xong từ trước.
- ✅ **Phase 1 CODE XONG** — F0→F9 trang `/admin2/orders` + trang Settings (phí ship). `next build` pass; logic đối soát/chia giá combo/xếp vùng phí có unit test pass. Chi tiết từng chức năng + danh sách 28 file: doc `claude/phase-1-tien-do.md` trong Project (Claude đọc được), checklist chủ shop: `PHASE-1-nghiem-thu.md`.
- ✅ **Phase 1 ĐÃ GIẢ LẬP TOÀN TRÌNH (05/08)** — chủ shop chọn "hoàn thành hơn hoàn hảo": dựng Supabase giả + trình duyệt tự động chạy hết F0→F9 (đăng nhập, realtime, tìm kiếm, xác nhận, xuất BS 39 cột, đối soát đủ 4 khối, huỷ combo hoàn kho đúng từng mùi, tạo đơn tay trừ kho, phí theo vùng, chặn xuất trùng): **35/35 PASS**, có ảnh chụp từng bước. Lưu ý: giả lập thay được logic, KHÔNG thay được va chạm thật với BigSeller/nhân viên — vẫn nên để mắt tuần đầu.
- ✅ **CUTOVER KHUNG (05/08)**: `/admin` (+`/admin/orders`, `/admin/login`) giờ chuyển thẳng về admin mới `/admin2`. Bản cũ dời về **`/admin-cu`** làm cầu tạm CHỈ cho Kho / Marketing / Trang trí (trang mới có nút "Mở bản cũ"); đăng nhập chung một phiên. Phase 2–4 chuyển xong phần nào thì phần đó thôi dùng cầu; xong hết thì xoá `/admin-cu`.
- ⏳ Việc vận hành đang treo: (1) deploy test ở project Vercel mới `hana-pet-vn-fn78` — cần chép 3 env Supabase từ project cũ (KHÔNG cần GHN_* nữa) rồi Redeploy; (2) chạy `supabase/PHASE-1-realtime.sql` 1 lần; (3) vào `/admin2/settings` đặt phí ship; (4) đổi mật khẩu tài khoản gốc `tung.le@hana.pet` (từng lộ qua chat — vẫn chưa làm).
- 📌 Khi CUTOVER: xoá admin cũ `/admin` + `/api/shipping/create` + phần GHN/GHTK book trong `lib/shipping.js`.
- 📌 Backlog cuối PHASE-4: Messenger (Phase 5), easter egg khi mua. (Webhook GHN đã bỏ hẳn theo quyết định 12.)

**Việc kế tiếp: nghiệm thu Phase 1 → Phase 2 (Sản phẩm & Kho, PHASE-2-spec.md). Nền móng trước, không nhảy cóc.**
