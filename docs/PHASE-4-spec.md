# Phase 4 — Trang trí gian hàng (CMS trang chủ + thương hiệu)

*Chốt 31/07/2026. Chỉ owner (hoặc staff khi công tắc `edit_store` BẬT). Nguyên tắc thép: **không đổi tên "ngăn kéo" dữ liệu** — trang chủ đang đọc từ hộp `home` (6 ngăn: hero, sp, tm, ab, txt, pet) và hộp `brand`; đổi tên là trang chủ trắng nội dung.*

---

> **BẢN 2 — chốt 31/07 sau khi duyệt demo:** Trang trí là trình sửa 2 cột kiểu Shopee: trái = danh sách khối + form, phải = **khung xem trước sống** (nhúng chính trang chủ thật, chế độ điện thoại/máy tính), gõ tới đâu thấy tới đó. Mỗi khối có **👁 ẩn/hiện** và **mũi tên đảo thứ tự** (Hero + Footer là khối bắt buộc, không ẩn được). KHÔNG làm kéo-thả tự do/page builder. Kỹ thuật: storefront đọc thêm 2 thứ từ hộp `home`: mảng thứ tự khối + cờ ẩn — thay đổi có kiểm soát, một chỗ duy nhất trong component trang chủ.

## Bố cục: một trang, các thẻ xếp theo đúng thứ tự khách nhìn thấy

**Nói dễ hiểu:** cuộn trang Cài đặt này từ trên xuống giống hệt cuộn trang chủ ngoài web — sửa tới đâu hình dung được tới đó.

| Thẻ | Ngăn dữ liệu cũ | Nội dung |
|---|---|---|
| 1. Đầu trang (Hero) | `home.hero` | Tiêu đề, ảnh nền, nút kêu gọi |
| 2. Khu sản phẩm | `home.sp` | **Chọn MÓN ở trang Sản phẩm** (nút 📌 Ghim lên trang chủ tại từng sản phẩm/combo — theo góp ý chủ shop 31/07); Trang trí chỉ chỉnh tiêu đề khu + sắp THỨ TỰ các món đã ghim + thấy trước bố cục |
| 3. Cảm nhận khách & video KOL | `home.tm` | Giữ ĐỦ cột của bản cũ: tài khoản, bé nhà ai, câu nói, **link TikTok/video**, ảnh bìa + khối con số. Luật cũ giữ nguyên: trống link = thẻ chữ nền navy. (Bản 1 demo từng làm rớt phần video — đã khôi phục) |
| 4. Về Hana | `home.ab` | Câu chuyện thương hiệu |
| 5. Chữ & nút chung | `home.txt` | Các đoạn chữ, nút, footer, liên hệ |
| 6. Mascot | `home.pet` | **GIỮ — chủ shop chốt 31/07.** Bản chất: bể ảnh mascot ngẫu nhiên "thò đầu" trong bong bóng trắng khi khách bấm Mua + câu cổ vũ đi kèm + vài mascot cố định đầu khu. Admin quản: thêm/bớt ảnh vào bể, sửa câu cổ vũ. (Cái bị cắt là con trỏ chuột trong ADMIN — hai thứ khác nhau.) Ý tưởng easter egg khi mua hàng: chủ shop muốn phát triển thêm, bàn ở dịp riêng — ngoài phạm vi rework admin |
| 7. Bộ nhận diện | `brand` | Logo, favicon. **Phần chỉnh màu nút admin: CẮT** (admin dùng màu cố định — đã chốt từ roadmap) |

## Cách hoạt động của từng thẻ

- Mỗi thẻ: xem tóm tắt hiện trạng → bấm "Chỉnh sửa" mở form của riêng ngăn đó → **"Lưu" theo TỪNG THẺ**, không lưu cả trang. (Bản cũ lưu nguyên hộp lớn — hai người cùng mở, người lưu sau đè sạch người lưu trước ở MỌI ngăn. Lưu theo thẻ thì va chạm chỉ còn trong phạm vi một ngăn.)
- **Chính sách ảnh (chốt 31/07 theo chủ shop): BỎ crop hoàn toàn.** Mỗi vị trí có kích thước chuẩn in ngay cạnh ô tải (đề xuất khởi điểm, chỉnh được: hero 1920×800; thẻ sản phẩm 800×800; ảnh bìa video 720×1280; logo vuông ≥512). Khi tải lên: kiểm TỈ LỆ (dung sai ~2%) — sai thì TỪ CHỐI kèm câu hướng dẫn cụ thể ("cần tỉ lệ 12:5, ảnh của bạn 4:3"); đúng thì tự thu nhỏ về chuẩn + nén rồi lưu. ImgUp giữ phần tải; CropModal xoá; thêm component `ImageGate` làm gác cổng dùng chung mọi nơi tải ảnh. Riêng ô tải MASCOT, `ImageGate` kiểm thêm **độ tối**: mascot nằm trong ổ tròn nền trắng nên ảnh sáng màu sẽ tàng hình (code cũ ghi rõ tương phản trên nền trắng phải ≥ 4.5 — bài học có thật đã trả phí) — ảnh sáng quá bị từ chối kèm câu "mascot cần màu tối để nổi trên nền trắng".
- Mỗi thẻ có nút **"Xem trước"** mở trang chủ ở tab mới, kèm dòng "Sửa lần cuối: [lúc nào]".
- Toast sau mỗi lần lưu; rời trang khi có thay đổi chưa lưu → hỏi lại.

## Ràng buộc an toàn

