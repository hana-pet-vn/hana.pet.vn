// lib/bigseller.js
// ─────────────────────────────────────────────────────────────────────────────
// Cầu nối Hanapet Web ↔ BigSeller. THUẦN LOGIC — không đụng React, không đụng
// Supabase. Muốn kiểm thì gọi thẳng từng hàm.
//
// Hai chiều:
//   1. XUẤT   đơn web  → file CSV nhập vào BigSeller (Manual Orders)
//   2. ĐỐI SOÁT file đơn từ BigSeller → cập nhật trạng thái + hoàn kho
//
// Nguyên tắc đã chốt (V22):
//   · KHÔNG gửi mã combo sang BS. Combo bung thành SKU lẻ theo BOM.
//   · Giá combo CHIA TỈ LỆ vào từng SKU con theo giá lẻ. Ô "Giảm giá" luôn 0
//     → doanh thu quy về từng SKU bên BS luôn đúng, không phụ thuộc BS có tự
//     chia ô giảm giá xuống dòng hay không.
//   · Cùng một SKU xuất hiện nhiều lần trong đơn thì GỘP thành một dòng.
//   · Web sinh mã đơn (HP-XXXXXX). BS ghi lại mã đó, không đè.
// ─────────────────────────────────────────────────────────────────────────────

/* ── Trạng thái BigSeller → trạng thái web ────────────────────────────────────
   Lấy từ file xuất thật ngày 29/07/2026. Gặp giá trị lạ thì KHÔNG đoán —
   importer sẽ liệt kê ra để bổ sung vào bảng này. */
export const BS_STATUS_MAP = {
  'Chờ in':          'Confirmed',
  'Chờ lấy hàng':    'Handed to GHN',
  'Đang giao hàng':  'In Transit',
  'Đã hoàn thành':   'Delivered',
  'Đã hủy':          'Cancelled',
  'Đã huỷ':          'Cancelled',   // hai kiểu bỏ dấu hỏi/ngã đều gặp
}

/* Thứ tự tiến của trạng thái web. Đối soát CHỈ ĐƯỢC ĐẨY TỚI, không kéo lùi —
   tránh file cũ đè lên thứ nhân viên vừa cập nhật tay.
   Ngoại lệ duy nhất: 'Cancelled' luôn thắng (khách trả hàng sau khi nhận). */
export const WEB_STATUS_ORDER = [
  'Pending', 'Confirmed', 'Packing', 'Handed to GHN', 'In Transit', 'Delivered',
]

/* Đơn ở trạng thái nào thì được xuất sang BS.
   CỐ Ý bỏ 'Pending': đơn hỏng sớm (sai số, gọi không nghe) chết ngay trên web,
   không phải đụng tới BigSeller lần nào. */
export const EXPORTABLE_STATUSES = ['Confirmed', 'Packing', 'Handed to GHN', 'In Transit']

/* 39 cột của mẫu "import_manual_order_template_vn.xlsx", ĐÚNG THỨ TỰ.
   Đổi thứ tự = BS đọc sai cột. Không sắp xếp lại. */
export const BS_COLUMNS = [
  'Gian hàng', 'ID Đơn hàng', 'Thời gian đặt đơn', 'Người mua chỉ định vận chuyển',
  'Kho giao hàng', 'Mã khách hàng', 'Tên người nhận', 'SĐT người nhận',
  'Mã bưu điện', 'Mã vùng', 'Địa chỉ người nhận - Quốc gia/Khu vực',
  'Địa chỉ người nhận - Tỉnh', 'Địa chỉ người nhận - Huyện/Quận/Thành Phố/Thị Xã ',
  'Địa chỉ người nhận - Phường/Thị Trấn/Xã', 'Địa chỉ chi tiết', 'Tin nhắn người mua',
  'Phương thức thanh toán', 'Phương thức chuyển khoản', 'Tài khoản chuyển khoản',
  'Tiền cọc', 'Phí vận chuyển do người bán trả', 'Giảm giá', 'Tên vận chuyển',
  'Mã vận đơn', 'Tên người gửi', 'SĐT người gửi', 'Địa chỉ gửi hàng',
  'SKU gian hàng', 'Tiền tệ', 'Đơn giá', 'Số lượng', 'Trọng lượng của SKU đơn lẻ',
  'Trọng lượng bưu kiện', 'Phí vận chuyển do người mua trả', 'Đánh dấu đơn hàng',
  'Kích thước bưu kiện- Dài (cm)', 'Kích thước bưu kiện - Rộng (cm)',
  'Kích thước bưu kiện - Cao (cm)', 'Nhân viên kinh doanh',
]

