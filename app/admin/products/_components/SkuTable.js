'use client'
// app/admin/products/_components/SkuTable.js
// ─────────────────────────────────────────────────────────────────────
// Bảng SKU: mỗi mùi/phân loại 1 dòng, nhóm dưới dòng tên sản phẩm.
// Sửa inline: bấm ô → gõ → Enter lưu / Esc bỏ. Ô SKU BS trống viền đỏ.
// Giá chỉ sửa được khi có quyền edit_price (khoá thật nằm ở RLS).
// ─────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { T } from '../../_lib/tokens'
import { ROW_STATUS, fmtVnd } from '../_lib/inv'

const TONE = {
  ok:   { color: T.ok,    bg: T.okBg },
  warn: { color: T.warn,  bg: T.warnBg },
  bad:  { color: T.bad,   bg: T.badBg },
  mut:  { color: T.muted, bg: T.navySoft },
}

/* Ô sửa inline dùng chung. type='text' cho SKU, 'number' cho số/giá. */
function Cell({ value, type = 'number', canEdit = true, placeholder, danger, onSave, title }) {
  const [edit, setEdit] = useState(false)
  const [val, setVal] = useState('')
  if (!canEdit) return (
    <span title="Không có quyền sửa giá — công tắc edit_price đang tắt"
      style={{ color: T.muted, fontSize: 12.5 }}>{value}🔒</span>
  )
  if (!edit) {
    const empty = value === '' || value === null || value === undefined
    return (
      <span onClick={() => { setVal(empty ? '' : String(value)); setEdit(true) }} title={title}
        style={{
          display: 'inline-block', minWidth: 44, padding: '4px 8px', borderRadius: 7,
          cursor: 'pointer', border: `1.5px ${danger ? 'solid ' + T.bad : 'dashed transparent'}`,
          background: danger ? T.badBg : 'transparent',
          color: danger ? T.bad : 'inherit', fontSize: danger ? 11 : 12.5,
        }}>
        {empty ? (placeholder || '—') : value}
      </span>
    )
  }
  const commit = () => { setEdit(false); if (String(val) !== String(value)) onSave(val) }
  return (
    <input autoFocus value={val} type={type} min={type === 'number' ? 0 : undefined}
      onChange={e => setVal(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEdit(false) }}
      style={{
        width: type === 'text' ? 128 : 70, padding: '4px 8px', fontSize: 12.5,
        border: `1.5px solid ${T.info}`, borderRadius: 7, outline: 'none',
        fontFamily: T.fontBody,
      }} />
  )
}