1. Ảnh hero trống hoặc tiêu đề trống → cảnh báo trước khi lưu (trang chủ trống đầu là mất mặt tiền).
2. Khu sản phẩm trỏ tới combo/sản phẩm đã lưu trữ (nghỉ hưu ở Phase 2) → thẻ đó báo đỏ "món này đã ngừng bán, khách sẽ thấy ô trống" ngay trong admin.
3. Không có nút "khôi phục mặc định" — dễ bấm nhầm mất sạch nội dung. Muốn làm lại thì sửa tay từng ô.

## Nghiệm thu Phase 4 — checklist chủ shop

1. ☐ Đổi tiêu đề Hero → Lưu → mở trang chủ thấy đổi ngay; các phần khác không suy suyển.
2. ☐ Mở 2 tab admin, tab A sửa Hero, tab B sửa Cảm nhận khách, lưu cả hai → CẢ HAI thay đổi cùng sống (không đè nhau).
3. ☐ Lưu trữ 1 sản phẩm đang nằm trên trang chủ → thẻ Khu sản phẩm báo đỏ đúng món đó.
4. ☐ Đổi logo → storefront + tab trình duyệt đổi theo.
5. ☐ Staff (công tắc `edit_store` TẮT) không thấy mục này; BẬT công tắc → thấy và sửa được.
6. ☐ Trong admin KHÔNG còn chỗ nào chỉnh màu giao diện admin.

---

# 🏁 TỔNG KẾT BỘ HỒ SƠ (đọc file nào trước)

| # | File | Dành cho | Nội dung |
|---|---|---|---|
| 1 | ROADMAP-rework-admin.md | Cả hai | Bức tranh lớn: giữ/gộp/cắt, 5 module, 6 phase |
| 2 | LUONG-VAN-HANH.md | **Chủ shop + nhân viên** | Luồng web ↔ BigSeller, nhịp làm việc, 5 quy tắc dán tường |
| 3 | PHASE-0-spec.md | Người code | Phân quyền 3 tầng + 5 công tắc + bộ khung (SQL chạy được) |
| 4 | PHASE-1-spec.md | Người code | Đơn hàng: 8 chức năng |
| 5 | PHASE-2-spec.md | Người code | Sản phẩm & kho: 7 chức năng (⚠ chờ file tồn BS mẫu cho F6) |
| 6 | PHASE-3-spec.md | Người code | Tổng quan + Voucher + Cài đặt |
| 7 | PHASE-4-spec.md | Người code | Trang trí gian hàng |
| — | demo-admin-hanapet.html | Cả hai | Mockup bấm thử được, chuẩn giao diện |

**Việc còn nợ trước khi code:** (1) chủ shop gửi file tồn kho mẫu xuất từ BigSeller; (2) chủ shop đổi mật khẩu tài khoản gốc; (3) veto voucher nếu muốn cắt gọn (mặc định: làm bản nâng cấp nhẹ).

# PHASE 5 (SAU CUTOVER) — Lên đơn từ Messenger

*Chốt hướng 31/07 sau thảo luận. Bối cảnh quyết định: chat FB đang chốt **>15 đơn/ngày** bằng Messenger thuần (không Pancake/tool) — kênh ngang ngửa web, đáng ưu tiên cao ngay sau cutover.*

**Phạm vi (cỡ B — đã chọn):** nhân viên VẪN chat bằng app Messenger như hiện tại, không đổi thói quen. Chỉ nâng cấp nút "+ Tạo đơn" của Phase 1: hiện danh sách hội thoại gần nhất của page → chọn khách → AI đọc hội thoại, điền sẵn form (tên, SĐT, địa chỉ, món/mùi, số lượng) → nhân viên SOÁT rồi bấm tạo. KHÔNG xây hộp thư chat trong admin (đó là xây lại Pancake — ngoài phạm vi vĩnh viễn). ĐÃ BỎ phương án dán chat.

**Nguyên tắc thép:** máy điền — người soát — người bấm tạo. Không bao giờ tự tạo đơn không có người duyệt. SĐT/địa chỉ AI điền phải được tô sáng "máy đọc, hãy soát kỹ" (địa chỉ sai với COD = mất tiền ship 2 chiều).

**Kỹ thuật (tóm tắt cho người code):** Meta app + Messenger Platform cho CHÍNH page của shop (tài liệu Meta hiện hành: không cần App Review khi chỉ nhận/gửi cho page của mình — kiểm lại tại thời điểm làm vì Meta đã báo đổi yêu cầu API từ 27/04/2026); webhook nhận tin → lưu hội thoại gần đây (giữ tối thiểu, có hạn xoá — dữ liệu chat của khách là dữ liệu nhạy cảm); màn chọn hội thoại trong + Tạo đơn; AI trích trường từ hội thoại tiếng Việt tự nhiên; token page lưu server, không bao giờ ra trình duyệt.

**Ngoài phạm vi Phase 5:** Zalo (đơn Zalo tiếp tục dùng form tay; Zalo OA API tính sau nếu nhu cầu đủ lớn), nhắn tin chủ động cho khách, chatbot tự trả lời.

**Backlog khác (ghi sổ 31/07):** webhook GHN realtime (tăng cường cho file mỗi chiều); easter egg khi khách mua — chủ đề riêng của chủ shop.

**Trình tự code:** Phase 0 → nghiệm thu 6 ô → Phase 1 → nhân viên dùng thật vài ngày → Phase 2 → 3 → 4 → cutover (đổi /admin2 thành /admin, xoá code cũ).
