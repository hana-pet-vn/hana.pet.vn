# Roadmap rework Admin — Hanapet

*Bản chốt scope trước khi code. Cập nhật: 30/07/2026.*

---

## 1. Mục tiêu & nguyên tắc bất di bất dịch

**Mục tiêu:** admin mới theo bố cục Shopee Seller Center (sidebar trái + tab trạng thái có đếm số) để nhân viên thao tác không cần đào tạo, code tách module để sửa một chỗ không vỡ chỗ khác.

**Nguyên tắc:**

1. **Không đổi schema Supabase.** Bảng products, orders, configs, vouchers, categories giữ nguyên. Storefront không bị ảnh hưởng, không cần migrate data. Chỉ THÊM 1 thứ duy nhất: cột/metadata `role` cho user (mục 3).
2. **Logic nghiệp vụ đã đúng thì bê nguyên, không viết lại.** Cụ thể: `lib/bigseller.js` (bung combo theo BOM, chia giá tỉ lệ, đối soát chỉ đẩy tới), `restockOrder` (hoàn kho khi huỷ), tồn kho theo variant/SKU (bài học v21.5). Các comment version v20–v22 trong code cũ là danh sách bug đã trả học phí — bản mới phải giữ nguyên các fix đó.
3. **Admin cũ chạy song song.** Bản mới dựng ở `/admin2`, xong module nào chuyển nhân viên sang module đó, ổn định hết thì đổi route và xoá bản cũ.
4. **Admin là công cụ lao động.** Không hiệu ứng, không custom cursor, không chỉnh màu giao diện. Mỗi màn hình trả lời một câu hỏi: nhân viên vào đây để làm việc gì?

---

## 2. Danh sách chức năng: GIỮ / GỘP / CẮT

### GIỮ (rework UI, logic giữ nguyên)
| Chức năng | Ghi chú |
|---|---|
| Danh sách đơn + đổi trạng thái | Pipeline 7 trạng thái giữ nguyên |
| Huỷ đơn + hoàn kho | Bê nguyên logic restockOrder |
| Xuất CSV sang BigSeller | `buildExport` giữ nguyên |
| Đối soát file BS → cập nhật trạng thái + hoàn kho | `planReconcile` giữ nguyên |
| CRUD sản phẩm + variant + ảnh (upload/crop) | Tái dùng ImgUp + CropModal |
| Sửa tồn kho theo SKU, cảnh báo dưới minStock, bulk update | |
| Voucher, danh mục | |
| CMS trang chủ (hero, combo hiển thị, footer, logo...) | Rework gọn lại, giữ nguyên KEY configs để storefront đọc được |

### GỘP (đang tách nhiều nơi → về một nơi)
| Hiện tại | Về đâu |
|---|---|
| TabOrders (trong page.js) + trang /admin/orders riêng | **Một** module Đơn hàng duy nhất, lấy phần filter/search của trang riêng làm chuẩn |
| Tab Sản phẩm + Tab Combo + Tab Tồn kho | **Một** module Sản phẩm. Combo = sản phẩm có BOM. Tồn kho = cột trong bảng, sửa inline + màn "Kiểm kho" cho bulk |
| Tab Trang chủ + Tab Thương hiệu | **Một** module Trang trí gian hàng |

### CẮT HẲN
- Custom cursor trong admin.
- Chỉnh màu nút admin (tab Thương hiệu cũ) — admin dùng token màu cố định.
- `usePersist`/localStorage cho data nghiệp vụ — chỉ còn dùng cho UI state (tab đang mở, độ rộng cột).
- Toàn bộ `alert()`/`confirm()` → thay bằng Toast + Modal xác nhận.

### CẮT CÓ ĐIỀU KIỆN (chốt trong Phase 1)
- **Nút "Tự động tạo vận đơn GHN/GHTK" từ web.** Vì in tem và fulfillment đã nằm bên BigSeller, khả năng cao vận đơn cũng tạo bên đó → nút này thừa và dễ tạo vận đơn trùng. Đề xuất: ẩn với staff, giữ cho owner 1–2 tuần, không ai dùng thì xoá cùng API `/api/shipping/create`. Webhook GHTK giữ (cập nhật trạng thái tự động vẫn có giá trị).

---

## 3. Phân quyền (làm từ Phase 0)

Hai vai trò, lưu `role` trong `app_metadata` của Supabase Auth (hoặc bảng `admin_users` nếu muốn quản lý qua UI sau này):

