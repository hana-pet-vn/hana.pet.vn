'use client'
// app/admin/products/page.js — Phase 2: Sản phẩm & Kho
// ─────────────────────────────────────────────────────────────────────
// F1 bảng SKU + tab đếm số · F2 khai SKU BS inline · F3 editor (+ lưu
// trữ thay xoá) · F4 tab Combo · F5 sửa tồn inline + kiểm kho hàng loạt
// · F7 ngưỡng tự ngừng bán. F6 đồng bộ file tồn: ĐÃ BỎ (veto 13/08 —
// kho web nhân viên tự đặt số, tự căn như bên sàn).
// Kho lưu ở đâu: tồn/giá trong products (variants JSON) · ngưỡng +
// lưu trữ trong site_config 'stock_meta' · SKU BS trong 'bigseller'.map
// · ghim trang chủ trong 'pinned_products'. KHÔNG đổi schema.
// ─────────────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo } from 'react'
import { useAdmin } from '../layout'
import { T } from '../_lib/tokens'
import { can } from '../_lib/roles'
import { useToast } from '../_components/Toast'
import GuideStrip from '../_components/GuideStrip'
import { normalizeSearch } from '../_components/ui'
import {
  getProducts, upsertProduct, updateProductStock, getAllConfigs,
  setConfig, mergeConfig, getCategories,
} from '../../../lib/supabase'
import { skuKey } from '../../../lib/bigseller'
import { buildRows, buildComboRows, patchMeta } from './_lib/inv'
import SkuTable from './_components/SkuTable'
import ComboTable from './_components/ComboTable'
import ProductEditor from './_components/ProductEditor'
import BulkStockModal from './_components/BulkStockModal'

const TABS = [
  { key: 'all',    label: 'Tất cả' },
  { key: 'in',     label: 'Còn hàng' },
  { key: 'low',    label: 'Sắp hết',  hot: true },
  { key: 'out',    label: 'Hết hàng', hot: true },
  { key: 'combo',  label: 'Combo' },
  { key: 'hidden', label: 'Đã ẩn' },
]

