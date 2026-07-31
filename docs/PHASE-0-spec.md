# Phase 0 — Nền móng: Phân quyền + Bộ khung (bản 2 — có bảng công tắc)

*Cập nhật 30/07/2026 theo duyệt của chủ shop: phân quyền dạng CÔNG TẮC bật/tắt được, không hàn chết. Các bảng thật trong DB: `products`, `orders`, `site_config`, `categories`, `vouchers`, `subscribers`.*

**Dành cho chủ shop đọc:** chỉ cần đọc mục 1 và mục 6. Phần còn lại là bản vẽ kỹ thuật cho người code.

---

## 1. Mô hình: 2 vai + 5 công tắc

- **Chủ shop (owner):** làm được mọi thứ. Tài khoản gốc: `tung.le@hana.pet`.
- **Nhân viên (staff):** mặc định chỉ xử lý đơn hàng, sửa tồn kho, sửa mô tả sản phẩm.
- **5 công tắc** chủ shop bật/tắt cho nhân viên (mặc định TẮT hết = đúng bảng quyền đã duyệt):

| Công tắc | Khi BẬT, nhân viên được |
|---|---|
| `edit_price` | Sửa giá bán |
| `add_products` | Thêm / xoá sản phẩm |
| `manage_vouchers` | Vào mục Kênh Marketing (voucher, danh mục) |
| `edit_store` | Vào mục Trang trí gian hàng |
| `see_revenue` | Xem doanh thu ở Tổng quan |

Cố ý chỉ có 5 công tắc lớn, không băm nhỏ thành 50 cái — nhiều công tắc quá thì chủ shop thành người gác cổng toàn thời gian.

**Màn hình gạt công tắc + màn thêm/khoá tài khoản nhân viên** nằm ở mục "Cài đặt" (chỉ owner thấy), làm ở **Phase 3**. Nhưng toàn bộ đường dây điện đi từ Phase 0 — nên Phase 1, 2 không phải đục lại.

**Thêm nhân viên (trước khi có màn hình ở Phase 3):** tạo tài khoản trong Supabase Dashboard rồi chạy 1 câu lệnh gán vai (mục 2.2) — sẽ có hướng dẫn từng bước kèm ảnh khi bàn giao. Sau Phase 3 thì chủ shop tự thêm ngay trong admin, không cần đụng Supabase.

> ⚠️ Không lưu mật khẩu ở bất kỳ tài liệu/đoạn chat nào. Việc gán quyền chỉ cần EMAIL.

---

## 2. Tầng 1 — Database (tầng khoá thật)

### 2.1 Bảng công tắc

```sql
create table if not exists staff_permissions (
  key     text primary key,
  allowed boolean not null default false,
  label   text not null
);

insert into staff_permissions (key, allowed, label) values
  ('edit_price',      false, 'Nhân viên được sửa giá bán'),
  ('add_products',    false, 'Nhân viên được thêm/xoá sản phẩm'),
  ('manage_vouchers', false, 'Nhân viên được quản lý khuyến mãi & danh mục'),
  ('edit_store',      false, 'Nhân viên được sửa trang trí gian hàng'),
  ('see_revenue',     false, 'Nhân viên được xem doanh thu')
on conflict (key) do nothing;
```

### 2.2 Vai + hàm dùng chung

Role lưu trong **`app_metadata`** (KHÔNG phải `user_metadata` — thứ đó user tự sửa được, staff tự phong owner trong 1 dòng lệnh).

```sql
-- Gán vai (chạy trong Supabase SQL Editor; user phải đăng nhập lại mới nhận vai)
update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"owner"}'::jsonb
where email = 'tung.le@hana.pet';

-- Mẫu cho nhân viên thêm sau này:
-- update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"staff"}'::jsonb
-- where email = '<email nhân viên>';
```

```sql
create or replace function public.admin_role()
returns text language sql stable as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
$$;

-- Trái tim của hệ công tắc: owner luôn qua, staff tra bảng công tắc
create or replace function public.staff_can(perm text)
returns boolean language sql stable security definer as $$
  select case
    when public.admin_role() = 'owner' then true
    when public.admin_role() = 'staff'
      then coalesce((select allowed from public.staff_permissions where key = perm), false)
    else false
  end;
$$;
```

### 2.3 RLS theo từng bảng

