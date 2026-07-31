# Luồng vận hành Web ↔ BigSeller (bản chốt)

*Chốt 31/07/2026, sau khi xác nhận: shop bán đa kênh (web + Shopee/TikTok qua BigSeller), web 10–30 đơn/ngày. Tài liệu này cho CHỦ SHOP và NHÂN VIÊN đọc; phụ lục cuối cho người code.*

---

## Bức tranh một câu

> Web là nơi NHẬN đơn và CHỐT đơn. BigSeller là SỔ CÁI DUY NHẤT của kho và là nơi ĐÓNG HÀNG. Đơn vị vận chuyển tự báo kết quả giao về web, không ai phải gõ tay.

```
KHÁCH WEB ──→ Web nhận đơn ──→ gọi chốt ──→ ✓ Xác nhận
                                                │
KHÁCH SHOPEE/TIKTOK ──────────┐                 │ (file CSV mỗi sáng)
                              ▼                 ▼
                       ┌─── BIGSELLER: kho + đóng gói + in tem ───┐
                       └──────────────┬───────────────────────────┘
                                      ▼
                            GHN / GHTK giao hàng
                                      │  (tự động báo về)
                                      ▼
                       Web tự nhảy: Đang giao → Đã giao
```

## Ai làm chủ cái gì — không tranh cãi, không trùng vai

| Việc | Người cầm lái | Web đóng vai gì |
|---|---|---|
| Đơn từ web: nhận, gọi chốt, huỷ | **Web** | Chủ |
| Đơn từ Shopee/TikTok | **BigSeller** (tự đổ về) | Không liên quan |
| **Kho** (số tồn thật của từng mùi/SKU) | **BigSeller** — sổ cái duy nhất | Giữ BẢN SAO để hiện còn/hết hàng |
| Đóng gói, in tem, tạo vận đơn | **BigSeller** | Không đụng |
| Trạng thái giao (đang giao/đã giao/hoàn) | **Đơn vị vận chuyển** → chuông tự động | Tự cập nhật, không ai gõ |

**Quy tắc vàng về kho:** muốn sửa số tồn → sửa Ở BIGSELLER. Web chỉ nhận bản sao. Sửa tay trên web chỉ dành cho tình huống chữa cháy (ví dụ ẩn gấp một mùi), và lần đồng bộ sau sẽ ghi đè lại theo BS.

## Ngưỡng an toàn — tấm đệm chống bán lố

Vì Shopee/TikTok trừ kho bên BS theo thời gian thực còn web chỉ nhận bản sao định kỳ, bản sao trên web luôn có thể LẠC QUAN hơn thực tế vài đơn vị. Giải pháp: mỗi sản phẩm có **ngưỡng an toàn** — web tự chuyển "Hết hàng" khi bản sao tồn xuống tới ngưỡng, thay vì đợi về 0.

Ví dụ: WBS Cotton Candy ngưỡng an toàn = 2. Bản sao trên web còn 2 → khách web thấy "Hết hàng", dù có thể kho thật còn 1–2 lọ. Thà từ chối sớm 1 đơn còn hơn nhận đơn rồi gọi xin lỗi. Hàng bán chậm để ngưỡng 1; hàng cháy hàng trên sàn để ngưỡng 2–3.

## Nhịp vận hành

**Mỗi sáng (~10 phút, nhân viên):**
1. Mở web admin → tab "Đã xác nhận" → tick hết → **Xuất BigSeller** → nhập file vào BS.
2. (Nếu chiều nhiều đơn chốt muộn, có thể xuất thêm 1 lượt đầu giờ chiều — tuỳ vận hành, hệ thống không ép.)

**Trong ngày (tự nhiên):** đơn web mới tự hiện kèm chuông → gọi chốt → bấm Xác nhận. Khách không nghe máy → ghi vào ô ghi chú của đơn (ghi tự do, ví dụ "31/7 gọi 2 lần chưa nghe"). Khách xin đổi món/địa chỉ → **huỷ rồi đặt lại** (đã chốt), không sửa đơn.

