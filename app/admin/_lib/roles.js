// app/admin/_lib/roles.js
// ─────────────────────────────────────────────────────────────────────
// MỘT hàm duy nhất để mọi nút/menu hỏi "tôi có được hiện không?".
// Nhắc lại nguyên tắc Phase 0: UI ẩn cho đỡ rối mắt — tầng khoá THẬT
// nằm ở database (RLS + trigger). Ẩn nút không phải là bảo mật.
// ─────────────────────────────────────────────────────────────────────

// ctx = { user, role, switches } lấy từ AdminContext trong layout.js
export const can = (ctx, perm) =>
  ctx?.role === 'owner' || (ctx?.role === 'staff' && !!ctx?.switches?.[perm])

// 5 công tắc — key phải TRÙNG với bảng staff_permissions trong DB
export const SWITCHES = [
  'edit_price',
  'add_products',
  'manage_vouchers',
  'edit_store',
  'see_revenue',
]

// Đường link nào cần công tắc nào (dùng chung với middleware)
export const GATED_ROUTES = {
  '/admin/marketing': 'manage_vouchers',
  '/admin/store':     'edit_store',
}