export const DEFAULT_STORE_NAME = 'Hanapet Web'

// ═══════════════════════════════════════════════════════════════════════════
// PHẦN 1 — XUẤT ĐƠN SANG BIGSELLER
// ═══════════════════════════════════════════════════════════════════════════

/* Khoá tra SKU: 'productId::variantId'. Phân loại trống thì variantId = ''. */
export const skuKey = (productId, variantId) => `${productId}::${variantId || ''}`

/**
 * Bung một đơn thành danh sách dòng SKU lẻ, đã gộp trùng và đã chia giá.
 * Trả về { rows, warnings }.
 *
 * rows: [{ sku, qty, unitPrice, amount, label }]
 *   · unitPrice làm tròn 2 chữ số thập phân (BS cho phép)
 *   · tổng amount == tiền hàng của đơn (dòng cuối gánh phần dư)
 */
export function explodeOrder(order, productMap, skuMap) {
  const warnings = []
  const bucket = new Map()   // key '<pid>::<vid>' → { qty, amount, label }

  const add = (pid, vid, qty, amount, label) => {
    if (!(qty > 0)) return
    const k = skuKey(pid, vid)
    const cur = bucket.get(k)
    if (cur) { cur.qty += qty; cur.amount += amount }
    else bucket.set(k, { pid, vid: vid || '', qty, amount, label })
  }

  for (const it of (order.items || [])) {
    const pid  = it.productId
    const qty  = Number(it.qty) || 0
    const line = (Number(it.price) || 0) * qty      // tiền thật của dòng này
    const p    = productMap[pid]
    if (!p) { warnings.push(`Không tìm thấy sản phẩm ${pid}`); continue }

    const variants = Array.isArray(p.variants) ? p.variants : []
    const combos   = Array.isArray(p.combos)   ? p.combos   : []

    // ── dòng là một phân loại ──────────────────────────────────────────────
    const v = variants.find(x => x.id === it.variantId)
    if (v) { add(pid, v.id, qty, line, `${p.name} — ${v.name}`); continue }

    // ── dòng là một combo ──────────────────────────────────────────────────
    const c = combos.find(x => x.id === it.variantId)
    if (c) {
      const bom = Array.isArray(c.bom) ? c.bom : []
      if (!bom.length) {
        warnings.push(`Combo "${c.name}" chưa khai gồm những món nào — bỏ qua`)
        continue
      }
      // Dựng danh sách món con kèm giá lẻ để chia tỉ lệ
      const parts = []
      for (const row of bom) {
        const rq  = (Number(row.qty) || 1) * qty
        let vid = '', retail = 0, label = p.name
        if (row.variantId === '*scent*') {
          const sv = variants.find(x => x.id === it.scentId)
          if (!sv) { warnings.push(`Đơn ${order.code}: combo "${c.name}" thiếu mùi`); continue }
          vid = sv.id; retail = Number(sv.price) || 0; label = `${p.name} — ${sv.name}`
        } else if (row.variantId) {
          const rv = variants.find(x => x.id === row.variantId)
          if (!rv) { warnings.push(`Đơn ${order.code}: combo "${c.name}" trỏ vào phân loại đã xoá`); continue }
          vid = rv.id; retail = Number(rv.price) || 0; label = `${p.name} — ${rv.name}`
        } else {
          vid = ''; retail = Number(p.price) || 0; label = p.name
        }
        parts.push({ vid, qty: rq, retail, label })
      }
      if (!parts.length) continue

      // Chia tiền combo theo tỉ lệ giá lẻ. Món cuối gánh phần dư → tổng khớp.
      const base = parts.reduce((s, x) => s + x.retail * x.qty, 0)
      let left = line
      parts.forEach((x, i) => {
        const share = (i === parts.length - 1)
          ? left
          : (base > 0 ? Math.round(line * (x.retail * x.qty) / base) : Math.round(line / parts.length))
        left -= share
        add(pid, x.vid, x.qty, share, x.label)
      })
      continue
    }

    // ── dòng là sản phẩm không phân loại ───────────────────────────────────
    add(pid, '', qty, line, p.name)
  }

  // Đổi sang mã SKU của BigSeller
  const rows = []
  for (const b of bucket.values()) {
    const sku = skuMap[skuKey(b.pid, b.vid)]
    if (!sku) {
      warnings.push(`Chưa khai mã BigSeller cho "${b.label}" — đơn ${order.code} KHÔNG xuất được`)
      return { rows: [], warnings }
    }
    rows.push({
      sku,
      qty: b.qty,
      unitPrice: Math.round((b.amount / b.qty) * 100) / 100,  // BS cho 2 số lẻ
      amount: b.amount,
      label: b.label,
    })
  }
  return { rows, warnings }
}