export default function SkuTable({ rows, canEditPrice, pinned, onEdit, onPatch, onPin }) {
  // onPatch(row, field, value) — field: 'stock'|'price'|'minStock'|'safety'|'sku'
  const th = {
    textAlign: 'left', padding: '9px 10px', fontSize: 10.5, color: T.muted,
    fontWeight: 700, borderBottom: `1px solid ${T.line}`, whiteSpace: 'nowrap',
  }
  const td = { padding: '8px 10px', borderBottom: '1px solid #edf0f8', verticalAlign: 'middle' }

  // Nhóm dòng theo sản phẩm để chèn dòng tiêu đề
  const groups = []
  for (const r of rows) {
    const g = groups[groups.length - 1]
    if (!g || g.pid !== r.pid) groups.push({ pid: r.pid, product: r.product, archived: r.archived, rows: [r] })
    else g.rows.push(r)
  }

  if (!groups.length) return (
    <div style={{ padding: 34, textAlign: 'center', color: T.muted }}>Không có sản phẩm nào khớp</div>
  )

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
        <thead><tr>
          <th style={th}>Sản phẩm / phân loại</th>
          <th style={th}>SKU BigSeller</th>
          <th style={th}>Giá bán</th>
          <th style={th}>Tồn web</th>
          <th style={{ ...th, }} title="Tồn ≤ số này → nhảy vào tab Sắp hết, nhắc nhập thêm hàng">Nhắc nhập ≤</th>
          <th style={{ ...th }} title="Tồn ≤ số này → web báo Hết hàng, khách không đặt được. Món chạy mạnh bên sàn thì đặt 2–3.">Ngừng bán ≤</th>
          <th style={th}>Trạng thái</th>
          <th style={{ ...th, width: 30 }} title="Ghim lên trang chủ — thứ tự hiển thị quản ở Trang trí gian hàng">📌</th>
        </tr></thead>
        <tbody>
          {groups.map(g => (
            [
              <tr key={g.pid + '-head'} style={{ background: '#fafbff', opacity: g.archived ? .55 : 1 }}>
                <td style={td} colSpan={6}>
                  {g.product.img
                    ? <img src={g.product.img} alt="" style={{ width: 30, height: 30, borderRadius: 7, objectFit: 'cover', verticalAlign: 'middle', marginRight: 8 }} />
                    : <span style={{ display: 'inline-flex', width: 30, height: 30, borderRadius: 7, background: T.navySoft, alignItems: 'center', justifyContent: 'center', marginRight: 8, verticalAlign: 'middle' }}>📦</span>}
                  <span style={{ fontFamily: T.fontTitle, fontWeight: 700, color: T.navyDeep }}>{g.product.name}</span>
                  <span style={{ color: T.muted, fontSize: 11.5 }}>
                    {' '}· {g.rows[0].vid ? `${g.rows.length} phân loại` : 'không phân loại'}
                    {(g.product.combos || []).length > 0 && ` · ${g.product.combos.length} combo`}
                  </span>
                  <button onClick={() => onEdit(g.product)} style={{
                    marginLeft: 10, background: 'none', border: 'none', cursor: 'pointer',
                    color: T.info, fontSize: 11.5, fontWeight: 600, fontFamily: T.fontBody,
                  }}>Sửa sản phẩm ›</button>
                </td>
                <td style={td} colSpan={1}>
                  {g.archived && <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 9px', borderRadius: 20, color: T.muted, background: T.navySoft }}>Đã ẩn</span>}
                </td>
                <td style={td}>
                  <span onClick={() => onPin(g.product)} title={pinned.includes(g.pid) ? 'Bỏ ghim khỏi trang chủ' : 'Ghim lên trang chủ'}
                    style={{ cursor: 'pointer', fontSize: 15, opacity: pinned.includes(g.pid) ? 1 : .22 }}>📌</span>
                </td>
              </tr>,
              ...(g.archived ? [] : g.rows.map(r => {
                const st = ROW_STATUS[r.status]; const tone = TONE[st.tone]
                return (
                  <tr key={r.key}>
                    <td style={{ ...td, paddingLeft: 48, color: T.muted, fontSize: 12 }}>{r.vid ? `↳ ${r.vname}` : '↳ (chính nó)'}</td>
                    <td style={td}>
                      <Cell type="text" value={r.sku} danger={!r.sku}
                        placeholder="⚠ chưa khai — đơn sẽ bị loại khi xuất BS"
                        title="Gõ đúng mã trong Tồn kho → SKU hàng hoá của BigSeller. Sai 1 ký tự là BS không nhận."
                        onSave={v => onPatch(r, 'sku', String(v).trim())} />
                    </td>
                    <td style={td}>
                      <Cell value={fmtVnd(r.price)} canEdit={canEditPrice} title="Bấm để sửa giá (đ)"
                        onSave={v => onPatch(r, 'price', Math.max(0, Number(String(v).replace(/[^\d]/g, '')) || 0))} />
                    </td>
                    <td style={td}>
                      <Cell value={r.stock} title="Bấm để sửa số tồn — tự đặt, đặt dè nếu món chạy mạnh bên sàn"
                        onSave={v => onPatch(r, 'stock', Math.max(0, Math.round(Number(v) || 0)))} />
                    </td>
                    <td style={td}>
                      <Cell value={r.minStock} onSave={v => onPatch(r, 'minStock', Math.max(0, Math.round(Number(v) || 0)))} />
                    </td>
                    <td style={td}>
                      <Cell value={r.safety} onSave={v => onPatch(r, 'safety', Math.max(0, Math.round(Number(v) || 0)))} />
                    </td>
                    <td style={td}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 9px', borderRadius: 20, color: tone.color, background: tone.bg, whiteSpace: 'nowrap' }}>{st.label}</span>
                    </td>
                    <td style={td}></td>
                  </tr>
                )
              })),
            ]
          ))}
        </tbody>
      </table>
    </div>
  )
}