export default function ProductsPage() {
  const ctx = useAdmin()
  const toast = useToast()
  const [products, setProducts] = useState([])
  const [meta, setMeta] = useState({})            // site_config stock_meta
  const [skuMap, setSkuMap] = useState({})        // 'bigseller'.map
  const [bsStore, setBsStore] = useState('')
  const [pinned, setPinned] = useState([])        // 'pinned_products'
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')
  const [q, setQ] = useState('')
  const [modal, setModal] = useState(null)        // {kind:'edit',product}|{kind:'bulk'}

  const canEditPrice = can(ctx, 'edit_price')
  const canAdd = can(ctx, 'add_products')

  const load = async (silent = false) => {
    try {
      const [prods, cfg, cats] = await Promise.all([getProducts(), getAllConfigs(), getCategories()])
      setProducts(prods)
      setMeta(cfg.stock_meta || {})
      setSkuMap(cfg.bigseller?.map || {})
      setBsStore(cfg.bigseller?.store || '')
      setPinned(Array.isArray(cfg.pinned_products) ? cfg.pinned_products : [])
      setCategories(cats)
    } catch (e) { if (!silent) toast.err('Không tải được dữ liệu: ' + (e?.message || e)) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, []) // eslint-disable-line

  const rows = useMemo(() => buildRows(products, meta, skuMap), [products, meta, skuMap])
  const combos = useMemo(() => buildComboRows(products, meta, skuMap), [products, meta, skuMap])

  const counts = useMemo(() => ({
    all: rows.filter(r => !r.archived).length,
    in: rows.filter(r => r.status === 'in').length,
    low: rows.filter(r => r.status === 'low').length,
    out: rows.filter(r => r.status === 'out').length,
    combo: combos.filter(c => !c.archived).length,
    hidden: [...new Set(rows.filter(r => r.archived).map(r => r.pid))].length,
  }), [rows, combos])

  const filtered = useMemo(() => {
    const nq = normalizeSearch(q)
    return rows.filter(r => {
      if (tab === 'hidden' ? !r.archived : (tab !== 'all' && tab !== 'combo' && r.status !== tab)) return false
      if (tab === 'all' && r.archived) return false
      if (nq && !normalizeSearch(`${r.name} ${r.vname} ${r.sku}`).includes(nq)) return false
      return true
    })
  }, [rows, tab, q])

  /* ── Ghi 1 ô inline ─────────────────────────────────────────────── */
  const patchRow = async (r, field, value) => {
    try {
      if (field === 'sku') {
        const map = { ...skuMap, [skuKey(r.pid, r.vid)]: value }
        if (!value) delete map[skuKey(r.pid, r.vid)]
        await mergeConfig('bigseller', bsStore ? { map, store: bsStore } : { map })
        setSkuMap(map)
        toast.ok(value ? '✓ Đã khai SKU BigSeller' : 'Đã xoá SKU — đơn chứa món này sẽ bị loại khi xuất BS')
        return
      }
      if (field === 'safety' || (field === 'minStock' && r.vid)) {
        const key = field === 'safety' ? 'safety' : 'minStock'
        const next = patchMeta(meta, r.pid, { [key]: { [r.vid || '']: value } })
        await mergeConfig('stock_meta', { [r.pid]: next })
        setMeta(m => ({ ...m, [r.pid]: next }))
        toast.ok('✓ Đã lưu ngưỡng')
        return
      }
      // stock / price / minStock gốc → ghi vào products
      const p = products.find(x => x.id === r.pid)
      if (!p) return
      if (r.vid) {
        const variants = p.variants.map(v => v.id === r.vid ? { ...v, [field]: value } : v)
        await upsertProduct({ ...p, variants })
      } else if (field === 'stock') {
        await updateProductStock(p.id, value)
      } else {
        await upsertProduct({ ...p, [field]: value })
      }
      setProducts(prev => prev.map(x => x.id !== r.pid ? x : (
        r.vid ? { ...x, variants: x.variants.map(v => v.id === r.vid ? { ...v, [field]: value } : v) }
              : { ...x, [field]: value }
      )))
      toast.ok('✓ Đã lưu')
    } catch (e) { toast.err('Lưu lỗi: ' + (e?.message || e)) }
  }

  /* ── Lưu từ editor (thêm mới / sửa) ─────────────────────────────── */
  const saveProduct = async (p, skus, isNew) => {
    await upsertProduct(p)
    const map = { ...skuMap }
    const vids = p.variants.length ? p.variants.map(v => v.id) : ['']
    for (const vid of vids) {
      const k = skuKey(p.id, vid)
      if (skus[vid]) map[k] = skus[vid]
      else delete map[k]
    }
    await mergeConfig('bigseller', bsStore ? { map, store: bsStore } : { map })
    setSkuMap(map)
    toast.ok(isNew ? '✓ Đã thêm sản phẩm' : '✓ Đã lưu sản phẩm')
    load(true)
  }

  const archiveProduct = async (p, toArchived) => {
    const next = patchMeta(meta, p.id, { archived: toArchived })
    await mergeConfig('stock_meta', { [p.id]: next })
    setMeta(m => ({ ...m, [p.id]: next }))
    setModal(null)
    toast.ok(toArchived
      ? '✓ Đã ngừng bán — khách không thấy nữa, đơn cũ vẫn đọc đúng tên (không xoá sổ)'
      : '✓ Đã mở bán lại')
  }

  const togglePin = async (p) => {
    const next = pinned.includes(p.id) ? pinned.filter(x => x !== p.id) : [...pinned, p.id]
    try {
      await setConfig('pinned_products', next)
      setPinned(next)
      toast.ok(pinned.includes(p.id) ? 'Đã bỏ ghim' : '📌 Đã ghim — thứ tự hiển thị chỉnh ở Trang trí gian hàng (Phase 4)')
    } catch (e) { toast.err('Lưu lỗi: ' + (e?.message || e)) }
  }

  /* ── Kiểm kho hàng loạt: gom thay đổi theo sản phẩm, ghi 1 lần/SP ── */
  const applyBulk = async (changes) => {
    const byPid = {}
    for (const c of changes) (byPid[c.row.pid] = byPid[c.row.pid] || []).push(c)
    for (const pid of Object.keys(byPid)) {
      const p = products.find(x => x.id === pid)
      if (!p) continue
      const varChanges = byPid[pid].filter(c => c.row.vid)
      const rootChange = byPid[pid].find(c => !c.row.vid)
      if (varChanges.length) {
        const variants = p.variants.map(v => {
          const c = varChanges.find(x => x.row.vid === v.id)
          return c ? { ...v, stock: c.to } : v
        })
        await upsertProduct({ ...p, variants, ...(rootChange ? { stock: rootChange.to } : {}) })
      } else if (rootChange) {
        await updateProductStock(pid, rootChange.to)
      }
    }
    toast.ok(`✓ Đã áp ${changes.length} thay đổi tồn kho`)
    load(true)
  }

  const btn = (x) => ({ padding: '8px 14px', borderRadius: 9, fontSize: 12.5, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: T.fontBody, ...x })

  if (loading) return <div style={{ color: T.muted, padding: 30 }}>Đang tải sản phẩm…</div>

  return (
    <div>
      <h1 style={{ fontFamily: T.fontTitle, fontSize: 19, color: T.navyDeep, marginBottom: 2 }}>📦 Sản phẩm &amp; Kho</h1>
      <p style={{ color: T.muted, fontSize: 12, marginBottom: 14 }}>
        Mỗi dòng = 1 mã SKU · kho web tự đặt số, tự căn — như đang làm bên sàn
      </p>

      <GuideStrip guide="inventory" userEmail={ctx?.user?.email || ''} />

      <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: T.radius, boxShadow: T.shadow }}>
        <div style={{ display: 'flex', gap: 2, borderBottom: `1px solid ${T.line}`, overflowX: 'auto', padding: '0 8px' }}>
          {TABS.map(t => {
            const on = t.key === tab
            const n = counts[t.key] ?? 0
            return (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding: '11px 13px', fontSize: 12.5, background: 'none', border: 'none',
                borderBottom: `2.5px solid ${on ? T.navy : 'transparent'}`,
                color: on ? T.navy : T.muted, fontWeight: on ? 700 : 500,
                display: 'flex', gap: 6, alignItems: 'center', whiteSpace: 'nowrap', cursor: 'pointer',
                fontFamily: T.fontBody,
              }}>
                {t.label}
                <span style={{
                  fontSize: 10.5, padding: '1px 7px', borderRadius: 20, fontWeight: 700,
                  background: t.hot && n > 0 ? T.bad : T.navySoft,
                  color: t.hot && n > 0 ? '#fff' : T.muted,
                }}>{n}</span>
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', gap: 10, padding: '12px 14px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Tìm tên / mùi / mã SKU… (bỏ dấu cũng ra)"
            style={{ flex: 1, minWidth: 170, padding: '8px 12px', fontSize: 12.5, borderRadius: 9, border: `1.5px solid ${T.line}`, outline: 'none', fontFamily: T.fontBody }} />
          <button style={btn({ background: '#fff', color: T.navy, border: `1.5px solid ${T.line}` })}
            onClick={() => setModal({ kind: 'bulk' })}>📋 Kiểm kho hàng loạt</button>
          {canAdd && (
            <button style={btn({ background: T.navy, color: '#fff' })}
              onClick={() => setModal({ kind: 'edit', product: null })}>+ Thêm sản phẩm</button>
          )}
        </div>

        {tab === 'combo'
          ? <ComboTable combos={combos.filter(c => !c.archived)} onEditParent={(p) => setModal({ kind: 'edit', product: p })} />
          : <SkuTable rows={filtered} canEditPrice={canEditPrice} pinned={pinned}
              onEdit={(p) => setModal({ kind: 'edit', product: p })}
              onPatch={patchRow} onPin={togglePin} />}
      </div>

      {modal?.kind === 'edit' && (
        <ProductEditor
          product={modal.product}
          categories={categories}
          skuMap={skuMap}
          archived={modal.product ? !!meta[modal.product.id]?.archived : false}
          canEditPrice={canEditPrice}
          canAdd={canAdd}
          onClose={() => setModal(null)}
          onSaved={saveProduct}
          onArchive={archiveProduct}
          toast={toast}
        />
      )}
      {modal?.kind === 'bulk' && (
        <BulkStockModal rows={rows} onClose={() => setModal(null)} onApply={applyBulk} toast={toast} />
      )}
    </div>
  )
}