/** Một đơn → nhiều dòng 39 cột. Cột ngoài SKU/số lượng/đơn giá lặp y hệt mọi dòng. */
export function orderToBsRows(order, productMap, skuMap, opts = {}) {
  const store = opts.storeName || DEFAULT_STORE_NAME
  const { rows, warnings } = explodeOrder(order, productMap, skuMap)
  if (!rows.length) return { rows: [], warnings }

  const c = order.customer || {}
  const when = fmtDateTime(order.createdAt || order.created_at)
  const pay  = String(order.paymentMethod || '').toLowerCase().includes('bank') ? 'Transfer' : 'COD'

  const out = rows.map(r => {
    const o = {}
    for (const col of BS_COLUMNS) o[col] = ''
    o['Gian hàng']        = store
    o['ID Đơn hàng']      = safeOrderCode(order.code)
    o['Thời gian đặt đơn'] = when
    o['Tên người nhận']   = String(c.name || '').slice(0, 100)
    o['SĐT người nhận']   = String(c.phone || '').replace(/[^0-9+]/g, '').slice(0, 13)
    o['Địa chỉ người nhận - Quốc gia/Khu vực'] = 'Vietnam'
    o['Địa chỉ người nhận - Tỉnh'] = c.provinceName || ''
    o['Địa chỉ người nhận - Huyện/Quận/Thành Phố/Thị Xã '] = c.districtName || ''
    o['Địa chỉ người nhận - Phường/Thị Trấn/Xã'] = c.wardName || ''
    o['Địa chỉ chi tiết'] = String(c.address || '').slice(0, 500)
    o['Tin nhắn người mua'] = String(order.note || '').slice(0, 500)
    o['Phương thức thanh toán'] = pay
    o['Giảm giá'] = 0            // CỐ Ý 0 — giảm giá đã chia vào từng đơn giá
    o['SKU gian hàng'] = r.sku
    o['Tiền tệ'] = 'VND'
    o['Đơn giá'] = r.unitPrice
    o['Số lượng'] = r.qty
    o['Phí vận chuyển do người mua trả'] = Number(order.shippingFee || order.shipping_fee || 0)
    // Tên vận chuyển / Mã vận đơn CỐ Ý để trống — BigSeller tự tạo vận đơn
    return o
  })
  return { rows: out, warnings }
}

