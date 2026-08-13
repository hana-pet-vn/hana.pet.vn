# TIẾN ĐỘ (nhật ký chốt cuối mỗi phiên — đọc sau HANDOFF.md)

## 13/08/2026 — Phiên 5: PHASE 2 SẢN PHẨM & KHO — CODE THẬT ✅ (build xanh)

### Quyết định trong phiên (đã ghi HANDOFF #16)
- Sáng chốt "Cách A" đồng bộ kho 2 file → **chiều chủ shop VETO**: kho web nhân
  viên TỰ ĐẶT SỐ, tự căn hết hàng như bên sàn. Bỏ hẳn màn đồng bộ tồn kho.

### Đã code
- **`/admin/products` thành trang thật** (thay bridge): bảng SKU mỗi mùi 1 dòng,
  6 tab đếm số (Sắp hết/Hết hàng badge đỏ), tìm bỏ dấu theo tên/mùi/SKU.
  Sửa inline: tồn · giá (khoá theo edit_price) · ngưỡng nhắc nhập (mặc định 10,
  chỉnh riêng từng mùi) · ngưỡng ngừng bán (mặc định 0) · SKU BigSeller (ô trống
  viền đỏ "đơn sẽ bị loại khi xuất BS"). Ghim 📌 trang chủ ngay trên bảng.
- **Editor sản phẩm** (thêm mới + sửa): thông tin, phân loại (kèm SKU BS), ảnh
  qua ImageGate 1:1 + /api/upload, combo + trình sửa BOM (`*scent*` chọn được),
  nút **Ngừng bán (lưu trữ)** / Mở bán lại. Field lạ trong JSON giữ nguyên.
- **Tab Combo**: tồn khả dụng = món BOM thấp nhất; cảnh báo đỏ (chưa khai BOM /
  BOM trỏ phân loại đã mất) — khớp warning explodeOrder, hiện SỚM.
- **Kiểm kho hàng loạt**: tick SKU → đặt/cộng/trừ → xem trước cũ→mới → áp.
- **Storefront** (`lib/catalog.js`): ngưỡng ngừng bán trừ NGAY TẠI NGUỒN +
  lọc archived → page.js / san-pham / ProductModal / giỏ KHÔNG sửa dòng nào
  mà tự đúng. Khách thấy "số còn được bán", admin vẫn thấy số thật.
- **GuideStrip khối kho viết lại** theo veto: tự đặt số - đặt dè · web tự treo
  hết hàng theo ngưỡng · huỷ đơn tự hoàn kho · SKU trống = báo động.
- **Đối soát nhận .xlsx thẳng** (SheetJS nạp động — thêm dep `xlsx`): hết cảnh
  bắt nhân viên "Lưu thành CSV". Xoá nợ kỹ thuật cũ.
- Mặc định `min_stock` khi lưu sản phẩm: 5 → **10** (chốt 31/07).
- Dọn rác repo: xoá `app/admin2/` sót, `app/admin.zip`, `route.js` lạc ở gốc.
- **Tái lập `docs/`** (GitHub bị thiếu): HANDOFF (16 quyết định) + TIEN-DO +
  PHASE-3/4-spec + LUONG-VAN-HANH + ROADMAP.

### Test tay đã chạy ĐẠT (logic thuần)
Trạng thái dòng theo 2 ngưỡng (riêng từng mùi) · tồn combo BOM (kể cả *scent*,
BOM mồ côi, BOM trống) · merge stock_meta không đè ngưỡng cũ · đọc .xlsx →
planReconcile (giữ 'Chờ xử lý'). `next build` xanh 28 routes.

### ✅ Checklist nghiệm thu Phase 2 (test trên deploy thật)
1. Sửa tồn inline 1 mùi → storefront đổi theo (còn/hết đúng ngưỡng ngừng bán).
2. Đặt ngưỡng ngừng bán = 2 cho mùi còn 2 → web báo Hết hàng dù số chưa về 0.
3. Để tồn 9 (ngưỡng nhắc 10) → tự nhảy tab "Sắp hết".
4. Xoá SKU BS 1 mùi → ô viền đỏ; xuất BS 1 đơn chứa mùi đó → đơn bị loại kèm lý do.
   Xuất đơn thường → ra file .xlsx, up BigSeller NHẬN được, SĐT không mất số 0 đầu.
5. Tab Combo: combo *scent* hiện tồn = mùi thấp nhất; xoá BOM → cảnh báo đỏ.
6. Thêm 1 sản phẩm mới 2 mùi + ảnh (thử ảnh KHÔNG vuông → phải bị từ chối).
7. "Ngừng bán" sản phẩm test → biến mất khỏi web; mở đơn cũ có nó → tên vẫn đúng;
   "Mở bán lại" → hiện lại.
8. Kiểm kho hàng loạt: tick 3 mã, cộng +5, xem trước, áp → số đúng cả 3.
9. Đối soát: thả THẲNG file .xlsx BigSeller (không lưu CSV) → đọc được bình thường.
10. Tài khoản staff, tắt edit_price: sửa giá bị khoá 🔒, sửa tồn/SKU/ngưỡng vẫn được.

### 🔧 Vá nóng cùng ngày (sau khi Tùng test thật)
- **Xuất BigSeller đổi CSV → EXCEL .xlsx** — BS "Nhập đơn thủ công" không nhận
  CSV (phát hiện khi lên đơn thật). SheetJS, mọi ô ép dạng CHỮ nên SĐT không mất
  số 0 đầu (test tay: 39 cột + SĐT đọc lại đúng). Sửa luôn chú thích khai SKU
  trong modal xuất: trỏ về tab Sản phẩm & Kho (hết chữ "admin cũ" của Phase 1).

### 📌 Nợ kỹ thuật còn lại
- `manual-order` vẫn lặp resolveLine của `/api/orders/create` (gộp lib chung khi
  test được checkout).
- Ghim 📌 mới LƯU danh sách (`pinned_products`) — trang chủ RENDER danh sách này
  ở Phase 4 (Trang trí) đúng theo spec.
- `/admin-cu` + `/api/shipping/create` + GHN/GHTK trong lib/shipping.js: xoá khi
  Phase 3–4 xong.

### ⏭ VIỆC KẾ TIẾP
1. Tùng: push zip phiên này → deploy → nghiệm thu 10 mục trên (Phase 1 nếu chưa
   nghiệm thu thì làm cùng lượt — checklist trong bản TIEN-DO cũ vẫn đúng).
2. Phiên mới: Phase 3 (Tổng quan + Marketing) — demo trước → duyệt → code.
