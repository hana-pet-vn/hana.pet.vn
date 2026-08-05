'use client'
// app/admin/orders/_components/OrderTable.js
// ─────────────────────────────────────────────────────────────────────
// Bảng danh sách đơn (F1) + thanh bulk (F3). Chỉ HIỂN THỊ và bắn
// sự kiện lên trang cha — mọi thao tác ghi nằm ở page.js/actions.
// Cột thao tác đổi theo ngữ cảnh: Pending → ✓ Xác nhận · Confirmed
// chưa xuất → 📤 Xuất BS · còn lại → Chi tiết.
// ─────────────────────────────────────────────────────────────────────
import { T } from '../../_lib/tokens'
import { StatusBadge } from '../../_components/ui'
import { fmtMoney } from '../_lib/utils'

function ItemLine({ item, productMap }) {
  const img = productMap?.[item.productId]?.img || ''
  const label = (item.name || '?') + (item.variantName ? ` — ${item.variantName}` : '')
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '2px 0' }}>
      {img
        ? <img src={img} alt="" style={{ width: 26, height: 26, borderRadius: 7, objectFit: 'cover', flexShrink: 0, background: T.navySoft }} />
        : <div style={{ width: 26, height: 26, borderRadius: 7, background: T.navySoft, display: 'grid', placeItems: 'center', fontSize: 13, flexShrink: 0 }}>📦</div>}
      <span style={{ fontSize: 12.5, fontWeight: 600 }}>{label} <span style={{ color: T.muted, fontWeight: 400 }}>×{item.qty}</span></span>
    </div>
  )
}

/* Dòng phụ về BigSeller — chỉ đơn Đã xác nhận trở đi mới có ý nghĩa */
export function BsLine({ order }) {
  if (order.status === 'Pending' || order.status === 'Cancelled') return null
  if (order.bigsellerExportedAt) {
    return <div style={{ fontSize: 11, color: T.ok, marginTop: 2 }}>✓ Đã xuất BS</div>
  }
  if (order.status === 'Confirmed') {
    return <div style={{ fontSize: 11, color: T.warn, marginTop: 2 }}>⚠ Chưa xuất BS</div>
  }
  return null
}

export default function OrderTable({
  rows, productMap, selected, onToggle, onToggleAll,
  onOpen, onConfirm, onExport, emptyHint,
}) {
  const allChecked = rows.length > 0 && rows.every(o => selected.has(o.id))

  if (!rows.length) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: T.muted }}>
        <div style={{ fontSize: 30, marginBottom: 8 }}>🗂️</div>
        <b style={{ display: 'block', fontFamily: T.fontTitle, color: T.navy, fontSize: 14, marginBottom: 4 }}>
          Không có đơn nào ở mục này
        </b>
        {emptyHint || 'Đơn mới sẽ tự hiện, không cần tải lại trang.'}
      </div>
    )
  }

  const th = {
    fontFamily: T.fontTitle, fontSize: 10.5, fontWeight: 700, color: T.muted,
    textAlign: 'left', padding: '10px 12px', background: '#fafbfe',
    borderBottom: `1px solid ${T.line}`, letterSpacing: .3, whiteSpace: 'nowrap',
  }
  const td = { padding: '11px 12px', borderBottom: '1px solid #edf0f8', verticalAlign: 'middle' }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            <th style={{ ...th, width: 34 }}>
              <input type="checkbox" checked={allChecked} onChange={() => onToggleAll(rows)}
                style={{ width: 15, height: 15, accentColor: T.navy, cursor: 'pointer' }} />
            </th>
            <th style={th}>Đơn hàng</th>
            <th style={th}>Sản phẩm</th>
            <th style={th}>Tổng tiền</th>
            <th style={th}>Trạng thái</th>
            <th style={{ ...th, textAlign: 'right' }}>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(o => (
            <tr key={o.id} onClick={() => onOpen(o)} style={{ cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#fafbff' }}
              onMouseLeave={e => { e.currentTarget.style.background = '' }}>
              <td style={td} onClick={e => e.stopPropagation()}>
                <input type="checkbox" checked={selected.has(o.id)} onChange={() => onToggle(o.id)}
                  style={{ width: 15, height: 15, accentColor: T.navy, cursor: 'pointer' }} />
              </td>
              <td style={td}>
                <b style={{ fontFamily: T.fontTitle, color: T.navy }}>{o.code}</b>
                <div style={{ fontSize: 11, color: T.muted }}>{o.customer?.name} · {o.date}</div>
                {o.note && <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>📝 {o.note.length > 70 ? o.note.slice(0, 70) + '…' : o.note}</div>}
                <BsLine order={o} />
              </td>
              <td style={td}>
                {(o.items || []).slice(0, 3).map((it, i) => <ItemLine key={i} item={it} productMap={productMap} />)}
                {(o.items || []).length > 3 && (
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>…và {o.items.length - 3} món nữa</div>
                )}
              </td>
              <td style={{ ...td, fontFamily: T.fontTitle, fontWeight: 700, color: T.navyDeep, whiteSpace: 'nowrap' }}>
                {fmtMoney(o.total)}
              </td>
              <td style={td}>
                <StatusBadge status={o.status} />
                {o.trackingCode && <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>🚚 {o.shipping || ''} · {o.trackingCode}</div>}
              </td>
              <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                {o.status === 'Pending' ? (
                  <button onClick={() => onConfirm([o])} style={{
                    background: T.navy, color: '#fff', border: 'none', borderRadius: 8,
                    padding: '6px 11px', fontFamily: T.fontTitle, fontWeight: 700, fontSize: 12, cursor: 'pointer',
                  }}>✓ Xác nhận</button>
                ) : o.status === 'Confirmed' && !o.bigsellerExportedAt && onExport ? (
                  <button onClick={() => onExport([o])} style={{
                    background: '#fff', color: T.navy, border: `1.5px solid ${T.line}`, borderRadius: 8,
                    padding: '6px 11px', fontFamily: T.fontTitle, fontWeight: 700, fontSize: 12, cursor: 'pointer',
                  }}>📤 Xuất BS</button>
                ) : (
                  <button onClick={() => onOpen(o)} style={{
                    background: '#fff', color: T.navy, border: `1.5px solid ${T.line}`, borderRadius: 8,
                    padding: '6px 11px', fontFamily: T.fontTitle, fontWeight: 700, fontSize: 12, cursor: 'pointer',
                  }}>Chi tiết</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