**2–3 ngày một lần (~5 phút):** xuất file tồn kho từ BS → vào web admin bấm **"Đồng bộ kho từ BigSeller"** → xem bảng so sánh (web đang ghi bao nhiêu, BS nói bao nhiêu, lệch gì) → Áp dụng. Bản sao trên web lại khớp sổ cái.

**Mỗi chiều/tối (~5 phút) — chốt lại 31/07 theo chủ shop:** bên BS xuất file **trạng thái đơn hàng** → vào web bấm **"Đối soát BigSeller"** → thả file → xem trước → Áp dụng. Đây là **đường cập nhật trạng thái CHÍNH** (đang giao, đã giao, huỷ, hoàn): đơn giản, đều đặn, phủ mọi đơn vị vận chuyển book trong BS. Chuông tự động từ hãng vận chuyển (webhook) trở thành đồ tăng cường làm sau — có nó thì file mỗi chiều thường chỉ báo "không có gì đổi", không có nó hệ thống vẫn chạy đủ.

**Sắp tới (chốt hướng 31/07):** đơn chat (FB đang >15 đơn/ngày) lên thẳng web — Phase 1 có form tạo đơn tay; Phase 5 (ngay sau cutover) nối Messenger: bấm + Tạo đơn là chọn hội thoại của khách, AI đọc và điền form, nhân viên soát rồi tạo. Nhân viên vẫn chat bằng app Messenger như cũ. Đã bỏ phương án dán/upload chat. Đơn Zalo dùng form tay. Mọi đơn chat đi chung đường xuất BigSeller như đơn web.

## 5 quy tắc vàng dán tường cho nhân viên

1. Chốt đơn xong phải bấm **Xác nhận** — đơn không Xác nhận thì sáng mai không có trong file, nghĩa là KHÔNG được giao.
2. Sửa kho → sửa ở **BigSeller**, không sửa trên web.
3. Khách đổi ý sau khi chốt → **huỷ rồi đặt lại**, kho tự cộng trả, không sửa tay.
4. Đơn đã xuất sang BS mà huỷ trên web → **phải huỷ cả bên BS** (web sẽ nhắc, nhưng người bấm là bạn).
5. Thấy web báo "Hết hàng" mà mắt thấy kho còn → đừng tự cộng số trên web; chạy "Đồng bộ kho" trước, số sẽ tự đúng.

---

## Phụ lục kỹ thuật (cho người code — thay đổi so với spec trước)

1. **Kho trên web đổi vai: từ "sổ cái" thành "bản sao" (mirror).**
   - Thêm cột `safety_threshold` (mặc định 1) cho products/variants; storefront coi `stock <= safety_threshold` là hết hàng.
   - Web vẫn tự trừ khi có đơn web + cộng trả khi huỷ (giữ nguyên) — bản sao đúng dần giữa hai lần đồng bộ.
2. **Màn "Đồng bộ kho từ BigSeller" (thêm vào Phase 2):** upload file tồn kho BS xuất ra → map theo SKU (dùng skuKey hiện có) → bảng preview [SKU | web | BS | lệch] → Áp dụng = ghi đè stock web theo BS. SKU có bên BS mà web không có (hàng chỉ bán sàn) → liệt kê, bỏ qua. SKU web có mà file không có → cảnh báo, không tự đổi.
3. **Webhook GHN phải xây** (đơn web mặc định đi GHN, hiện chỉ có webhook GHTK). Cùng luật chỉ-đẩy-tới như đối soát.
4. **Đối soát BS (F5):** giữ nguyên logic, hạ nhịp khuyến nghị xuống tuần/lần; màn hình ghi rõ "lần đối soát gần nhất: X ngày trước", quá 10 ngày thì nhắc vàng ở Tổng quan.
5. **Q1 chốt:** theo dõi gọi khách = ô ghi chú tự do (cột `note` sẵn có), không làm bộ đếm. Khớp lựa chọn "ghi tự do" của lý do huỷ.
6. **Inline sửa tồn trên web (Phase 2) giữ lại** nhưng kèm dòng nhắc "Kho chủ nằm ở BigSeller — số này sẽ bị ghi đè ở lần đồng bộ tới".
