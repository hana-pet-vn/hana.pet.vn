// app/admin2/orders/_lib/utils.js
// ─────────────────────────────────────────────────────────────────────
// Logic thuần của tab Đơn hàng: định nghĩa tab, so khớp tìm kiếm
// (bỏ dấu + bỏ khoảng trắng), lọc ngày/nguồn. KHÔNG đụng React.
// ─────────────────────────────────────────────────────────────────────

/* Tab trạng thái theo spec F1 (giống Shopee). 'shipping' GỘP hai trạng
   thái vận chuyển thật + key 'Shipped' cũ (phòng dữ liệu lịch sử).
   'return' chỉ hiện khi có đơn (trạng thái mới của F5). */
export const ORDER_TABS = [
  { key: 'all',       label: 'Tất cả',        statuses: null },
  { key: 'pending',   label: 'Chờ xác nhận',  statuses: ['Pending'],   hot: true },
  { key: 'confirmed', label: 'Đã xác nhận',   statuses: ['Confirmed'] },
  { key: 'packing',   label: 'Đang đóng gói', statuses: ['Packing'] },
  { key: 'shipping',  label: 'Đang giao',     statuses: ['Handed to GHN', 'In Transit', 'Shipped'] },
  { key: 'delivered', label: 'Đã giao',       statuses: ['Delivered'] },
  { key: 'cancelled', label: 'Đã huỷ',        statuses: ['Cancelled'] },
  { key: 'return',    label: 'Hoàn hàng',     statuses: ['Return Check'], hideWhenEmpty: true },
]

export const SOURCE_OPTIONS = [
  { value: 'all',      label: 'Tất cả nguồn' },
  { value: 'website',  label: 'Website' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'zalo',     label: 'Zalo' },
  { value: 'phone',    label: 'Điện thoại' },
  { value: 'manual',   label: 'Thủ công' },
]

export const RANGE_OPTIONS = [
  { value: 'today',  label: 'Hôm nay' },
  { value: '7',      label: '7 ngày' },
  { value: '30',     label: '30 ngày' },
  { value: 'custom', label: 'Tuỳ chọn…' },
]

export const fmtMoney = n => (n || 0).toLocaleString('vi-VN') + 'đ'

/* Chuẩn hoá để so khi tìm: thường hoá + bỏ dấu tiếng Việt + bỏ mọi
   khoảng trắng. "0912 384 756" và "0912384756" phải cùng ra. */
export const normalize = s =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, '')

/* Một đơn có khớp từ khoá không: dò mã đơn / tên khách / SĐT. */
export function matchesSearch(order, q) {
  if (!q) return true
  const needle = normalize(q)
  if (!needle) return true
  return (
    normalize(order.code).includes(needle) ||
    normalize(order.customer?.name).includes(needle) ||
    normalize(order.customer?.phone).includes(needle)
  )
}

/* Khoảng ngày từ bộ chọn (range = today | 7 | 30 | custom).
   Trả { fromTs, toTs } theo mili-giây, null = không chặn phía đó. */
export function dateBounds({ range, from, to }) {
  const startOfDay = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime() }
  const endOfDay   = d => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x.getTime() }
  const now = Date.now()

  if (range === 'custom') {
    return {
      fromTs: from ? startOfDay(from + 'T00:00:00') : null,
      toTs:   to   ? endOfDay(to + 'T00:00:00')     : null,
    }
  }
  if (range === 'today') return { fromTs: startOfDay(now), toTs: null }
  const days = range === '7' ? 7 : 30              // mặc định 30 ngày
  return { fromTs: startOfDay(now) - (days - 1) * 86400000, toTs: null }
}

/* Áp CHỒNG các lớp lọc: ngày + nguồn + từ khoá (KHÔNG gồm tab —
   tab áp sau cùng để đếm số trên từng tab từ cùng một tập). */
export function filterOrders(orders, { q, range, from, to, source }) {
  const { fromTs, toTs } = dateBounds({ range, from, to })
  return orders.filter(o => {
    if (fromTs && (o.createdAt || 0) < fromTs) return false
    if (toTs   && (o.createdAt || 0) > toTs)   return false
    if (source && source !== 'all' && (o.source || 'website') !== source) return false
    return matchesSearch(o, q)
  })
}

export function tabCount(tab, filtered) {
  if (!tab.statuses) return filtered.length
  return filtered.filter(o => tab.statuses.includes(o.status)).length
}

export function ordersInTab(tabKey, filtered) {
  const tab = ORDER_TABS.find(t => t.key === tabKey) || ORDER_TABS[0]
  if (!tab.statuses) return filtered
  return filtered.filter(o => tab.statuses.includes(o.status))
}