| Bảng | Khách web (anon) | Staff | Owner |
|---|---|---|---|
| `products` | Đọc | Đọc, sửa (giá theo công tắc — mục 2.4); thêm/xoá theo `add_products` | Full |
| `orders` | — (tạo đơn qua API server, service key — ĐÃ XÁC MINH trong `app/api/orders/create/route.js`) | Đọc, sửa | Đọc, sửa |
| `site_config` | Đọc | Ghi theo `edit_store` | Full |
| `categories` | Đọc | Ghi theo `manage_vouchers` | Full |
| `vouchers` | — (validate qua API server) | Theo `manage_vouchers` | Full |
| `subscribers` | Thêm | — | Đọc, xoá |
| `staff_permissions` | — | Đọc (để UI biết ẩn/hiện) | Đọc + gạt công tắc |

```sql
-- ═══ PRODUCTS ═══
alter table products enable row level security;
create policy "public read products"  on products for select using (true);
create policy "admin update products" on products for update
  using (admin_role() in ('owner','staff'));
create policy "insert products by switch" on products for insert
  with check (staff_can('add_products'));
create policy "delete products by switch" on products for delete
  using (staff_can('add_products'));

-- ═══ ORDERS ═══
alter table orders enable row level security;
create policy "admin read orders"   on orders for select using (admin_role() in ('owner','staff'));
create policy "admin update orders" on orders for update using (admin_role() in ('owner','staff'));
-- Không mở insert cho anon: /api/orders/create dùng service key (bỏ qua RLS) — đã kiểm tra, đúng.

-- ═══ SITE_CONFIG ═══
alter table site_config enable row level security;
create policy "public read config" on site_config for select using (true);
create policy "write config by switch" on site_config for insert with check (staff_can('edit_store'));
create policy "update config by switch" on site_config for update using (staff_can('edit_store'));
create policy "delete config by switch" on site_config for delete using (staff_can('edit_store'));

-- ═══ CATEGORIES ═══
alter table categories enable row level security;
create policy "public read categories" on categories for select using (true);
create policy "write categories by switch"  on categories for insert with check (staff_can('manage_vouchers'));
create policy "update categories by switch" on categories for update using (staff_can('manage_vouchers'));
create policy "delete categories by switch" on categories for delete using (staff_can('manage_vouchers'));

-- ═══ VOUCHERS ═══  (lưu ý: saveVouchers hiện XOÁ SẠCH bảng rồi chèn lại — bắt buộc phải khoá)
alter table vouchers enable row level security;
create policy "vouchers by switch" on vouchers for all
  using (staff_can('manage_vouchers')) with check (staff_can('manage_vouchers'));

-- ═══ SUBSCRIBERS ═══
alter table subscribers enable row level security;
create policy "public insert subscribers" on subscribers for insert with check (true);
create policy "owner read subscribers"   on subscribers for select using (admin_role() = 'owner');
create policy "owner delete subscribers" on subscribers for delete using (admin_role() = 'owner');

-- ═══ STAFF_PERMISSIONS (bảng công tắc tự bảo vệ mình) ═══
alter table staff_permissions enable row level security;
create policy "admins read switches" on staff_permissions for select
  using (admin_role() in ('owner','staff'));
create policy "owner flips switches" on staff_permissions for update
  using (admin_role() = 'owner');
-- Không có insert/delete: 5 công tắc là cố định, chỉ gạt allowed.
```

### 2.4 Trigger bảo vệ cột giá (RLS chặn theo hàng, không chặn theo cột)

```sql
create or replace function public.protect_price_columns()
returns trigger language plpgsql security definer as $$
begin
  if not staff_can('edit_price') and admin_role() = 'staff' then
    if new.price is distinct from old.price
    or new.original is distinct from old.original then
      raise exception 'Chỉ chủ shop được sửa giá bán (hoặc bật công tắc edit_price)';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_price on products;
create trigger trg_protect_price
  before update on products
  for each row execute function public.protect_price_columns();
```

Ghi chú cho code mới: thay `upsertProduct` kiểu "ghi cả cục" bằng update theo nhóm cột (`updateProductInfo` / `updateProductPrice` / `updateProductStock`) để lỗi chặn giá không văng ra khi staff chỉ sửa mô tả.

---

## 3. Tầng 2 — Middleware (chặn đường link)

Giữ cách verify token hiện tại (đã đúng), nối thêm:

