'use client'
// app/admin/orders/_components/FilterBar.js
// ─────────────────────────────────────────────────────────────────────
// Thanh tìm & lọc (F2) + hai nút hành động của tab Đơn hàng.
// Chỉ hiển thị — mọi state nằm ở page.js (URL là nguồn sự thật).
// ─────────────────────────────────────────────────────────────────────
import { T } from '../../_lib/tokens'
import { SOURCE_OPTIONS, RANGE_OPTIONS } from '../_lib/utils'

const fsel = {
  background: T.bg, border: `1px solid ${T.line}`, borderRadius: 9,
  padding: '8px 10px', fontSize: 12, color: T.muted, fontFamily: T.fontBody,
}

export default function FilterBar({
  qDraft, setQDraft, range, from, to, source, setParams,
  onExport, onReconcile, onNewOrder,
}) {
  return (
    <div style={{
      background: T.card, border: `1px solid ${T.line}`, borderTop: 'none',
      padding: '12px 16px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
    }}>
      <div style={{
        flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 8,
        background: T.bg, border: `1px solid ${T.line}`, borderRadius: 9, padding: '8px 12px',
      }}>
        🔎
        <input
          value={qDraft}
          onChange={e => setQDraft(e.target.value)}
          placeholder="Tìm mã đơn, tên khách, SĐT…"
          style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: 13, color: T.ink, fontFamily: T.fontBody }}
        />
        {qDraft && <button onClick={() => setQDraft('')} style={{ border: 'none', background: 'none', color: T.muted, cursor: 'pointer' }}>✕</button>}
      </div>

      <select value={range} onChange={e => setParams({ range: e.target.value })} style={fsel}>
        {RANGE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
      </select>
      {range === 'custom' && (
        <>
          <input type="date" value={from} onChange={e => setParams({ from: e.target.value })} style={fsel} />
          <span style={{ color: T.muted }}>→</span>
          <input type="date" value={to} onChange={e => setParams({ to: e.target.value })} style={fsel} />
        </>
      )}
      <select value={source} onChange={e => setParams({ source: e.target.value })} style={fsel}>
        {SOURCE_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>

      {onNewOrder && (
        <button onClick={onNewOrder} style={{
          background: T.navy, color: '#fff', border: 'none', borderRadius: 9,
          padding: '9px 15px', fontFamily: T.fontTitle, fontWeight: 700, fontSize: 12.5, cursor: 'pointer',
        }}>+ Tạo đơn (FB/Zalo)</button>
      )}
      <button onClick={onExport} style={{
        background: onNewOrder ? '#fff' : T.navy, color: onNewOrder ? T.navy : '#fff',
        border: onNewOrder ? `1.5px solid ${T.line}` : 'none', borderRadius: 9,
        padding: '9px 15px', fontFamily: T.fontTitle, fontWeight: 700, fontSize: 12.5, cursor: 'pointer',
      }}>📤 Xuất BigSeller</button>
      <button onClick={onReconcile} style={{
        background: '#fff', color: T.navy, border: `1.5px solid ${T.line}`, borderRadius: 9,
        padding: '9px 15px', fontFamily: T.fontTitle, fontWeight: 700, fontSize: 12.5, cursor: 'pointer',
      }}>🔄 Đối soát BigSeller</button>
    </div>
  )
}
