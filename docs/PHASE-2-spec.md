# Phase 2 — Sản phẩm & kho (spec từng chức năng)

*Chốt 31/07/2026. Đứng trên Phase 0–1 và LUONG-VAN-HANH.md (kho web = BẢN SAO, sổ cái ở BigSeller). Mỗi chức năng có dòng **"Nói dễ hiểu"** cho chủ shop.*

**Điều chỉnh so với roadmap ban đầu (quan trọng):** trong dữ liệu thật, combo KHÔNG phải sản phẩm riêng — combo nằm BÊN TRONG sản phẩm mẹ (`p.combos[]`), BOM chọn phân loại của chính sản phẩm đó, có ký hiệu đặc biệt `*scent*` = "khách tự chọn mùi". Giữ nguyên cấu trúc này (không di dời dữ liệu); phần UI sẽ gom combo về một tab để dễ nhìn, nhưng sửa combo vẫn diễn ra trong trang sản phẩm mẹ.

**Hai loại ngưỡng — đừng lẫn:**
- `minStock` (đã có): ngưỡng **báo sắp hết** → nhắc nhập thêm hàng. Chỉ admin thấy. Code cũ mặc định 5 — **chốt lại theo chủ shop 31/07: mặc định 10**, chỉnh riêng được từng SKU.
- `safety_threshold` (mới, mặc định 1): ngưỡng **tự ngừng bán** → web báo "Hết hàng" khi bản sao tồn ≤ ngưỡng, chống bán lố giữa hai lần đồng bộ với BS. Khách thấy hệ quả.

---

## F0. Bảng quy trình gắn tường (GuideStrip) — thêm 31/07 theo chủ shop

Đầu tab Kho có thanh quy trình bấm được (cùng component với tab Đơn hàng, xem F0 Phase 1): sửa tồn → sửa ở BigSeller · 2–3 ngày/lần Đồng bộ kho (bấm là mở màn đồng bộ) · web tự treo Hết hàng theo ngưỡng, thấy lệch thì Đồng bộ chứ đừng tự cộng số · ô SKU BS trống = đơn không xuất được.

## F1. Danh sách sản phẩm + tab trạng thái

**Nói dễ hiểu:** nhìn một bảng là biết món nào đang bán, món nào sắp hết, món nào đã ngừng.

- Tab: **Tất cả / Còn hàng / Sắp hết / Hết hàng / Combo / Đã ẩn**. Badge đỏ ở "Sắp hết" và "Hết hàng".
- Mỗi PHÂN LOẠI (mùi/SKU) là một dòng: ảnh, tên, mã SKU BigSeller (F2), giá, tồn (sửa inline — F5), 2 ngưỡng, trạng thái hiện/ẩn trên web.
- "Sắp hết" = `0 < tồn ≤ minStock`; "Hết hàng" = `tồn ≤ safety_threshold`.
- Bài học v21.5 khắc vào code mới: đọc/ghi tồn **đúng nơi storefront đọc** — có phân loại thì `variants[].stock`, không thì `stock` gốc. (Comment trong code cũ ghi rõ đã từng sai chỗ này.)

## F2. Khai mã SKU BigSeller (bảng ánh xạ)

**Nói dễ hiểu:** mỗi mùi trên web phải "bắt cặp" với một mã SKU bên BigSeller. Thiếu cặp nào thì đơn chứa món đó KHÔNG xuất sang BS được — code hiện tại đã loại thẳng những đơn như vậy khỏi file.

- Cột "SKU BigSeller" ngay trong bảng F1, sửa inline. Ô trống → viền đỏ + chữ "chưa khai — đơn chứa món này sẽ bị loại khi xuất BS".
- Tổng quan (Phase 3) thêm cảnh báo: "N phân loại đang bán nhưng chưa khai SKU BigSeller".
- Kỹ thuật: đây chính là `skuMap` (`'productId::variantId' → mã BS`) mà `buildExport`/`explodeOrder` đang dùng — giữ nguyên chỗ lưu và định dạng, chỉ làm UI tử tế. Bảng này cũng là chìa khoá để F6 dịch ngược file tồn BS về đúng sản phẩm web.

## F3. Thêm / sửa / ngừng bán sản phẩm

**Nói dễ hiểu:** một trang cho một sản phẩm: thông tin, các mùi, ảnh, giá — và "xoá" thực chất là cho nghỉ hưu, không đốt sổ.