/** Dựng toàn bộ file xuất từ danh sách đơn. */
export function buildExport({ orders, products, skuMap, storeName }) {
  const productMap = Object.fromEntries((products || []).map(p => [p.id, p]))
  const all = []
  const warnings = []
  const exported = []
  const skipped  = []

  for (const o of (orders || [])) {
    if (o.bigsellerExportedAt) { skipped.push({ code: o.code, why: 'đã đẩy trước đó' }); continue }
    if (!EXPORTABLE_STATUSES.includes(o.status)) { skipped.push({ code: o.code, why: `trạng thái "${o.status}"` }); continue }
    const { rows, warnings: w } = orderToBsRows(o, productMap, skuMap, { storeName })
    warnings.push(...w)
    if (!rows.length) { skipped.push({ code: o.code, why: 'thiếu khai mã SKU' }); continue }
    all.push(...rows)
    exported.push(o)
  }
  return { rows: all, exported, skipped, warnings, csv: toCSV(all, BS_COLUMNS) }
}

/* Mã đơn: BS chỉ nhận số, chữ, gạch dưới, gạch ngang. Tối đa 100 ký tự. */
export function safeOrderCode(code) {
  return String(code || '').replace(/[^0-9A-Za-z_-]/g, '-').slice(0, 100)
}

function fmtDateTime(ts) {
  const d = ts ? new Date(ts) : new Date()
  if (isNaN(d.getTime())) return ''
  const p = n => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`
}

// ═══════════════════════════════════════════════════════════════════════════
// PHẦN 2 — ĐỐI SOÁT ĐƠN TỪ BIGSELLER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * So file đơn BigSeller với đơn trên web.
 * Trả về kế hoạch để giao diện hiện ra TRƯỚC khi ghi gì vào cơ sở dữ liệu.
 *
 * Ghép theo hai bước:
 *   1. Khớp thẳng mã HP-XXXXXX (nếu BS giữ mã ta đưa lên)
 *   2. Không khớp thì dò theo tên người nhận + ngày đặt, ghép được thì ghi
 *      nhớ mã BS lại để lần sau khớp thẳng
 */
export function planReconcile({ csvText, orders }) {
  const table = parseCSV(csvText)
  if (!table.length) return { error: 'File trống hoặc không đọc được' }

  const head = table[0].map(h => String(h || '').trim())
  const iCode   = head.indexOf('ID đơn hàng')
  const iStatus = head.indexOf('Trạng thái đơn hàng')
  const iName   = head.indexOf('Tên người nhận')
  const iWhen   = head.indexOf('Thời gian đặt đơn')
  const iCancel = head.indexOf('Thời gian hủy')
  if (iCode < 0 || iStatus < 0) {
    return { error: 'Không thấy cột "ID đơn hàng" và "Trạng thái đơn hàng" — kiểm lại file' }
  }

  // Một đơn nhiều dòng SKU → gộp về một bản ghi
  const bsOrders = new Map()
  for (const r of table.slice(1)) {
    const code = String(r[iCode] ?? '').trim()
    if (!code) continue
    if (!bsOrders.has(code)) {
      bsOrders.set(code, {
        code,
        status:   String(r[iStatus] ?? '').trim(),
        name:     iName   >= 0 ? String(r[iName]   ?? '').trim() : '',
        when:     iWhen   >= 0 ? String(r[iWhen]   ?? '').trim() : '',
        cancelAt: iCancel >= 0 ? String(r[iCancel] ?? '').trim() : '',
      })
    }
  }

  const byCode = new Map(orders.map(o => [String(o.code || '').toUpperCase(), o]))
  const byBsId = new Map(orders.filter(o => o.bigsellerOrderId)
                               .map(o => [String(o.bigsellerOrderId), o]))

  const updates   = []   // { order, from, to, restock, bsId }
  const unchanged = []
  const unknown   = new Map()   // trạng thái lạ → số đơn
  const matchedIds = new Set()

  for (const b of bsOrders.values()) {
    let o = byCode.get(b.code.toUpperCase()) || byBsId.get(b.code)
    if (!o) o = fuzzyMatch(orders, b)     // dò theo tên + ngày
    if (!o) continue                       // đơn của kênh khác, bỏ qua

    matchedIds.add(o.id)

    const to = BS_STATUS_MAP[b.status]
    if (!to) { unknown.set(b.status, (unknown.get(b.status) || 0) + 1); continue }

    const from = o.status || 'Pending'
    const bsId = (b.code.toUpperCase() !== String(o.code || '').toUpperCase()) ? b.code : ''

    if (to === from) { unchanged.push(o); continue }

    // Chỉ đẩy tới, không kéo lùi. 'Cancelled' là ngoại lệ, luôn được áp.
    if (to !== 'Cancelled') {
      const a = WEB_STATUS_ORDER.indexOf(from)
      const c = WEB_STATUS_ORDER.indexOf(to)
      if (a >= 0 && c >= 0 && c <= a) { unchanged.push(o); continue }
      if (from === 'Cancelled') { unchanged.push(o); continue }
    }

    updates.push({
      order: o, from, to, bsId,
      restock: to === 'Cancelled' && from !== 'Cancelled',
      cancelAt: b.cancelAt,
    })
  }

  // Đơn có trên web, không có trong file → nhiều khả năng CHƯA nhập sang BS
  const missing = orders.filter(o =>
    !matchedIds.has(o.id) &&
    o.bigsellerExportedAt &&
    o.status !== 'Cancelled' &&
    o.status !== 'Delivered')

  return {
    totalInFile: bsOrders.size,
    updates, unchanged, missing,
    unknownStatuses: [...unknown.entries()].map(([s, n]) => ({ status: s, count: n })),
  }
}

function fuzzyMatch(orders, b) {
  if (!b.name) return null
  const key = norm(b.name)
  const day = (b.when || '').slice(0, 10)
  const hits = orders.filter(o => {
    if (norm(o.customer?.name) !== key) return false
    if (!day) return true
    const d = o.createdAt ? new Date(o.createdAt) : null
    if (!d || isNaN(d.getTime())) return true
    const p = n => String(n).padStart(2, '0')
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}` === day
  })
  return hits.length === 1 ? hits[0] : null   // mơ hồ thì thà bỏ qua
}

