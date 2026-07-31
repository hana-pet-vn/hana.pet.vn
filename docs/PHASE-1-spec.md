# Phase 1 — Quản lý đơn hàng (spec từng chức năng)

*Cập nhật 30/07/2026. Đứng trên Phase 0 (đã chốt). Mỗi chức năng có dòng **"Nói dễ hiểu"** cho chủ shop; phần còn lại là bản vẽ cho người code.*

**Nguyên tắc chung của cả module:** web là nơi NHẬN đơn và XÁC NHẬN đơn; in ấn + vận đơn nằm bên BigSeller; trạng thái chảy ngược về web qua Đối soát (F5) và webhook (F8). Mọi thao tác ghi đều hiện Toast báo kết quả; thao tác phá huỷ phải qua ConfirmModal nói rõ hậu quả.

**Ai được bấm:** cả owner lẫn staff được dùng TOÀN BỘ module này (theo ma trận Phase 0). Không có nút nào trong Phase 1 phân biệt vai — trừ khi các quyết định [CHỜ DUYỆT] bên dưới thêm vào.

---

## F0. Bảng quy trình gắn tường (GuideStrip) — thêm 31/07 theo chủ shop

**Nói dễ hiểu:** bản rút gọn của LUONG-VAN-HANH.md nằm NGAY ĐẦU tab, nhân viên lúc nào cũng thấy, không phải nhớ và không phải mở tài liệu.

- Thanh quy trình 4–5 bước ở đầu tab Đơn hàng: gọi chốt → mỗi sáng xuất BS → (tự động: in/giao bên BS + vận chuyển tự báo) → thứ 2 đối soát → huỷ đơn nhớ huỷ cả BS.
- Mỗi bước **bấm được**: bấm bước "Xuất BigSeller" nhảy thẳng tab Đã xác nhận, bấm "Đối soát" mở luôn màn đối soát — hướng dẫn dẫn tay tới nút thật, không đọc chay.
- Thu gọn được thành 1 dòng; nhớ trạng thái theo tài khoản (nhân viên mới mặc định MỞ, thu gọn rồi thì lần sau vẫn gọn).
- Nội dung viết một chỗ (cùng nguồn với tab Kho — component GuideStrip dùng chung), sửa quy trình chỉ sửa một nơi.

## F1. Danh sách đơn + tab trạng thái đếm số

**Nói dễ hiểu:** mở trang ra là thấy ngay có bao nhiêu đơn đang chờ mình, giống Shopee.

- **Tab:** Tất cả / Chờ xác nhận / Đã xác nhận / Đang đóng gói / Đang giao / Đã giao / Đã huỷ. Badge đỏ chỉ ở tab "Chờ xác nhận" (nơi cần hành động); các tab khác badge xám.
- **Đầu vào:** `getOrders()` (giữ nguyên hàm cũ), sắp mới nhất lên đầu.
- **Hiển thị mỗi dòng:** mã đơn + tên khách + giờ đặt · món hàng (ảnh nhỏ + tên + SL) · tổng tiền · trạng thái · cột thao tác theo ngữ cảnh (F3/F4).
- **Dòng phụ cảnh báo:** đơn "Đã xác nhận" chưa có `bigseller_exported_at` → hiện "⚠ Chưa xuất BS" (màu vàng); có rồi → "✓ Đã xuất BS" (xanh).
- **Tự làm mới:** Supabase realtime subscribe bảng orders — đơn mới tự hiện, badge tự nhảy số, kèm chuông ở topbar. Không bắt nhân viên F5 trang.
- **Lỗi:** mất mạng/lỗi tải → màn hình giữ data cũ + banner "Mất kết nối, đang thử lại" (tự retry), KHÔNG trắng trang.

## F2. Tìm kiếm & lọc

**Nói dễ hiểu:** khách gọi tới đọc số điện thoại là 2 giây sau thấy đơn của họ.

- Ô tìm: khớp mã đơn / tên khách / SĐT (bỏ dấu, bỏ khoảng trắng khi so — "0912 384 756" và "0912384756" phải cùng ra).
- Lọc: khoảng ngày (mặc định 30 ngày, có "Hôm nay/7 ngày/30 ngày/Tuỳ chọn") + nguồn đơn (`source`).
- Tìm kiếm áp CHỒNG lên tab đang chọn; đổi tab không xoá từ khoá.
- Trạng thái lọc nằm trên URL (`?tab=pending&q=...`) → gửi link cho nhau là ra đúng màn hình. (Trang orders cũ đã làm dở việc này bằng searchParams — giữ ý tưởng.)

