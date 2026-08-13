'use client'
// app/admin/products/_components/BulkStockModal.js
// ─────────────────────────────────────────────────────────────────────
// Kiểm kho cuối tháng: tick nhiều SKU → đặt số / cộng / trừ →
// XEM TRƯỚC từng dòng cũ→mới → Áp dụng. Đúng triết lý thao tác nguy
// hiểm: preview → xác nhận → áp (rules kỹ thuật #4).
// ─────────────────────────────────────────────────────────────────────
import { useState, useMemo } from 'react'
import { T } from '../../_lib/tokens'

export default function BulkStockModal({ rows, onClose, onApply, toast }) {
  const [sel, setSel] = useState(new Set())
  const [mode, setMode] = useState('set')      // set | add | sub
  const [num, setNum] = useState('')
  const [preview, setPreview] = useState(false)
  const [busy, setBusy] = useState(false)

  const live = rows.filter(r => !r.archived)
  const changes = useMemo(() => {
    const n = Number(num)
    if (!Number.isFinite(n)) return []
    return live.filter(r => sel.has(r.key)).map(r => {
      const next = mode === 'set' ? n : mode === 'add' ? r.stock + n : r.stock - n
      return { row: r, from: r.stock, to: Math.max(0, Math.round(next)) }
    }).filter(c => c.from !== c.to)
  }, [live, sel, mode, num])

  const apply = async () => {
    setBusy(true)
    try {
      await onApply(changes)
      onClose()
    } catch (e) { toast.err(String(e.message || e)) }
    finally { setBusy(false) }
  }

  const btn = (x) => ({ padding: '8px 14px', borderRadius: 9, fontSize: 12.5, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: T.fontBody, ...x })

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(13,20,46,.45)', zIndex: 60, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '26px 12px', overflow: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, maxWidth: 640, width: '100%', padding: 18, boxShadow: '0 18px 60px rgba(13,20,46,.3)' }}>
        <button onClick={onClose} style={{ float: 'right', background: 'none', border: 'none', fontSize: 17, color: T.muted, cursor: 'pointer' }}>✕</button>
        <h3 style={{ fontFamily: T.fontTitle, fontSize: 16, color: T.navyDeep, marginBottom: 4 }}>📋 Kiểm kho hàng loạt</h3>
        <p style={{ fontSize: 11.5, color: T.muted, marginBottom: 12 }}>Tick các mã cần chỉnh → chọn cách chỉnh → xem trước rồi mới áp.</p>

        {!preview ? (<>
          <div style={{ maxHeight: 300, overflow: 'auto', border: `1px solid ${T.line}`, borderRadius: 10 }}>
            <label style={{ display: 'flex', gap: 8, padding: '8px 12px', borderBottom: `1px solid ${T.line}`, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              <input type="checkbox" checked={sel.size === live.length && live.length > 0}
                onChange={e => setSel(e.target.checked ? new Set(live.map(r => r.key)) : new Set())} />
              Chọn tất cả ({live.length})
            </label>
            {live.map(r => (
              <label key={r.key} style={{ display: 'flex', gap: 8, padding: '7px 12px', borderBottom: '1px solid #edf0f8', fontSize: 12.5, cursor: 'pointer', alignItems: 'center' }}>
                <input type="checkbox" checked={sel.has(r.key)}
                  onChange={e => { const n = new Set(sel); e.target.checked ? n.add(r.key) : n.delete(r.key); setSel(n) }} />
                <span>{r.name}{r.vname ? ` — ${r.vname}` : ''}</span>
                <b style={{ marginLeft: 'auto' }}>{r.stock}</b>
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={mode} onChange={e => setMode(e.target.value)}
              style={{ padding: '8px 10px', border: `1.5px solid ${T.line}`, borderRadius: 8, fontSize: 12.5, fontFamily: T.fontBody }}>
              <option value="set">Đặt tồn =</option>
              <option value="add">Cộng thêm +</option>
              <option value="sub">Trừ đi −</option>
            </select>
            <input type="number" min={0} value={num} onChange={e => setNum(e.target.value)} placeholder="số"
              style={{ width: 90, padding: '8px 10px', border: `1.5px solid ${T.line}`, borderRadius: 8, fontSize: 12.5, fontFamily: T.fontBody }} />
            <button style={btn({ background: T.navy, color: '#fff', marginLeft: 'auto' })}
              onClick={() => {
                if (!sel.size) { toast.warn('Chưa tick mã nào'); return }
                if (num === '' || !Number.isFinite(Number(num))) { toast.warn('Chưa nhập số'); return }
                if (!changes.length) { toast.info('Không có gì thay đổi'); return }
                setPreview(true)
              }}>Xem trước ›</button>
          </div>
        </>) : (<>
          <div style={{ maxHeight: 320, overflow: 'auto', border: `1px solid ${T.line}`, borderRadius: 10 }}>
            {changes.map(c => (
              <div key={c.row.key} style={{ display: 'flex', gap: 8, padding: '7px 12px', borderBottom: '1px solid #edf0f8', fontSize: 12.5 }}>
                <span>{c.row.name}{c.row.vname ? ` — ${c.row.vname}` : ''}</span>
                <span style={{ marginLeft: 'auto' }}>
                  {c.from} → <b style={{ color: c.to < c.from ? T.bad : T.ok }}>{c.to}</b>
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14, justifyContent: 'flex-end' }}>
            <button style={btn({ background: '#fff', color: T.navy, border: `1.5px solid ${T.line}` })} onClick={() => setPreview(false)}>‹ Sửa lại</button>
            <button disabled={busy} style={btn({ background: T.ok, color: '#fff' })} onClick={apply}>
              {busy ? 'Đang áp…' : `✓ Áp dụng ${changes.length} thay đổi`}
            </button>
          </div>
        </>)}
      </div>
    </div>
  )
}
