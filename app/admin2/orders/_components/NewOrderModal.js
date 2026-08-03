'use client'
// app/admin2/orders/_components/NewOrderModal.js
// ─────────────────────────────────────────────────────────────────────
// F9 — Tạo đơn tay từ FB/Zalo. Form: khách (tên + SĐT bắt buộc), địa
// chỉ GHN đầy đủ, chọn món từ danh mục THẬT (đúng phân loại/mùi, tôn
// trọng tồn kho), số lượng, ghi chú, nguồn.
// Gửi qua /api/orders/create (kèm token admin) → giá lấy từ DB, trừ kho
// trong MỘT giao dịch như đơn web → vào tab Chờ xác nhận, đi chung
// đường xuất BigSeller. Đây là cái móng cho Phase 5 (nối Messenger —
// máy điền, người soát; form này không đổi, chỉ đổi cách ĐIỀN).
// ─────────────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo } from 'react'
import { T } from '../../_lib/tokens'
import { useToast } from '../../_components/Toast'
import { supabase } from '../../../../lib/supabase'
import { fmtMoney } from '../_lib/utils'

const inp = {
  width: '100%', border: `1.5px solid ${T.line}`, borderRadius: 10,
  padding: '9px 12px', fontSize: 12.5, outline: 'none', boxSizing: 'border-box',
  fontFamily: T.fontBody, background: '#fff',
}
const lbl = { fontSize: 12, color: T.muted, marginBottom: 5, display: 'block' }

/* Gộp phân loại + combo thành một danh sách chọn, kèm tồn ước tính.
   Tồn combo có BOM = min(kho món con / số lượng cần) — server kiểm lại. */
function optionsOf(p, scentId) {
  const out = []
  for (const v of (p.variants || [])) {
    out.push({ kind: 'variant', id: v.id, label: v.name, price: Number(v.price) || 0, stock: Number(v.stock) || 0 })
  }
  for (const c of (p.combos || [])) {
    const bom = Array.isArray(c.bom) ? c.bom : []
    let stock
    if (bom.length) {
      stock = Infinity
      for (const row of bom) {
        let s
        if (row.variantId === '*scent*') {
          const sv = (p.variants || []).find(x => x.id === scentId)
          s = sv ? Number(sv.stock) || 0 : Infinity   // chưa chọn mùi → chưa chặn
        } else if (row.variantId) {
          const rv = (p.variants || []).find(x => x.id === row.variantId)
          s = rv ? Number(rv.stock) || 0 : 0
        } else s = Number(p.stock) || 0
        stock = Math.min(stock, Math.floor(s / (Number(row.qty) || 1)))
      }
      if (stock === Infinity) stock = 0
    } else stock = Number(c.stock) || 0
    out.push({
      kind: 'combo', id: c.id, label: `${c.name} (combo)`, price: Number(c.price) || 0,
      stock, needScent: bom.some(r => r.variantId === '*scent*'),
    })
  }
  return out
}

const EMPTY_LINE = { productId: '', variantId: '', scentId: '', qty: 1 }

