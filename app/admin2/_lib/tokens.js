// app/admin2/_lib/tokens.js
// ─────────────────────────────────────────────────────────────────────
// NGUỒN DUY NHẤT cho màu / font / bo góc của toàn bộ /admin2.
// Lấy y nguyên từ demo-admin-hanapet-v2.html ĐÃ DUYỆT — muốn đổi màu
// thì đổi Ở ĐÂY, không hardcode màu trong component.
// ─────────────────────────────────────────────────────────────────────

export const T = {
  // Màu chủ đạo
  navy:     '#1b295b',
  navyDeep: '#0d142e',
  navySoft: '#eef1fa',
  navyHov:  '#233573',

  // Chữ & đường kẻ
  ink:   '#1c2440',
  muted: '#5f6c8f',
  line:  '#dbe2f1',

  // Nền
  bg:   '#f4f6fb',
  card: '#ffffff',

  // Trạng thái (màu chữ + màu nền nhạt đi kèm)
  ok:     '#16a34a', okBg:   '#f0fdf4',
  warn:   '#d97706', warnBg: '#fffbeb',
  bad:    '#dc2626', badBg:  '#fef2f2',
  info:   '#2563eb', infoBg: '#eff6ff',
  ship:   '#0891b2', shipBg: '#ecfeff',
  pack:   '#7c3aed', packBg: '#f5f3ff',

  // Font
  fontTitle: "'Baloo 2','Be Vietnam Pro',sans-serif",
  fontBody:  "'Be Vietnam Pro',sans-serif",

  // Khác
  radius: 12,
  shadow: '0 1px 3px rgba(13,20,46,.06)',
}

// Map trạng thái đơn → nhãn tiếng Việt + màu (dùng ở StatusBadge, tab đơn hàng)
// Key = giá trị THẬT trong cột orders.status (đủ 7 trạng thái + 1 mới của F5).
// 'Shipped' là key cũ không còn dùng — giữ lại phòng dữ liệu lịch sử.
export const ORDER_STATUS = {
  Pending:         { label: 'Chờ xác nhận',       color: T.warn, bg: T.warnBg },
  Confirmed:       { label: 'Đã xác nhận',        color: T.info, bg: T.infoBg },
  Packing:         { label: 'Đang đóng gói',      color: T.pack, bg: T.packBg },
  'Handed to GHN': { label: 'Đã giao ĐVVC',       color: T.ship, bg: T.shipBg },
  'In Transit':    { label: 'Đang vận chuyển',    color: T.ship, bg: T.shipBg },
  Shipped:         { label: 'Đang giao',          color: T.ship, bg: T.shipBg },
  Delivered:       { label: 'Đã giao',            color: T.ok,   bg: T.okBg },
  Cancelled:       { label: 'Đã huỷ',             color: T.bad,  bg: T.badBg },
  /* F5 — file BS báo "Trả hàng & Hoàn tiền": hàng chưa chắc về tay,
     KHÔNG tự hoàn kho, nhân viên kiểm xong xử lý tay. */
  'Return Check':  { label: 'Hoàn hàng — chờ kiểm', color: T.warn, bg: T.warnBg },
}