| Module | Staff | Owner |
|---|---|---|
| Tổng quan | Thấy đơn cần xử lý + cảnh báo kho. **Không thấy doanh thu** | Thấy hết |
| Đơn hàng | Toàn quyền thao tác | Toàn quyền |
| Sản phẩm & kho | Sửa tồn kho, sửa thông tin SP | Thêm/xoá SP, sửa giá |
| Marketing (voucher, danh mục) | Ẩn | Toàn quyền |
| Trang trí gian hàng | Ẩn | Toàn quyền |

> **Bản 2 (đã duyệt):** bảng trên là thiết lập MẶC ĐỊNH, không hàn chết. Owner có **5 công tắc** bật/tắt cho staff: sửa giá, thêm/xoá SP, quản lý khuyến mãi, trang trí gian hàng, xem doanh thu. Màn hình gạt công tắc + thêm/khoá tài khoản nhân viên nằm ở mục Cài đặt (Phase 3); hệ thống công tắc phía database đi dây từ Phase 0. Chi tiết: PHASE-0-spec.md.

**Ba tầng bắt buộc, thiếu một tầng là phân quyền chỉ để trang trí:**
1. **UI**: ẩn mục sidebar theo role.
2. **Middleware**: chặn route `/admin2/marketing`, `/admin2/store` với staff.
3. **Database (RLS)**: đây là tầng thật. Admin hiện gọi Supabase bằng anon key từ client → nếu chỉ ẩn UI, staff biết chút kỹ thuật vẫn gọi thẳng API sửa được voucher/giá. Cần RLS policy: staff không được UPDATE bảng vouchers/configs, không được UPDATE cột price của products, v.v.

---

## 4. Bố cục màn hình (map Shopee Seller Center)

Khung chung: **sidebar trắng cố định bên trái** (thu gọn được, mobile thành bottom bar), nền nội dung `#f6f6f6`, card trắng bo góc nhẹ, màu chủ đạo navy `#1b295b` thay cam Shopee. Topbar: tên shop, chuông thông báo đơn mới, avatar/đăng xuất.

### 4.1 Tổng quan (`/admin2`)
Trả lời câu hỏi "hôm nay cần làm gì": số đơn Chờ xác nhận (bấm nhảy thẳng vào), số đơn đã xác nhận chưa xuất sang BS, danh sách SKU dưới ngưỡng tồn. Owner thấy thêm: doanh thu hôm nay/7 ngày, đơn theo ngày.

### 4.2 Đơn hàng (`/admin2/orders`) — trái tim của rework
- Tab ngang: **Tất cả / Chờ xác nhận / Đã xác nhận / Đang đóng gói / Đang giao / Đã giao / Đã huỷ** — badge đếm số đỏ trên tab cần hành động.
- Dưới tab: ô search (mã đơn, tên, SĐT) + lọc khoảng ngày + lọc nguồn.
- Bảng đơn kiểu Shopee: mỗi dòng gồm sản phẩm (ảnh nhỏ + tên + số lượng), tổng tiền, khách, trạng thái, cột hành động theo ngữ cảnh (Chờ xác nhận → nút "Xác nhận"; Đã xác nhận → tick chọn để xuất BS...).
- Bulk: chọn nhiều đơn → **Xuất BigSeller** (CSV), xác nhận hàng loạt.
- Nút **Đối soát BigSeller**: kéo-thả file xuất từ BS → xem preview thay đổi (đơn nào lên trạng thái gì, đơn nào hoàn kho) → bấm áp dụng. Preview trước khi áp dụng là bắt buộc.
- Trang chi tiết đơn: pipeline trạng thái, thông tin khách/giao hàng, món hàng, lịch sử thay đổi.

### 4.3 Sản phẩm & kho (`/admin2/products`)

> **Bản 2 (sau khi chốt luồng đa kênh):** kho trên web là BẢN SAO — sổ cái duy nhất nằm ở BigSeller (nơi Shopee/TikTok trừ hàng). Module này thêm: nút **"Đồng bộ kho từ BigSeller"** (upload file tồn BS → preview lệch → áp dụng) và cột **ngưỡng an toàn** cho từng SKU (web báo hết hàng khi bản sao ≤ ngưỡng, chống bán lố giữa hai lần đồng bộ). Sửa tồn inline giữ lại cho tình huống chữa cháy, kèm nhắc "sẽ bị ghi đè ở lần đồng bộ tới". Chi tiết: LUONG-VAN-HANH.md.
- Tab ngang: **Tất cả / Còn hàng / Sắp hết / Hết hàng / Combo**.
- Bảng: ảnh, tên, SKU, giá, **tồn kho sửa inline từng variant** (click vào số → sửa → enter), trạng thái hiện/ẩn trên web.
- Trang thêm/sửa SP: thông tin chung → variant + tồn từng variant → ảnh (upload/crop) → riêng combo có phần BOM (chọn SKU con + số lượng).
- Màn "Kiểm kho": chọn nhiều SKU → đặt/cộng số lượng hàng loạt (giữ logic bulk hiện tại).