export default function NewOrderModal({ products, onCreated, onClose }) {
  const toast = useToast()
  const [f, setF] = useState({ name: '', phone: '', address: '', note: '', source: 'facebook' })
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const [lines, setLines] = useState([{ ...EMPTY_LINE }])
  const [busy, setBusy] = useState(false)

  // ── Địa chỉ GHN (3 cấp, giống trang thanh toán) ──
  const [provinces, setProvinces] = useState([])
  const [districts, setDistricts] = useState([])
  const [wards, setWards] = useState([])
  const [prov, setProv] = useState(null)
  const [dist, setDist] = useState(null)
  const [ward, setWard] = useState(null)

  useEffect(() => {
    fetch('/api/shipping/provinces').then(r => r.json())
      .then(d => setProvinces(Array.isArray(d) ? d : [])).catch(() => setProvinces([]))
  }, [])
  useEffect(() => {
    setDistricts([]); setDist(null); setWards([]); setWard(null)
    if (!prov) return
    fetch(`/api/shipping/districts?province_id=${prov.id}`).then(r => r.json())
      .then(d => setDistricts(Array.isArray(d) ? d : [])).catch(() => setDistricts([]))
  }, [prov])
  useEffect(() => {
    setWards([]); setWard(null)
    if (!dist) return
    fetch(`/api/shipping/wards?district_id=${dist.id}`).then(r => r.json())
      .then(d => setWards(Array.isArray(d) ? d : [])).catch(() => setWards([]))
  }, [dist])

  const sellable = useMemo(() => (products || []).filter(p =>
    (p.variants || []).length || (p.combos || []).length || (Number(p.stock) || 0) > 0), [products])

  const setLine = (i, patch) => setLines(ls => ls.map((l, j) => j === i ? { ...l, ...patch } : l))

  const subtotal = lines.reduce((s, l) => {
    const p = (products || []).find(x => x.id === l.productId)
    if (!p) return s
    if (!l.variantId) return s + (Number(p.price) || 0) * l.qty
    const o = optionsOf(p, l.scentId).find(x => x.id === l.variantId)
    return s + (o ? o.price * l.qty : 0)
  }, 0)

  const valid = f.name.trim() && /^0\d{8,10}$/.test(f.phone.trim().replace(/\s+/g, '')) &&
    f.address.trim() && prov && dist && ward &&
    lines.length && lines.every(l => {
      if (!l.productId || !(l.qty > 0)) return false
      const p = (products || []).find(x => x.id === l.productId)
      if (!p) return false
      const hasChoices = (p.variants || []).length || (p.combos || []).length
      if (hasChoices && !l.variantId) return false
      const o = hasChoices ? optionsOf(p, l.scentId).find(x => x.id === l.variantId) : null
      if (o?.needScent && !l.scentId) return false
      return true
    })

  const submit = async () => {
    if (!valid || busy) return
    setBusy(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) { toast.err('Phiên đăng nhập hết hạn — đăng nhập lại giúp.'); setBusy(false); return }

      const items = lines.map(l => {
        const p = (products || []).find(x => x.id === l.productId)
        const o = l.variantId ? optionsOf(p, l.scentId).find(x => x.id === l.variantId) : null
        const scent = o?.needScent ? (p.variants || []).find(v => v.id === l.scentId) : null
        return {
          productId: l.productId,
          variantId: l.variantId || undefined,
          variantName: o ? (o.kind === 'combo' && scent ? `${o.label.replace(' (combo)', '')} — ${scent.name}` : o.label.replace(' (combo)', '')) : undefined,
          scentId: l.scentId || undefined,
          qty: Number(l.qty),
        }
      })

      const r = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          items,
          customer: {
            name: f.name.trim(), phone: f.phone.trim().replace(/\s+/g, ''),
            address: f.address.trim(),
            provinceId: prov.id, provinceName: prov.name,
            districtId: dist.id, districtName: dist.name,
            wardCode: ward.code, wardName: ward.name,
          },
          source: f.source,
          note: f.note.trim(),
          shippingProvider: 'GHN',
        }),
      })
      const d = await r.json()
      if (!r.ok || d.error) { toast.err('✕ ' + (d.error || 'Không tạo được đơn')); setBusy(false); return }

      toast.ok(`➕ Đã tạo ${d.orderCode} — nằm ở tab Chờ xác nhận, nguồn ${f.source}. Kho đã trừ như đơn web.`)
      onCreated()
      onClose()
    } catch (e) {
      toast.err('✕ Lỗi tạo đơn: ' + (e?.message || e))
      setBusy(false)
    }
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget && !busy) onClose() }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(13,20,46,.45)', zIndex: 8000,
        display: 'grid', placeItems: 'center', padding: 16,
      }}
    >
      <div style={{
        background: '#fff', borderRadius: 16, width: 'min(660px,94vw)', maxHeight: '88vh',
        overflowY: 'auto', padding: 20, fontFamily: T.fontBody,
      }}>
        <h3 style={{ fontFamily: T.fontTitle, color: T.navyDeep, fontSize: 16, marginBottom: 4 }}>
          ➕ Tạo đơn từ FB / Zalo
        </h3>
        <div style={{ fontSize: 12, color: T.muted, marginBottom: 14 }}>
          Khách chốt qua chat → điền form → đơn vào tab Chờ xác nhận, kho trừ như đơn web,
          đi chung đường xuất BigSeller. (Phase 5 sẽ nối Messenger để máy tự điền — người vẫn soát.)
        </div>

        {/* ── Khách ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><span style={lbl}>Tên khách *</span>
            <input style={inp} value={f.name} onChange={e => set('name', e.target.value)} placeholder="VD: Hằng" /></div>
          <div><span style={lbl}>SĐT *</span>
            <input style={inp} value={f.phone} onChange={e => set('phone', e.target.value)} placeholder="09xxxxxxxx" /></div>
          <div><span style={lbl}>Nguồn đơn</span>
            <select style={inp} value={f.source} onChange={e => set('source', e.target.value)}>
              <option value="facebook">Facebook</option>
              <option value="zalo">Zalo</option>
              <option value="phone">Điện thoại</option>
            </select></div>
          <div><span style={lbl}>Tỉnh / Thành *</span>
            <select style={inp} value={prov?.id || ''} onChange={e => {
              const p = provinces.find(x => String(x.ProvinceID) === e.target.value)
              setProv(p ? { id: p.ProvinceID, name: p.ProvinceName } : null)
            }}>
              <option value="">— Chọn —</option>
              {provinces.map(p => <option key={p.ProvinceID} value={p.ProvinceID}>{p.ProvinceName}</option>)}
            </select></div>
          <div><span style={lbl}>Quận / Huyện *</span>
            <select style={inp} value={dist?.id || ''} disabled={!prov} onChange={e => {
              const d = districts.find(x => String(x.DistrictID) === e.target.value)
              setDist(d ? { id: d.DistrictID, name: d.DistrictName } : null)
            }}>
              <option value="">{prov ? '— Chọn —' : 'Chọn tỉnh trước'}</option>
              {districts.map(d => <option key={d.DistrictID} value={d.DistrictID}>{d.DistrictName}</option>)}
            </select></div>
          <div><span style={lbl}>Phường / Xã *</span>
            <select style={inp} value={ward?.code || ''} disabled={!dist} onChange={e => {
              const w = wards.find(x => String(x.WardCode) === e.target.value)
              setWard(w ? { code: w.WardCode, name: w.WardName } : null)
            }}>
              <option value="">{dist ? '— Chọn —' : 'Chọn quận trước'}</option>
              {wards.map(w => <option key={w.WardCode} value={w.WardCode}>{w.WardName}</option>)}
            </select></div>
          <div style={{ gridColumn: '1/3' }}><span style={lbl}>Địa chỉ cụ thể *</span>
            <input style={inp} value={f.address} onChange={e => set('address', e.target.value)} placeholder="Số nhà, tên đường…" /></div>
        </div>

        {/* ── Món hàng ── */}
        <div style={{ fontFamily: T.fontTitle, fontWeight: 700, fontSize: 12.5, color: T.navyDeep, margin: '14px 0 7px' }}>
          Món hàng (giá lấy từ hệ thống, kho kiểm khi tạo)
        </div>
        {lines.map((l, i) => {
          const p = (products || []).find(x => x.id === l.productId)
          const opts = p ? optionsOf(p, l.scentId) : []
          const chosen = opts.find(o => o.id === l.variantId)
          const scents = (chosen?.needScent && p) ? (p.variants || []) : []
          return (
            <div key={i} style={{
              border: `1px solid ${T.line}`, borderRadius: 10, padding: 10, marginBottom: 8,
              display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
            }}>
              <select style={{ ...inp, width: 'auto', flex: 2, minWidth: 160 }} value={l.productId}
                onChange={e => setLine(i, { productId: e.target.value, variantId: '', scentId: '' })}>
                <option value="">— Chọn sản phẩm —</option>
                {sellable.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
              {opts.length > 0 && (
                <select style={{ ...inp, width: 'auto', flex: 2, minWidth: 150 }} value={l.variantId}
                  onChange={e => setLine(i, { variantId: e.target.value, scentId: '' })}>
                  <option value="">— Phân loại / combo —</option>
                  {opts.map(o => (
                    <option key={o.id} value={o.id} disabled={!o.needScent && o.stock <= 0}>
                      {o.label} · {fmtMoney(o.price)}{o.needScent ? '' : ` · còn ${o.stock}`}
                    </option>
                  ))}
                </select>
              )}
              {scents.length > 0 && (
                <select style={{ ...inp, width: 'auto', flex: 1.5, minWidth: 120 }} value={l.scentId}
                  onChange={e => setLine(i, { scentId: e.target.value })}>
                  <option value="">— Chọn mùi —</option>
                  {scents.map(v => (
                    <option key={v.id} value={v.id} disabled={(Number(v.stock) || 0) <= 0}>
                      {v.name} · còn {Number(v.stock) || 0}
                    </option>
                  ))}
                </select>
              )}
              <input type="number" min={1} max={999} value={l.qty}
                onChange={e => setLine(i, { qty: Math.max(1, Number(e.target.value) || 1) })}
                style={{ ...inp, width: 64, textAlign: 'center' }} />
              {lines.length > 1 && (
                <button onClick={() => setLines(ls => ls.filter((_, j) => j !== i))} style={{
                  border: 'none', background: T.badBg, color: T.bad, borderRadius: 8,
                  width: 30, height: 30, cursor: 'pointer', fontWeight: 700,
                }}>✕</button>
              )}
              {chosen && !chosen.needScent && chosen.stock > 0 && l.qty > chosen.stock && (
                <span style={{ fontSize: 11, color: T.bad, width: '100%' }}>⚠ Chỉ còn {chosen.stock} — server sẽ từ chối nếu vượt</span>
              )}
            </div>
          )
        })}
        <button onClick={() => setLines(ls => [...ls, { ...EMPTY_LINE }])} style={{
          background: T.navySoft, color: T.navy, border: 'none', borderRadius: 9,
          padding: '7px 12px', fontFamily: T.fontTitle, fontWeight: 700, fontSize: 12, cursor: 'pointer',
        }}>+ Thêm món</button>

        <div style={{ marginTop: 12 }}>
          <span style={lbl}>Ghi chú (nội bộ + in cho BS)</span>
          <input style={inp} value={f.note} onChange={e => set('note', e.target.value)}
            placeholder="VD: khách hẹn giao giờ hành chính…" />
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginTop: 14,
          borderTop: `1px solid ${T.line}`, paddingTop: 12,
        }}>
          <span style={{ fontSize: 12.5, color: T.muted }}>
            Tạm tính: <b style={{ fontFamily: T.fontTitle, color: T.navyDeep, fontSize: 14 }}>{fmtMoney(subtotal)}</b>
            {' '}· phí ship GHN tính tự động khi tạo
          </span>
          <span style={{ flex: 1 }} />
          <button onClick={() => !busy && onClose()} style={{
            background: '#fff', color: T.navy, border: `1.5px solid ${T.line}`, borderRadius: 9,
            padding: '9px 15px', fontFamily: T.fontTitle, fontWeight: 700, fontSize: 12.5, cursor: 'pointer',
          }}>Đóng</button>
          <button onClick={submit} disabled={!valid || busy} style={{
            background: T.navy, color: '#fff', border: 'none', borderRadius: 9,
            padding: '9px 15px', fontFamily: T.fontTitle, fontWeight: 700, fontSize: 12.5,
            cursor: 'pointer', opacity: valid && !busy ? 1 : .5,
          }}>{busy ? '⏳ Đang tạo…' : 'Tạo đơn (Chờ xác nhận)'}</button>
        </div>
      </div>
    </div>
  )
}