- Trang sửa gồm: thông tin chung → danh sách phân loại (tên, giá riêng, tồn, SKU BS) → ảnh (chuẩn **800×800**, qua `ImageGate`: sai tỉ lệ từ chối kèm hướng dẫn, đúng thì tự thu nhỏ + nén — **đã bỏ crop** theo chốt 31/07) → khu combo (F4) → nút **📌 Ghim lên trang chủ** (sản phẩm và combo đều ghim được; danh sách ghim + thứ tự hiển thị quản ở Trang trí gian hàng).
- Giá bán/giá gốc: khoá theo công tắc `edit_price` (Phase 0). Thêm/xoá sản phẩm: theo công tắc `add_products`.
- **"Xoá" = LƯU TRỮ, không xoá cứng.** Lý do: đơn cũ tra tên sản phẩm qua danh mục sản phẩm — xoá cứng là đơn đã giao hiện "Không tìm thấy sản phẩm", mất lịch sử. Nút "Xoá" chuyển sản phẩm sang "Đã ẩn vĩnh viễn" (tab Đã ẩn): storefront không hiện, không đặt được, nhưng đơn cũ vẫn đọc tên đúng. ConfirmModal ghi rõ điều này. (Đây là quyết định kỹ thuật, không đổi hành vi kinh doanh — vẫn "biến mất khỏi web" như mong đợi.)

## F4. Combo (trong sản phẩm mẹ)

**Nói dễ hiểu:** tab Combo gom mọi combo về một bảng cho dễ soát; bấm sửa thì nhảy về trang sản phẩm mẹ của nó.

- Bảng tab Combo: ảnh, tên combo, thuộc sản phẩm nào, giá, BOM tóm tắt, tồn khả dụng, cảnh báo.
- **Tồn khả dụng của combo = tồn THẤP NHẤT trong các món thuộc BOM** (giữ đúng cách code cũ tính; món `*scent*` = thấp nhất trong mọi mùi). Combo hết = có một món hết.
- **Cảnh báo đỏ "sẽ bị bỏ qua khi xuất BS"** cho combo chưa khai BOM hoặc BOM trỏ tới phân loại đã bị ẩn — khớp đúng các warning mà `explodeOrder` đã bắn ra, hiện sớm ở đây thay vì để nhân viên phát hiện lúc xuất file.
- Trình sửa BOM giữ nguyên khả năng hiện tại: chọn phân loại + số lượng, hoặc `*scent*` cho khách tự chọn mùi.

## F5. Sửa tồn inline + Kiểm kho hàng loạt

**Nói dễ hiểu:** bấm vào số là sửa được ngay; kiểm kho cuối tháng thì có màn riêng sửa cả loạt.

- Inline: click số → ô nhập → Enter lưu → Toast. Kèm dòng nhắc thường trực: "Sổ cái kho nằm ở BigSeller — số này sẽ bị ghi đè ở lần đồng bộ tới" (đúng vai bản sao).
- Kiểm kho hàng loạt: chọn nhiều SKU → đặt số hoặc cộng/trừ số lượng (giữ tính năng bulk của bản cũ), có preview trước khi áp.
- Cả hai vai đều dùng được (kho là việc của nhân viên).

## F6. Đồng bộ kho từ BigSeller ⭐ (chức năng mới, trái tim của Phase 2)

**Nói dễ hiểu:** 2–3 ngày một lần, kéo file tồn kho từ BigSeller thả vào đây — web tự so từng SKU, chỉ ra chỗ lệch, bạn gật đầu là bản sao khớp lại với sổ cái.

- **Đầu vào — ĐÃ CHỐT THEO FILE THẬT (nhận 31/07):** file "Danh sách tồn kho" BS xuất ra, 2 sheet:
  - Sheet **"SKU đơn độc"** — DÙNG. Cột khoá: **"Mã SKU"**; cột số lấy: **"Toàn bộ kho khả dụng"** (đã trừ đơn đang khoá — KHÔNG dùng "Tổng số"). 25 cột còn lại bỏ qua. So tên cột sau khi trim khoảng trắng, không phụ thuộc thứ tự cột hay tên file.
  - Sheet **"SKU combo"** — BỎ QUA hoàn toàn (tồn combo web tự tính từ BOM).