## F3. Xác nhận đơn (lẻ + hàng loạt)

**Nói dễ hiểu:** gọi điện chốt với khách xong thì bấm một nút, đơn chuyển sang "Đã xác nhận" và sẵn sàng xuất BigSeller.

- **Nút "✓ Xác nhận"** chỉ hiện ở đơn Pending. Bấm → `updateOrderDB(id, {status:'Confirmed'})` → Toast "✓ HP-XXXX — đã xác nhận".
- **Hàng loạt:** tick nhiều đơn Pending → thanh bulk "✓ Xác nhận N đơn". Chạy tuần tự, đơn nào lỗi thì báo riêng đơn đó, không chặn cả lô.
- **Không có nút đi lùi trạng thái** trên UI (tránh bấm nhầm phá dữ liệu). Trường hợp lỡ tay: xử lý ở F7 (chi tiết đơn) có nút "Trả về Chờ xác nhận" trong menu "…", kèm ConfirmModal.
- **[CHỜ DUYỆT — Q1]** Khách không nghe máy: có cần đếm số lần gọi + hẹn giờ gọi lại ngay trên đơn không, hay chỉ cần ô ghi chú tự do (cột `note` đã có sẵn trong DB)?

## F4. Xuất BigSeller (CSV)

**Nói dễ hiểu:** chọn các đơn đã chốt, bấm một nút là ra file để nhập vào BigSeller — combo tự tách thành từng món lẻ, giá tự chia đúng.

- **Điều kiện xuất:** chỉ đơn có trạng thái thuộc `EXPORTABLE_STATUSES` (Confirmed trở đi; CỐ Ý bỏ Pending — đơn chưa chốt không được sang BS). Đơn không đủ điều kiện trong lô tick → bị loại và liệt kê lý do, không chặn cả lô.
- **Xử lý:** `buildExport()` giữ NGUYÊN — **đã đối chiếu với template thật BS nhận 31/07: TRÙNG KHỚP 100% cả 39 tên cột lẫn thứ tự**, không phải sửa gì. (Bung combo theo BOM, gộp SKU trùng, chia giá tỉ lệ — dòng cuối gánh phần dư cho khớp tổng.) `warnings` từ explodeOrder (combo chưa khai BOM, thiếu mùi, không thấy SP) phải HIỆN RA trước khi tải file, không nuốt im.
- **Sau khi tải file:** ghi `bigsellerExportedAt` cho từng đơn trong file → dòng phụ F1 đổi thành "✓ Đã xuất BS". Đây cũng là mốc để F5 biết đơn nào "lẽ ra phải có bên BS".
- **Xuất lại lần 2 cùng một đơn:** cho phép (file hỏng, nhập lỗi), nhưng ConfirmModal cảnh báo "N đơn đã xuất trước đó — nhập trùng bên BS sẽ tạo đơn đôi, kiểm bên BS trước".

## F5. Đối soát BigSeller (xem trước → áp dụng)

> **Bản 3 — chốt 31/07 theo chủ shop:** đối soát chạy **MỖI CHIỀU một lần** và là **đường cập nhật trạng thái CHÍNH** (không còn dựa webhook). Logic `planReconcile` giữ nguyên. Tổng quan nhắc vàng nếu hôm nay chưa làm. Kèm **bảng hướng dẫn quy trình gắn ngay đầu tab Đơn hàng và tab Kho** (thu gọn được): từng bước có nút nhảy thẳng tới thao tác tương ứng — spec theo đúng demo v2 đã duyệt. Chi tiết nhịp: LUONG-VAN-HANH.md.

**Nói dễ hiểu:** kéo file xuất từ BigSeller vào, web tự dò xem đơn nào đã in, đã giao, đã huỷ bên đó rồi cập nhật lại — nhưng LUÔN cho xem trước danh sách thay đổi, gật đầu mới áp.

