'use client'
// app/admin/products/_components/ProductEditor.js
// ─────────────────────────────────────────────────────────────────────
// Một modal cho MỘT sản phẩm: thông tin → phân loại (+SKU BS) → ảnh
// (ImageGate 1:1, không crop) → combo (BOM) → Ngừng bán (lưu trữ).
// Dùng cho cả THÊM MỚI (product = null). Field lạ trong JSON được GIỮ
// NGUYÊN qua spread — không làm rớt dữ liệu đời cũ.
// "Xoá" = archived trong stock_meta: khách không thấy, đơn cũ vẫn đọc
// đúng tên (quyết định spec F3 — không đốt sổ).
// ─────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { T } from '../../_lib/tokens'
import { checkImage } from '../../_components/ImageGate'
import { skuKey } from '../../../../lib/bigseller'
import { getAdminSession } from '../../../../lib/supabase'

const inp = {
  width: '100%', padding: '8px 10px', border: `1.5px solid ${T.line}`,
  borderRadius: 8, fontFamily: T.fontBody, fontSize: 12.5, outline: 'none',
}
const lbl = { fontSize: 11, fontWeight: 700, color: T.muted, display: 'block', margin: '10px 0 3px' }
const sect = { fontFamily: T.fontTitle, fontWeight: 800, fontSize: 12, color: T.navyDeep, letterSpacing: .4, margin: '18px 0 6px', textTransform: 'uppercase' }
const btn = (x) => ({ padding: '8px 14px', borderRadius: 9, fontSize: 12.5, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: T.fontBody, ...x })

const newId = (pre) => pre + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)

