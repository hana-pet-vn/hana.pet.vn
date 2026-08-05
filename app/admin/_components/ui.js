'use client'
// app/admin/_components/ui.js
// ─────────────────────────────────────────────────────────────────────
// 4 mảnh giao diện nhỏ dùng chung: Tabs · StatusBadge · SearchBar ·
// DataTable. Gom 1 file cho gọn (mỗi mảnh < 60 dòng). Mảnh nào phình
// to ở phase sau thì tách file riêng, giữ luật < 400 dòng/file.
// ─────────────────────────────────────────────────────────────────────
import { T, ORDER_STATUS } from '../_lib/tokens'

// ── Tabs: thanh tab có đếm số, giống Shopee ──────────────────────────
// tabs = [{ key, label, count, hot }]  · hot=true → badge đỏ (cần hành động)
export function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 2, borderBottom: `1px solid ${T.line}`, overflowX: 'auto' }}>
      {tabs.map(t => {
        const on = t.key === active
        return (
          <button key={t.key} onClick={() => onChange(t.key)} style={{
            padding: '10px 14px', fontSize: 13, background: 'none', border: 'none',
            borderBottom: `2.5px solid ${on ? T.navy : 'transparent'}`,
            color: on ? T.navy : T.muted, fontWeight: on ? 700 : 500,
            display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
          }}>
            {t.label}
            {t.count != null && (
              <span style={{
                fontSize: 11, padding: '1px 7px', borderRadius: 20, fontWeight: 700,
                background: t.hot && t.count > 0 ? T.bad : T.navySoft,
                color: t.hot && t.count > 0 ? '#fff' : T.muted,
              }}>{t.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ── StatusBadge: nhãn trạng thái đơn có màu ──────────────────────────
export function StatusBadge({ status }) {
  const s = ORDER_STATUS[status] || { label: status, color: T.muted, bg: T.navySoft }
  return (
    <span style={{
      fontSize: 11.5, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
      color: s.color, background: s.bg, whiteSpace: 'nowrap',
    }}>{s.label}</span>
  )
}

// ── SearchBar: ô tìm kiếm + chuẩn hoá SĐT (bỏ dấu cách khi so) ──────
export const normalizeSearch = (s) =>
  String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '')

export function SearchBar({ value, onChange, placeholder }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder || 'Tìm mã đơn / tên khách / SĐT…'}
      style={{
        width: '100%', maxWidth: 340, padding: '9px 14px', fontSize: 13,
        borderRadius: 10, border: `1.5px solid ${T.line}`, outline: 'none',
        fontFamily: T.fontBody,
      }}
    />
  )
}

// ── DataTable: bảng chung — cột khai báo, dòng render qua hàm ───────
// columns = [{ key, label, width, render?(row) }]
export function DataTable({ columns, rows, empty = 'Không có dữ liệu', rowKey = 'id' }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {columns.map(c => (
              <th key={c.key} style={{
                textAlign: 'left', padding: '10px 12px', fontSize: 11.5,
                color: T.muted, fontWeight: 700, borderBottom: `1px solid ${T.line}`,
                width: c.width, whiteSpace: 'nowrap',
              }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={columns.length} style={{ padding: 28, textAlign: 'center', color: T.muted }}>{empty}</td></tr>
          )}
          {rows.map(r => (
            <tr key={r[rowKey]} style={{ borderBottom: `1px solid ${T.line}` }}>
              {columns.map(c => (
                <td key={c.key} style={{ padding: '11px 12px', verticalAlign: 'middle' }}>
                  {c.render ? c.render(r) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