- **Đầu vào — ĐÃ CHỐT THEO FILE THẬT (nhận 31/07):** file "Order-SKU-all" BS xuất, 33 cột, **mỗi dòng = 1 SKU** (1 đơn nhiều món chiếm nhiều dòng — logic gộp hiện có xử được). Cột code cần đều có mặt trong file thật: ID đơn hàng, Trạng thái đơn hàng, Mã vận đơn, Tên người nhận, Thời gian đặt đơn, Số lượng. Đơn web nằm ở kênh "Manual"; đơn TikTok/Shopee không khớp mã nên tự bị bỏ qua — an toàn.
- **Hướng dẫn vận hành in vào bảng quy trình:** khi xuất file mỗi chiều, chọn **khoảng ngày 7 ngày gần nhất** — file cả kỳ nặng 13.000+ dòng, up vẫn chạy nhưng chậm và preview dài vô ích.
- **Xử lý:** `planReconcile()` giữ NGUYÊN — đã xử lý đủ: gộp nhiều dòng SKU về một đơn, khớp theo mã đơn → mã BS → dò mờ theo tên+ngày, CHỈ ĐẨY TỚI không kéo lùi (trừ Huỷ luôn thắng), Huỷ thì kèm hoàn kho.
- **Vá bảng map trạng thái (phát hiện từ file thật 31/07):** file BS có 7 trạng thái, map trong code mới phủ 5 — thiếu 2:
  1. `Chờ xử lý` → thêm vào map, hành xử: **giữ nguyên trạng thái web** (đơn chưa in, không có gì để đẩy).
  2. `Trả hàng & Hoàn tiền` → thêm trạng thái hiển thị **"Hoàn hàng — chờ kiểm"** trên web, **KHÔNG tự hoàn kho** (hàng chưa chắc đã về tay; nhận hàng kiểm xong nhân viên bấm hoàn kho tay). Hiếm gặp (3/13.368 dòng trong file mẫu) nhưng dính tiền-hàng nên không để máy tự quyết. *Chủ shop có thể veto sang phương án gộp vào Đã huỷ + hoàn kho ngay.*
- **Màn xem trước, 4 khối:**
  1. Sẽ cập nhật (từ → đến, đánh dấu dòng nào kèm hoàn kho)
  2. Không đổi (thu gọn)
  3. ⚠ Trạng thái lạ chưa có trong bảng map (`unknownStatuses`) — liệt kê để bổ sung, không đoán
  4. 🔎 Đơn đã xuất BS nhưng KHÔNG có trong file (`missing`) — khả năng quên nhập bên BS, nhắc kiểm
- **Bấm "Áp dụng":** chạy tuần tự từng update; hoàn kho lỗi ở đơn nào thì dừng lại báo đúng đơn đó (giữ hành vi an toàn của bản cũ: trạng thái vẫn đổi, kho nhắc kiểm tay). Xong hiện tổng kết "Cập nhật X, bỏ qua Y, cần kiểm Z".
- **Ai được bấm:** cả hai vai — nhưng đây là thao tác nặng đô nhất module, ConfirmModal bắt gõ số lượng thay đổi để xác nhận nếu update > 20 đơn.

## F6. Huỷ đơn + hoàn kho

**Nói dễ hiểu:** huỷ đơn thì hàng trong đơn tự cộng trả về kho, đúng từng mùi từng loại — không còn cảnh huỷ đơn xong kho hụt.

- ConfirmModal bắt buộc, ghi rõ: "Kho sẽ được cộng trả từng món. Không hoàn tác được."
- Thứ tự: `restockOrder(o)` TRƯỚC → `updateOrderDB(status:'Cancelled')` SAU. Hoàn kho lỗi → đơn VẪN huỷ + cảnh báo "kiểm kho tay" (giữ đúng hành vi v20.1 — thà lệch kho có cảnh báo còn hơn đơn huỷ hụt).
- Guard chống cộng đôi: nút Huỷ không hiện với đơn đã Cancelled (giữ nguyên).
- Đơn đã xuất BS mà huỷ trên web → banner nhắc "Nhớ huỷ cả bên BigSeller, nếu không BS vẫn in đơn này".
- **[CHỜ DUYỆT — Q3]** Có bắt chọn LÝ DO huỷ không (khách bom, hết hàng, sai thông tin, khác…) để cuối tháng thống kê được vì sao mất đơn?

## F7. Chi tiết đơn

**Nói dễ hiểu:** bấm vào một đơn là thấy hết: khách là ai, mua gì, đơn đang ở bước nào, và mọi ghi chú nội bộ.