- **Bẫy thật phát hiện từ file:** kho BS có nhiều **mã trùng đời** — `MFSPRAY` (khả dụng ~10.000) sống cạnh `MFSPRAY (N)` (bằng 0), có cả mã `[DC] ...` (hàng date cận). Khai ánh xạ F2 mà trỏ nhầm vào mã đời cũ là web báo hết hàng oan cả dòng sản phẩm. → Màn đồng bộ thêm cảnh báo: SKU web map tới mã BS có khả dụng = 0 trong khi tồn tại mã BS gần giống có khả dụng > 0 → gợi ý "có phải bạn định trỏ vào mã kia?".
- **Xử lý:** đọc file → tra ngược qua bảng ánh xạ F2 (mã BS → phân loại web) → dựng bảng so sánh.
- **Màn xem trước, 4 khối** (cùng triết lý với Đối soát đơn):
  1. Sẽ cập nhật: [SKU | tên | web đang ghi | BS nói | lệch] — lệch âm tô đỏ
  2. Khớp rồi (thu gọn)
  3. SKU có trong file nhưng web không bán (hàng chỉ bán sàn) → liệt kê, bỏ qua
  4. ⚠ Phân loại web ĐANG BÁN nhưng không có trong file → cảnh báo to (khả năng sai ánh xạ F2 hoặc BS đã ngừng mã đó), KHÔNG tự đổi số
- **Áp dụng:** ghi đè tồn web theo BS, ghi lại "Lần đồng bộ gần nhất: …" — quá 5 ngày thì Tổng quan nhắc vàng.
- Sau khi áp, sản phẩm nào rơi xuống dưới `safety_threshold` → Toast tổng kết "N phân loại vừa chuyển Hết hàng trên web".

## F7. Ngưỡng tự ngừng bán (safety_threshold)

**Nói dễ hiểu:** món nào bán chạy trên sàn thì đặt ngưỡng 2–3 để web tự đóng sớm, tránh nhận đơn xong hết hàng.

- Cột sửa inline trong F1, mặc định 1. Storefront đổi đúng MỘT điều kiện: hết hàng khi `tồn ≤ safety_threshold` (thay cho `= 0`).
- Việc kỹ thuật đi kèm: rà mọi chỗ storefront đang so `stock === 0` hoặc `> 0` để đổi cùng một nhịp — sót một chỗ là nút mua chỗ ẩn chỗ hiện.

---

## Việc phải kiểm khi code (không cần duyệt)

1. Xin file tồn kho BS mẫu (mục F6) — chặn code F6 tới khi có.
2. Rà storefront: mọi điểm đọc tồn kho phải qua một hàm chung `isOutOfStock(p, v)` thay vì so số rải rác.
3. Lưu trữ (F3) cần thêm 1 cờ `archived` — nằm trong JSON sản phẩm hiện có, không đổi schema bảng.
4. Kiểm `restockOrder` + combo `*scent*`: huỷ đơn combo phải cộng trả đúng mùi khách đã chọn.

## Nghiệm thu Phase 2 — checklist chủ shop

1. ☐ Thêm 1 sản phẩm mới có 2 mùi, khai SKU BS cho từng mùi → mùi chưa khai SKU hiện viền đỏ cảnh báo. Để tồn 9 → tự nhảy vào tab "Sắp hết" (ngưỡng mặc định 10).
2. ☐ Tạo 1 combo có món `*scent*` → tab Combo hiện tồn khả dụng = mùi thấp nhất; xoá BOM → hiện cảnh báo đỏ.
3. ☐ Sửa tồn inline 1 mùi → storefront đổi theo ngay (còn/hết đúng ngưỡng tự ngừng bán).
4. ☐ Thả file tồn BS thật vào Đồng bộ kho → bảng so sánh chỉ đúng chỗ lệch → Áp dụng → số web khớp BS.
5. ☐ Đặt ngưỡng tự ngừng bán = 2 cho 1 mùi còn 2 → storefront báo Hết hàng dù số chưa về 0.
6. ☐ "Xoá" 1 sản phẩm test → biến mất khỏi web, nhưng mở một đơn cũ có nó → tên vẫn hiện đúng.
7. ☐ Bằng tài khoản staff khi công tắc `edit_price` TẮT: sửa giá bị chặn, sửa tồn/mô tả vẫn được.