### 4.4 Marketing (`/admin2/marketing`) — owner only
Voucher (bảng + form, hiện trạng thái hết hạn/hết lượt) và Danh mục (kéo thả thứ tự).

### 4.5 Trang trí gian hàng (`/admin2/store`) — owner only, rework gọn
Một trang duy nhất chia section theo đúng thứ tự khách nhìn thấy trên web: **Hero → Combo hiển thị → Cảm nhận khách → Về Hana → Footer & liên hệ → Logo/Favicon**. Mỗi section một card, có nút "Xem trước" mở storefront. Ghi vào đúng key configs hiện tại — không đổi tên key, không đổi cấu trúc value.

---

## 5. Kiến trúc code

```
app/admin2/
  layout.js            ← sidebar + topbar + guard auth/role (dùng chung)
  page.js              ← Tổng quan
  orders/
    page.js            ← danh sách + tab + filter
    [id]/page.js       ← chi tiết đơn
  products/
    page.js
    new/page.js
    [id]/page.js
  marketing/page.js
  store/page.js
  _components/         ← DataTable, StatusBadge, Toast, ConfirmModal,
                          SearchBar, DateRange, ImgUp, CropModal (port từ cũ)
  _lib/roles.js        ← định nghĩa quyền, dùng chung UI + middleware
lib/                   ← supabase.js, bigseller.js GIỮ NGUYÊN
middleware.js          ← thêm check role cho /admin2
```

Quy ước: mỗi file dưới ~400 dòng, component nào dùng ở 2 nơi trở lên thì vào `_components`, không inline-style tay từng nút — dùng bộ token (màu, spacing, radius) khai báo một chỗ.

---

## 6. Phases & tiêu chí xong

| Phase | Nội dung | Xong khi |
|---|---|---|
| **0. Skeleton** | Layout sidebar + auth + phân quyền 3 tầng (UI, middleware, RLS) + bộ component chung + design token | Đăng nhập staff/owner thấy sidebar khác nhau; staff gọi API sửa voucher bị Supabase từ chối |
| **1. Đơn hàng** | Toàn bộ 4.2 | Nhân viên xử lý trọn một ngày đơn (xác nhận → xuất BS → đối soát) chỉ trên bản mới, không mở bản cũ |
| **2. Sản phẩm & kho** | Toàn bộ 4.3 | Thêm 1 SP có variant + 1 combo có BOM, sửa tồn inline, số khớp storefront |
| **3. Tổng quan + Marketing + Cài đặt** | 4.1 + 4.4 + màn gạt 5 công tắc phân quyền, thêm/khoá tài khoản nhân viên | Owner nhìn dashboard biết doanh thu + việc tồn đọng; tạo voucher dùng được ngay; owner tự thêm nhân viên và gạt quyền không cần đụng Supabase |
| **4. Trang trí gian hàng** | 4.5 | Owner đổi hero + combo hiển thị, storefront cập nhật đúng, không sờ code |
| **5. Cutover** | Đổi `/admin2` → `/admin`, xoá code cũ, xoá route/API không dùng | Repo không còn file admin >500 dòng |

Làm tuần tự, mỗi phase deploy được và dùng thật được. Không nhảy cóc sang phase sau khi phase trước chưa được nhân viên dùng thật ít nhất vài ngày — người dùng thật sẽ lòi ra thứ thiết kế không thấy.

---

## 7. Rủi ro cần nhớ

1. **RLS là việc dễ lười nhất và nguy hiểm nhất.** Ẩn UI không phải là phân quyền.
2. **Đối soát BS phải có preview.** Áp thẳng file cũ có thể kéo lùi trạng thái hoặc hoàn kho trùng — logic `planReconcile` đã chống kéo lùi, nhưng UI phải cho người dùng thấy trước khi bấm.
3. **Đừng đổi key configs khi rework CMS.** Storefront đọc theo key cũ; đổi key = trang chủ trắng nội dung.
4. **Chạy song song nghĩa là hai nơi ghi cùng DB.** Trong giai đoạn chuyển tiếp, quy ước rõ với nhân viên: module nào đã chuyển thì CHỈ thao tác bên mới, tránh mỗi người sửa một bên.
