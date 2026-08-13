'use client'
// app/admin/products/_components/ComboTable.js
// ─────────────────────────────────────────────────────────────────────
// Tab Combo: gom mọi combo về MỘT bảng để soát. Combo không phải món
// riêng — nó sống trong sản phẩm mẹ, nên nút sửa mở editor sản phẩm mẹ.
// Cảnh báo ở đây khớp đúng warning explodeOrder bắn lúc xuất BS —
// hiện SỚM thay vì để nhân viên phát hiện khi xuất file.
// ─────────────────────────────────────────────────────────────────────
import { T } from '../../_lib/tokens'
import { fmtVnd } from '../_lib/inv'

export default function ComboTable({ combos, onEditParent }) {
  const th = {
    textAlign: 'left', padding: '9px 10px', fontSize: 10.5, color: T.muted,
    fontWeight: 700, borderBottom: `1px solid ${T.line}`, whiteSpace: 'nowrap',
  }
  const td = { padding: '9px 10px', borderBottom: '1px solid #edf0f8', verticalAlign: 'middle' }

  if (!combos.length) return (
    <div style={{ padding: 34, textAlign: 'center', color: T.muted }}>
      Chưa có combo nào — vào Sửa sản phẩm để thêm combo cho sản phẩm đó
    </div>
  )

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
        <thead><tr>
          <th style={th}>Combo</th><th style={th}>Thuộc sản phẩm</th>
          <th style={th}>Gồm (BOM)</th><th style={th}>Giá</th>
          <th style={th} title="= món THẤP NHẤT trong BOM còn đủ. Combo hết khi có 1 món hết.">Còn bán được</th>
          <th style={th}></th>
        </tr></thead>
        <tbody>
          {combos.map(c => (
            <tr key={c.key} style={{ opacity: c.archived ? .55 : 1 }}>
              <td style={td}>
                <span style={{ fontFamily: T.fontTitle, fontWeight: 700, color: T.navyDeep }}>🎁 {c.name}</span>
                {c.warn && <div style={{ color: T.bad, fontSize: 11, fontWeight: 700, marginTop: 2 }}>⚠ {c.warn}</div>}
              </td>
              <td style={{ ...td, color: T.muted, fontSize: 12 }}>{c.parent}{c.archived ? ' (đã ẩn)' : ''}</td>
              <td style={{ ...td, color: T.muted, fontSize: 12 }}>{c.bomText}</td>
              <td style={td}>{fmtVnd(c.price)}</td>
              <td style={td}>
                {c.avail === null ? '—' : (
                  <b style={{ color: c.avail <= 0 ? T.bad : c.avail <= 5 ? T.warn : T.ok }}>{c.avail}</b>
                )}
              </td>
              <td style={td}>
                <button onClick={() => onEditParent(c.product)} style={{
                  background: '#fff', color: T.navy, border: `1.5px solid ${T.line}`,
                  padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: T.fontBody,
                }}>Sửa (mở sản phẩm mẹ)</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