const norm = s => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ')

// ═══════════════════════════════════════════════════════════════════════════
// PHẦN 3 — CSV
// ═══════════════════════════════════════════════════════════════════════════

/** Mảng object → chuỗi CSV. Kèm BOM để Excel mở không vỡ dấu tiếng Việt. */
export function toCSV(rows, columns) {
  const cols = columns || (rows[0] ? Object.keys(rows[0]) : [])
  const esc = v => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }
  const lines = [cols.map(esc).join(',')]
  for (const r of rows) lines.push(cols.map(c => esc(r[c])).join(','))
  return '\uFEFF' + lines.join('\r\n')
}

/** Chuỗi CSV → mảng mảng. Hiểu ô có dấu nháy, dấu phẩy và xuống dòng bên trong. */
export function parseCSV(text) {
  const s = String(text || '').replace(/^\uFEFF/, '')
  const out = []
  let row = [], cell = '', q = false
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (q) {
      if (ch === '"') { if (s[i + 1] === '"') { cell += '"'; i++ } else q = false }
      else cell += ch
    } else if (ch === '"') q = true
    else if (ch === ',') { row.push(cell); cell = '' }
    else if (ch === '\n') { row.push(cell); out.push(row); row = []; cell = '' }
    else if (ch !== '\r') cell += ch
  }
  if (cell !== '' || row.length) { row.push(cell); out.push(row) }
  return out.filter(r => r.some(c => String(c).trim() !== ''))
}

/** Tải một chuỗi xuống máy dưới dạng file (chạy trong trình duyệt). */
export function downloadText(filename, text, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([text], { type: mime })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click()
  document.body.removeChild(a); URL.revokeObjectURL(url)
}