export default function ProductEditor({ product, categories, skuMap, archived, canEditPrice, canAdd, onClose, onSaved, onArchive, toast }) {
  const isNew = !product
  const [p, setP] = useState(() => product ? structuredClone(product) : {
    id: newId('p'), name: '', category: categories[0] || '', price: 0, original: 0,
    stock: 0, minStock: 10, sku: '', rating: 5, variants: [], combos: [], images: [],
    tags: '', story: '', subtitle: '', img: '',
  })
  const [skus, setSkus] = useState(() => {
    const m = {}
    const vids = (product?.variants?.length ? product.variants.map(v => v.id) : [''])
    for (const vid of vids) m[vid] = skuMap?.[skuKey(p?.id || product?.id, vid)] || ''
    return m
  })
  const [busy, setBusy] = useState(false)
  const set = (k, v) => setP(x => ({ ...x, [k]: v }))
  const setVar = (i, k, v) => setP(x => ({ ...x, variants: x.variants.map((vv, j) => j === i ? { ...vv, [k]: v } : vv) }))
  const setCombo = (i, k, v) => setP(x => ({ ...x, combos: x.combos.map((c, j) => j === i ? { ...c, [k]: v } : c) }))
  const setBom = (ci, bi, k, v) => setP(x => ({
    ...x, combos: x.combos.map((c, j) => j !== ci ? c : {
      ...c, bom: (c.bom || []).map((b, q) => q === bi ? { ...b, [k]: v } : b),
    }),
  }))

  const upload = async (file) => {
    const gate = await checkImage(file, 'product')
    if (!gate.ok) { toast.err(gate.reason); return }
    setBusy(true)
    try {
      const session = await getAdminSession()
      const fd = new FormData()
      fd.append('file', gate.file); fd.append('folder', 'products')
      fd.append('entityId', p.id); fd.append('oldUrl', p.img || '')
      const res = await fetch('/api/upload', {
        method: 'POST', headers: { Authorization: `Bearer ${session?.access_token}` }, body: fd,
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Tải ảnh thất bại')
      set('img', j.url); toast.ok('✓ Đã tải ảnh (tự nén nếu ảnh to)')
    } catch (e) { toast.err(String(e.message || e)) }
    finally { setBusy(false) }
  }

  const save = async () => {
    if (!p.name.trim()) { toast.warn('Chưa đặt tên sản phẩm'); return }
    setBusy(true)
    try {
      await onSaved(p, skus, isNew)
      onClose()
    } catch (e) { toast.err(String(e.message || e)) }
    finally { setBusy(false) }
  }

  const bomOptions = [
    { v: '', t: 'Sản phẩm gốc' },
    { v: '*scent*', t: '★ Mùi khách tự chọn' },
    ...(p.variants || []).map(v => ({ v: v.id, t: v.name || '(chưa tên)' })),
  ]

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(13,20,46,.45)', zIndex: 60, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '26px 12px', overflow: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, maxWidth: 720, width: '100%', padding: 18, boxShadow: '0 18px 60px rgba(13,20,46,.3)' }}>
        <button onClick={onClose} style={{ float: 'right', background: 'none', border: 'none', fontSize: 17, color: T.muted, cursor: 'pointer' }}>✕</button>
        <h3 style={{ fontFamily: T.fontTitle, fontSize: 16, color: T.navyDeep }}>
          {isNew ? '+ Thêm sản phẩm' : `Sửa — ${product.name}`}
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={lbl}>Tên sản phẩm</label>
            <input style={inp} value={p.name} onChange={e => set('name', e.target.value)} /></div>
          <div><label style={lbl}>Danh mục</label>
            <select style={inp} value={p.category} onChange={e => set('category', e.target.value)}>
              {[...new Set([p.category, ...categories])].filter(Boolean).map(c => <option key={c}>{c}</option>)}
            </select></div>
          <div><label style={lbl}>Giá bán (đ){!canEditPrice && ' 🔒'}</label>
            <input style={inp} type="number" disabled={!canEditPrice} value={p.price} onChange={e => set('price', Number(e.target.value) || 0)} /></div>
          <div><label style={lbl}>Giá gốc (đ){!canEditPrice && ' 🔒'}</label>
            <input style={inp} type="number" disabled={!canEditPrice} value={p.original} onChange={e => set('original', Number(e.target.value) || 0)} /></div>
        </div>
        <label style={lbl}>Mô tả ngắn (hiện dưới tên)</label>
        <input style={inp} value={p.subtitle || ''} onChange={e => set('subtitle', e.target.value)} />

        {/* ── Phân loại ── */}
        <div style={sect}>Phân loại {p.variants.length ? `(${p.variants.length})` : '— không có: bán theo sản phẩm gốc'}</div>
        {p.variants.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr .7fr 1.2fr auto', gap: 6, fontSize: 10.5, fontWeight: 700, color: T.muted, marginBottom: 3 }}>
            <span>TÊN</span><span>GIÁ{!canEditPrice && '🔒'}</span><span>GIÁ GỐC</span><span>TỒN</span><span>SKU BIGSELLER</span><span />
          </div>
        )}
        {p.variants.map((v, i) => (
          <div key={v.id} style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr .7fr 1.2fr auto', gap: 6, marginBottom: 6, alignItems: 'center' }}>
            <input style={inp} value={v.name || ''} onChange={e => setVar(i, 'name', e.target.value)} />
            <input style={inp} type="number" disabled={!canEditPrice} value={v.price ?? 0} onChange={e => setVar(i, 'price', Number(e.target.value) || 0)} />
            <input style={inp} type="number" disabled={!canEditPrice} value={v.original ?? 0} onChange={e => setVar(i, 'original', Number(e.target.value) || 0)} />
            <input style={inp} type="number" value={v.stock ?? 0} onChange={e => setVar(i, 'stock', Math.max(0, Number(e.target.value) || 0))} />
            <input style={{ ...inp, ...(skus[v.id] ? {} : { borderColor: T.bad, background: T.badBg }) }}
              placeholder="⚠ chưa khai" value={skus[v.id] || ''}
              onChange={e => setSkus(s => ({ ...s, [v.id]: e.target.value.trim() }))} />
            <button title="Xoá phân loại (chỉ nên khi vừa thêm nhầm)" onClick={() => setP(x => ({ ...x, variants: x.variants.filter((_, j) => j !== i) }))}
              style={btn({ background: 'none', color: T.bad, padding: '4px 6px' })}>✕</button>
          </div>
        ))}
        {p.variants.length === 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={lbl}>Tồn kho</label>
              <input style={inp} type="number" value={p.stock} onChange={e => set('stock', Math.max(0, Number(e.target.value) || 0))} /></div>
            <div><label style={lbl}>SKU BigSeller</label>
              <input style={{ ...inp, ...(skus[''] ? {} : { borderColor: T.bad, background: T.badBg }) }}
                placeholder="⚠ chưa khai — đơn sẽ bị loại khi xuất BS"
                value={skus[''] || ''} onChange={e => setSkus(s => ({ ...s, '': e.target.value.trim() }))} /></div>
          </div>
        )}
        <button style={btn({ background: '#fff', color: T.navy, border: `1.5px solid ${T.line}`, marginTop: 4 })}
          onClick={() => setP(x => ({ ...x, variants: [...x.variants, { id: newId('v'), name: '', price: x.price, original: x.original, stock: 0, img: '' }] }))}>
          + Thêm phân loại
        </button>

        {/* ── Ảnh ── */}
        <div style={sect}>Ảnh sản phẩm</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {p.img
            ? <img src={p.img} alt="" style={{ width: 74, height: 74, borderRadius: 10, objectFit: 'cover', border: `1px solid ${T.line}` }} />
            : <div style={{ width: 74, height: 74, borderRadius: 10, background: T.navySoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>📦</div>}
          <div style={{ flex: 1 }}>
            <label style={btn({ background: T.navy, color: '#fff', display: 'inline-block' })}>
              {busy ? 'Đang xử lý…' : 'Chọn ảnh…'}
              <input type="file" accept="image/*" hidden disabled={busy}
                onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = '' }} />
            </label>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 5 }}>
              Ảnh phải <b>VUÔNG 1:1</b> — sai tỉ lệ sẽ bị từ chối kèm hướng dẫn (không crop trên web). Ảnh to tự thu nhỏ + nén.
            </div>
          </div>
        </div>

        {/* ── Combo ── */}
        <div style={sect}>Combo của sản phẩm này ({p.combos.length})</div>
        {p.combos.map((c, ci) => (
          <div key={c.id} style={{ background: T.navySoft, borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr auto', gap: 6 }}>
              <input style={inp} placeholder="Tên combo" value={c.name || ''} onChange={e => setCombo(ci, 'name', e.target.value)} />
              <input style={inp} type="number" disabled={!canEditPrice} placeholder="Giá" value={c.price ?? 0} onChange={e => setCombo(ci, 'price', Number(e.target.value) || 0)} />
              <input style={inp} type="number" disabled={!canEditPrice} placeholder="Giá gốc" value={c.original ?? 0} onChange={e => setCombo(ci, 'original', Number(e.target.value) || 0)} />
              <button onClick={() => setP(x => ({ ...x, combos: x.combos.filter((_, j) => j !== ci) }))}
                style={btn({ background: 'none', color: T.bad })}>✕</button>
            </div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: T.muted, margin: '8px 0 3px' }}>
              GỒM NHỮNG MÓN NÀO (BOM) — {(c.bom || []).length === 0 && <span style={{ color: T.bad }}>⚠ chưa khai: combo sẽ bị bỏ qua khi xuất BS</span>}
            </div>
            {(c.bom || []).map((b, bi) => (
              <div key={bi} style={{ display: 'flex', gap: 6, marginBottom: 5 }}>
                <select style={{ ...inp, flex: 1 }} value={b.variantId ?? ''} onChange={e => setBom(ci, bi, 'variantId', e.target.value)}>
                  {bomOptions.map(o => <option key={o.v} value={o.v}>{o.t}</option>)}
                </select>
                <input style={{ ...inp, width: 66 }} type="number" min={1} value={b.qty || 1} onChange={e => setBom(ci, bi, 'qty', Math.max(1, Number(e.target.value) || 1))} />
                <button onClick={() => setP(x => ({ ...x, combos: x.combos.map((cc, j) => j !== ci ? cc : { ...cc, bom: cc.bom.filter((_, q) => q !== bi) }) }))}
                  style={btn({ background: 'none', color: T.bad })}>✕</button>
              </div>
            ))}
            <button style={btn({ background: '#fff', color: T.navy, border: `1.5px solid ${T.line}`, padding: '5px 10px', fontSize: 11.5 })}
              onClick={() => setP(x => ({ ...x, combos: x.combos.map((cc, j) => j !== ci ? cc : { ...cc, bom: [...(cc.bom || []), { variantId: p.variants[0]?.id ?? '', qty: 1 }] }) }))}>
              + Thêm món vào combo
            </button>
          </div>
        ))}
        <button style={btn({ background: '#fff', color: T.navy, border: `1.5px solid ${T.line}` })}
          onClick={() => setP(x => ({ ...x, combos: [...x.combos, { id: newId('c'), name: '', price: x.price, original: 0, bom: [], img: '', best: false, scentPick: x.variants.length > 0 }] }))}>
          + Thêm combo
        </button>

        <div style={{ background: T.warnBg, border: '1px solid #f0d9a8', color: '#8a5a00', borderRadius: 8, padding: '7px 10px', fontSize: 11.5, marginTop: 14 }}>
          📒 Số tồn ở đây là số web — tự đặt, đặt dè nếu món chạy mạnh bên sàn (chốt 13/08).
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
          {!isNew && canAdd && (
            <button onClick={() => onArchive(p, !archived)} style={btn({
              marginRight: 'auto',
              background: archived ? T.ok : T.bad, color: '#fff',
            })}>{archived ? 'Mở bán lại' : 'Ngừng bán (lưu trữ)'}</button>
          )}
          <button onClick={onClose} style={btn({ background: '#fff', color: T.navy, border: `1.5px solid ${T.line}` })}>Huỷ</button>
          <button disabled={busy} onClick={save} style={btn({ background: T.navy, color: '#fff' })}>{busy ? 'Đang lưu…' : '✓ Lưu'}</button>
        </div>
      </div>
    </div>
  )
}
