# HANDOFF — trạng thái repo + quyết định khoá (bản tái lập 13/08/2026)

> Thư mục `docs/` từng bị THIẾU trên GitHub (bản 05/08 push không kèm docs).
> File này tái lập từ nhật ký các phiên. Phiên mới / dev đọc file này TRƯỚC,
> rồi `docs/TIEN-DO.md` để biết đang đứng ở đâu.

## Đang ở đâu (13/08/2026)
- **/admin = admin MỚI đang chạy** (Phase 0 phân quyền · Phase 1 Đơn hàng ·
  Phase 2 Sản phẩm & Kho đã code). Giả lập Phase 1: 35/35 PASS (05/08).
- `/admin2/*` → middleware redirect về `/admin/*`.
- `/admin-cu` = bản cũ, còn dùng tạm cho Marketing + Trang trí tới khi Phase 3–4 xong.
- Phase 3 (Tổng quan/Marketing) + Phase 4 (Trang trí) chưa làm — spec trong docs/.

## 16 quyết định KHOÁ (không mở lại nếu không có lệnh chủ shop)
1. Không đổi schema Supabase; cờ mới nằm trong JSON sẵn có hoặc site_config.
2. `lib/bigseller.js` không viết lại — chỉ vá map khi có bằng chứng file thật.
3. Xuất BigSeller: file EXCEL .xlsx 39 cột đúng template "Nhập đơn thủ công"
   (13/08: BS không nhận CSV — đã chuyển từ CSV sang xlsx), chống xuất trùng.
4. Cập nhật trạng thái đơn: file đối soát MỖI CHIỀU là đường chính (webhook chỉ phụ).
5. 5 công tắc phân quyền; khoá THẬT ở RLS/trigger; `edit_price` BẬT sẵn.
6. Sửa đơn = huỷ (lý do tự do) + tạo lại. Huỷ = hoàn kho TRƯỚC, đổi trạng thái SAU.
7. Ảnh: KHÔNG crop — ImageGate kiểm tỉ lệ (sản phẩm 1:1), sai thì từ chối kèm hướng dẫn.
8. "Xoá" sản phẩm = LƯU TRỮ (archived), không xoá cứng — đơn cũ vẫn đọc đúng tên.
9. Combo sống TRONG sản phẩm mẹ (`p.combos[]`), BOM có `*scent*`; tồn combo = món BOM thấp nhất.
10. Ngưỡng: nhắc nhập mặc định 10 (`minStock`) · tự ngừng bán (`safety`) tách riêng.
11. Đối soát: chỉ-đẩy-tới, 'Chờ xử lý' giữ nguyên, cửa sổ 7 ngày, >20 đơn bắt gõ số.
12. CẮT hẳn GHN khỏi web (05/08): địa chỉ = `lib/vn-address` tĩnh; phí ship
    site_config `shipping_flat_fee` (flat | 4 vùng) qua `computeShipFee()`.
13. 'Trả hàng & Hoàn tiền' → **Return Check** ("Hoàn hàng — chờ kiểm"): KHÔNG tự
    hoàn kho, kiểm hàng xong bấm hoàn kho tay ở Chi tiết đơn.
14. Đơn ADMIN tạo tay (FB/Zalo/phone) vào THẲNG 'Confirmed'; đơn khách web vào Pending.
15. Giao code = zip giải nén đè repo, Tùng tự push; mỗi zip phải `next build` pass.
16. **(13/08) KHÔNG đồng bộ tồn kho từ file BigSeller.** Kho web = nhân viên TỰ ĐẶT
    SỐ, tự căn hết hàng (đặt dè + ngưỡng ngừng bán) — như đang vận hành bên sàn.
    Đối soát giữ 1 file lịch sử đơn.

## Bản đồ dữ liệu Phase 2 (mọi thứ trong bảng/kiểu sẵn có)
- Tồn + giá: `products` (root hoặc `variants[]` JSON — đọc/ghi ĐÚNG NƠI storefront đọc).
- `site_config.stock_meta` = `{ [pid]: { archived, safety:{''|vid:n}, minStock:{vid:n} } }`
  — ngưỡng ngừng bán ÁP TẠI `lib/catalog.js` (trừ vào stock trước khi trả storefront
  → mọi chỗ so `stock <= 0` tự đúng, không sửa rải rác). archived lọc cùng chỗ.
- `site_config.bigseller` = `{ map: {'pid::vid'→SKU BS}, store }` — buildExport đang ăn.
- `site_config.pinned_products` = `[pid]` — ghim trang chủ; thứ tự hiển thị làm ở Phase 4.

## Câu khởi động phiên mới
"Đọc docs/HANDOFF.md + docs/TIEN-DO.md + docs/PHASE-3-spec.md, lập kế hoạch Phase 3 và bắt đầu."
Rules làm việc với chủ shop: xem project (claude/rules-lam-viec.md) — tiếng Việt thân mật,
chỉ từng bước, ngắn gọn, demo trước → duyệt → code, zip 1 lần cuối phiên.