```js
const GATED = {                       // đường link → công tắc tương ứng
  '/admin2/marketing': 'manage_vouchers',
  '/admin2/store':     'edit_store',
};
const role = user?.app_metadata?.role ?? '';
if (!['owner','staff'].includes(role))
  return NextResponse.redirect(new URL('/admin2/login?err=norole', request.url));

if (role === 'staff') {
  const gate = Object.entries(GATED).find(([p]) => pathname.startsWith(p));
  if (gate) {
    const { data } = await supabase.from('staff_permissions')
      .select('allowed').eq('key', gate[1]).maybeSingle();
    if (!data?.allowed) return NextResponse.redirect(new URL('/admin2', request.url));
  }
}
```

```js
export const config = { matcher: ['/admin/:path*', '/admin2/:path*'] }
```

---

## 4. Tầng 3 — UI (ẩn/hiện theo vai + công tắc)

`layout.js` tải session + 5 công tắc MỘT lần → context `{ user, role, switches }`. Sidebar và mọi nút nhạy cảm hỏi một hàm duy nhất:

```js
// app/admin2/_lib/roles.js
export const can = (ctx, perm) =>
  ctx.role === 'owner' || (ctx.role === 'staff' && !!ctx.switches[perm]);
```

Nhắc lại nguyên tắc: UI ẩn để đỡ rối mắt; tầng khoá thật là mục 2.

---

## 5. Bộ khung code + component dùng chung

```
app/admin2/
  layout.js               ← sidebar + topbar + AdminContext {user, role, switches}
  login/page.js           ← port từ /admin/login
  page.js                 ← Tổng quan (placeholder tới Phase 3)
  orders/… products/… marketing/… store/…
  settings/page.js        ← Phase 3: gạt 5 công tắc + thêm/khoá tài khoản nhân viên
  _lib/roles.js  _lib/tokens.js
  _components/  DataTable · StatusBadge · Tabs · SearchBar · DateRange
                ConfirmModal · Toast · GuideStrip (bảng quy trình gắn tường, nội dung khai báo 1 chỗ) · ImgUp (port phần tải từ admin cũ) · ImageGate (MỚI — gác cổng ảnh: kiểm tỉ lệ theo chuẩn từng vị trí, tự thu nhỏ + nén; thay CropModal đã BỎ theo chốt 31/07)
```

Quy ước chốt cho mọi phase: file < 400 dòng; màu/spacing lấy từ `tokens.js`; mọi thao tác ghi có Toast, thao tác phá huỷ có ConfirmModal nói rõ hậu quả.

---

## 6. Nghiệm thu Phase 0 — checklist cho chủ shop

Cần 2 tài khoản thật (owner + 1 staff tạm), làm trên 2 trình duyệt:

1. ☐ Đăng nhập staff: không thấy Marketing / Trang trí; gõ thẳng link vào → bị đá về Tổng quan.
2. ☐ Nhờ người kỹ thuật "thử phá" bằng tài khoản staff (các lệnh có sẵn bên dưới): xoá voucher → **bị từ chối, bảng còn nguyên**; sửa giá → **bị từ chối**; sửa tồn kho → **được**.
3. ☐ Owner gạt công tắc `edit_price` BẬT → staff sửa được giá; gạt TẮT → lại bị chặn. (Trước Phase 3 thì gạt bằng lệnh; từ Phase 3 gạt trên màn hình.)
4. ☐ Mở web bằng điện thoại như khách (không đăng nhập): xem sản phẩm, **đặt 1 đơn thật thành công**, đăng ký nhận tin được. ← chỗ dễ vỡ nhất sau khi bật khoá.
5. ☐ Đơn test ở bước 4 hiện trong admin cho cả 2 tài khoản.
6. ☐ Tài khoản không có vai → không vào được admin.

Lệnh "thử phá" cho người kỹ thuật (chạy trong Console khi đăng nhập staff):
```js
await supabase.from('vouchers').delete().not('id','is',null)              // phải LỖI
await supabase.from('products').update({price: 1}).eq('id','misty-spray') // phải LỖI
await supabase.from('products').update({stock: 40}).eq('id','misty-spray')// phải OK
await supabase.from('staff_permissions').update({allowed:true}).eq('key','edit_price') // phải LỖI (staff không tự gạt công tắc)
```

Tick đủ 6 ô mới sang Phase 1.

---

## 7. Bước kế tiếp

Spec **Phase 1 — Đơn hàng**, mổ từng chức năng: danh sách + tab đếm số → tìm kiếm/lọc → xác nhận đơn (lẻ + hàng loạt) → xuất BigSeller → đối soát (xem trước → áp dụng) → huỷ đơn + hoàn kho → chi tiết đơn → webhook GHTK. Mỗi chức năng chốt: đầu vào → xử lý → đầu ra → tình huống lỗi → ai được bấm.