- Pipeline trạng thái (như demo), thông tin khách + giao hàng, món hàng + tổng tiền, mã vận đơn nếu có (kèm nguồn: "tạo bên BigSeller, cập nhật qua đối soát").
- **Ghi chú nội bộ** (cột `note` có sẵn): ô text hiện ngay trong chi tiết, lưu là Toast. Khách KHÔNG bao giờ nhìn thấy ghi chú này.
- Menu "…" chứa thao tác hiếm dùng: Trả về Chờ xác nhận (ConfirmModal), Copy địa chỉ, Copy SĐT.
- **[CHỜ DUYỆT — Q2]** Khách gọi xin ĐỔI (địa chỉ, mùi, thêm bớt món) sau khi đặt: có cho sửa đơn trên web không, và sửa tới mức nào? (Ảnh hưởng lớn: sửa món = phải tính lại tiền + kho + xuất lại BS.)

## F8. Webhook vận chuyển (TĂNG CƯỜNG — không nằm trên đường chính)

> **Bản 3 — chốt 31/07:** đường cập nhật chính là file đối soát mỗi chiều (F5), nên webhook hạ xuống mức TĂNG CƯỜNG: giữ webhook GHTK sẵn có (đã chuẩn), webhook GHN **làm sau** khi luồng file chạy mượt vài tuần. Khi có, trạng thái nhảy realtime và file mỗi chiều thành lớp kiểm tra chéo. Luật chỉ-đẩy-tới vẫn áp cho mọi nguồn cập nhật.

**Nói dễ hiểu:** bên vận chuyển báo "đã giao" thì đơn trên web tự nhảy trạng thái, không ai phải làm gì.

- Route hiện tại đã đạt: verify chữ ký HMAC, đóng cửa khi thiếu secret (fail closed), dùng service key, map trạng thái GHTK → web. **Giữ nguyên, không viết lại.**
- Việc Phase 1 chỉ thêm: trạng thái đổi qua webhook cũng phải theo luật "chỉ đẩy tới" như F5 (hiện webhook ghi đè thẳng — cần kiểm và vá nếu đúng vậy), và bắn realtime để F1 tự cập nhật.
- Nút "Tạo vận đơn GHN từ web": theo roadmap thuộc diện "cắt có điều kiện" — Phase 1 ẨN với staff, giữ cho owner trong menu "…" của F7, gắn đếm lượt dùng; 2 tuần không ai bấm thì xoá cùng API.

---

## F9. Tạo đơn tay từ FB/Zalo (thêm 31/07 theo chủ shop)

**Nói dễ hiểu:** khách chốt qua chat FB/Zalo thì nhân viên bấm "+ Tạo đơn", điền form (tên, SĐT, địa chỉ, món + số lượng), đơn vào thẳng tab Chờ xác nhận với nhãn nguồn FB/Zalo — rồi đi chung đường xuất BigSeller như đơn web.

- Form: khách (tên, SĐT bắt buộc), địa chỉ, chọn món từ danh mục (đúng phân loại/mùi, tôn trọng tồn kho + trừ kho như đơn web), số lượng, ghi chú. `source` ghi rõ nguồn để lọc/thống kê.
- **Bước sau — ĐÃ CHỐT HƯỚNG 31/07 (thảo luận với chủ shop):** BỎ phương án dán chat (dài dòng, dễ lỗi). Đích là **kết nối thẳng Messenger**: lúc bấm + Tạo đơn, web hiện các hội thoại gần nhất của page → chọn khách → AI đọc hội thoại và điền form → người soát → tạo. Chi tiết & điều kiện: mục PHASE 5 trong file PHASE-4-spec.md. Form tay ở Phase 1 chính là cái móng — Messenger chỉ thay cách ĐIỀN, không thay form.

## Việc phải kiểm khi code (không cần chủ shop duyệt)

1. Webhook GHTK có đang ghi đè lùi trạng thái không → vá theo luật chỉ-đẩy-tới.
2. Realtime Supabase trên bảng orders (bật replication cho bảng này).
3. Search bỏ dấu tiếng Việt: chuẩn hoá cả hai phía khi so.
4. `restockOrder` chạy đúng với đơn có combo (bung BOM khi cộng trả) — viết test tay 1 đơn combo trước khi tin.

## Ba quyết định vận hành đang chờ chủ shop (Q1–Q3)

Q1 (F3): theo dõi gọi khách không nghe máy · Q2 (F7): mức độ cho sửa đơn · Q3 (F6): lý do huỷ. Trả lời xong sẽ chốt spec bản cuối và bắt đầu code Phase 0 → 1.
