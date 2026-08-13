// app/admin/products/_lib/inv.js
// ─────────────────────────────────────────────────────────────────────
// Não chung của tab Sản phẩm & Kho — thuần logic, không React.
//
// stock_meta (site_config, KHÔNG đổi schema — quyết định khoá):
//   { [productId]: {
//       archived: bool,                   // "xoá" = nghỉ hưu, không đốt sổ
//       safety:   { ''|variantId: số },   // ngưỡng TỰ NGỪNG BÁN (mặc định 0)
//       minStock: { variantId: số },      // ngưỡng NHẮC NHẬP riêng từng mùi
//     } }
//   - '' = sản phẩm không phân loại. minStock của '' dùng cột min_stock sẵn có.
//   - safety mặc định 0 (chốt 13/08): kho web nhân viên tự đặt số nên mặc định
//     hành xử Y NHƯ CŨ (hết khi về 0); món chạy mạnh bên sàn thì tự nâng 2–3.
//
// skuMap (site_config key 'bigseller'.map): 'productId::variantId' → mã SKU BS.
// Giữ NGUYÊN định dạng — buildExport/explodeOrder đang ăn đúng map này.
// ─────────────────────────────────────────────────────────────────────
import { skuKey } from '../../../../lib/bigseller'

export const safetyOf   = (meta, pid, vid) => Number(meta?.[pid]?.safety?.[vid || '']) || 0
export const archivedOf = (meta, pid)      => !!meta?.[pid]?.archived
export const minStockOf = (meta, p, vid) => {
  const m = meta?.[p.id]?.minStock?.[vid || '']
  if (m !== undefined && m !== null && m !== '') return Number(m) || 0
  return Number(p.minStock ?? 10) || 10 // chốt 31/07: mặc định 10
}

/* Trạng thái 1 dòng SKU — cùng công thức với storefront:
   hết  = tồn ≤ ngưỡng ngừng bán · sắp hết = còn nhưng ≤ ngưỡng nhắc nhập */
export function rowStatus({ stock, safety, minStock, archived }) {
  if (archived) return 'hidden'
  const s = Number(stock) || 0
  if (s <= safety) return 'out'
  if (s <= minStock) return 'low'
  return 'in'
}

export const ROW_STATUS = {
  in:     { label: 'Còn hàng', tone: 'ok' },
  low:    { label: 'Sắp hết',  tone: 'warn' },
  out:    { label: 'Hết hàng', tone: 'bad' },
  hidden: { label: 'Đã ẩn',    tone: 'mut' },
}

/* Bung products → danh sách dòng SKU cho bảng.
   Mỗi phân loại 1 dòng; sản phẩm không phân loại = 1 dòng chính nó. */
export function buildRows(products, meta, skuMap) {
  const rows = []
  for (const p of products) {
    const archived = archivedOf(meta, p.id)
    const vars = Array.isArray(p.variants) ? p.variants : []
    const mk = (v) => {
      const vid = v ? v.id : ''
      const stock = Number(v ? v.stock : p.stock) || 0
      const safety = safetyOf(meta, p.id, vid)
      const minStock = minStockOf(meta, p, vid)
      return {
        key: `${p.id}::${vid}`, product: p, variant: v || null,
        pid: p.id, vid,
        name: p.name, vname: v ? v.name : '',
        price: Number(v ? v.price : p.price) || 0,
        stock, safety, minStock, archived,
        sku: skuMap?.[skuKey(p.id, vid)] || '',
        status: rowStatus({ stock, safety, minStock, archived }),
        img: (v && v.img) || p.img || '',
        hasVariants: vars.length > 0, first: !v || vars[0]?.id === v.id,
      }
    }
    if (vars.length) vars.forEach(v => rows.push(mk(v)))
    else rows.push(mk(null))
  }
  return rows
}

/* Dòng combo cho tab Combo — tồn khả dụng + cảnh báo, TÍNH GIỐNG HỆT
   explodeOrder/storefront: combo hết = có 1 món trong BOM hết. */
export function buildComboRows(products, meta, skuMap) {
  const out = []
  for (const p of products) {
    for (const c of (p.combos || [])) {
      const bom = Array.isArray(c.bom) ? c.bom : []
      let avail = null, warn = ''
      if (!bom.length) {
        warn = 'chưa khai BOM — sẽ bị bỏ qua khi xuất BigSeller'
      } else {
        avail = Infinity
        for (const row of bom) {
          const q = Number(row.qty) || 1
          let st
          if (row.variantId === '*scent*') {
            const stocks = (p.variants || []).map(v => Number(v.stock) || 0)
            st = stocks.length ? Math.min(...stocks) : 0
          } else if (row.variantId) {
            const v = (p.variants || []).find(x => x.id === row.variantId)
            if (!v) { warn = 'BOM trỏ tới phân loại không còn tồn tại — sửa lại BOM'; st = 0 }
            else st = Number(v.stock) || 0
          } else {
            st = Number(p.stock) || 0
          }
          avail = Math.min(avail, Math.floor(st / q))
        }
        if (!Number.isFinite(avail)) avail = 0
      }
      out.push({
        key: `${p.id}::${c.id}`, product: p, combo: c,
        name: c.name || '(combo chưa đặt tên)', parent: p.name,
        price: Number(c.price) || 0, avail, warn,
        bomText: bom.length
          ? bom.map(r => `${r.qty || 1} × ${r.variantId === '*scent*' ? 'mùi khách chọn'
              : r.variantId ? ((p.variants || []).find(v => v.id === r.variantId)?.name || '??')
              : 'SP gốc'}`).join(' + ')
          : '—',
        archived: archivedOf(meta, p.id),
      })
    }
  }
  return out
}

/* Vá stock_meta cho MỘT sản phẩm: đọc bản trong tay, chồng patch, trả
   object mới của pid đó để ghi qua mergeConfig('stock_meta', {[pid]: ...}).
   mergeConfig tự đọc lại bản DB mới nhất ở tầng key → hai tab không đè nhau. */
export function patchMeta(meta, pid, patch) {
  const cur = meta?.[pid] || {}
  const next = { ...cur, ...patch }
  if (patch.safety)   next.safety   = { ...(cur.safety || {}),   ...patch.safety }
  if (patch.minStock) next.minStock = { ...(cur.minStock || {}), ...patch.minStock }
  return next
}

export const fmtVnd = n => (Number(n) || 0).toLocaleString('vi-VN') + '₫'
