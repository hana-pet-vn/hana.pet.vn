'use client'
// app/admin/orders/page.js — Quản lý đơn hàng (Phase 1)
// ─────────────────────────────────────────────────────────────────────
// F0 GuideStrip · F1 danh sách + tab đếm số + realtime · F2 tìm/lọc
// (trạng thái nằm trên URL) · F3 xác nhận lẻ/hàng loạt · F7 chi tiết.
// Xuất BS (F4) / Đối soát (F5) / Huỷ (F6) / Tạo đơn tay (F9) nối vào
// ở các cụm sau — cùng trang này, qua các modal ở _components.
// ─────────────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getOrders, getProducts, updateOrderDB, supabase } from '../../../lib/supabase'
import { useAdmin } from '../layout'
import { T } from '../_lib/tokens'
import { Tabs } from '../_components/ui'
import { useToast } from '../_components/Toast'
import GuideStrip from '../_components/GuideStrip'
import ConfirmModal from '../_components/ConfirmModal'
import OrderTable from './_components/OrderTable'
import OrderDetail from './_components/OrderDetail'
import ExportModal from './_components/ExportModal'
import CancelModal from './_components/CancelModal'
import ReconcileModal from './_components/ReconcileModal'
import NewOrderModal from './_components/NewOrderModal'
import FilterBar from './_components/FilterBar'
import { ORDER_TABS, filterOrders, tabCount, ordersInTab } from './_lib/utils'
import { doCancelOrder, doRevertToPending } from './_lib/actions'

export default function OrdersPageShell() {
  return (
    <Suspense fallback={<div style={{ color: T.muted, padding: 20 }}>Đang tải đơn hàng…</div>}>
      <OrdersPage />
    </Suspense>
  )
}

function OrdersPage() {
  const ctx = useAdmin()
  const router = useRouter()
  const sp = useSearchParams()
  const toast = useToast()

  // ── F2: trạng thái lọc SỐNG TRÊN URL — gửi link là ra đúng màn hình ──
  const tab    = sp.get('tab')    || 'all'
  const q      = sp.get('q')      || ''
  const range  = sp.get('range')  || '30'
  const from   = sp.get('from')   || ''
  const to     = sp.get('to')     || ''
  const source = sp.get('source') || 'all'
  const openId = sp.get('id')     || ''

  const setParams = useCallback((patch) => {
    const p = new URLSearchParams(sp.toString())
    for (const [k, v] of Object.entries(patch)) {
      if (v === '' || v == null || (k === 'tab' && v === 'all') ||
          (k === 'range' && v === '30') || (k === 'source' && v === 'all')) p.delete(k)
      else p.set(k, v)
    }
    const s = p.toString()
    router.replace('/admin/orders' + (s ? `?${s}` : ''), { scroll: false })
  }, [sp, router])

  // Ô tìm gõ mượt: state cục bộ, đẩy lên URL sau 300ms
  const [qDraft, setQDraft] = useState(q)
  useEffect(() => { setQDraft(q) }, [q])
  useEffect(() => {
    if (qDraft === q) return
    const t = setTimeout(() => setParams({ q: qDraft }), 300)
    return () => clearTimeout(t)
  }, [qDraft])   // eslint-disable-line react-hooks/exhaustive-deps

  // ── Dữ liệu ──────────────────────────────────────────────────────────
  const [orders, setOrders] = useState(null)     // null = chưa tải xong lần đầu
  const [products, setProducts] = useState([])
  const [broken, setBroken] = useState(false)    // lỗi tải / mất realtime
  const refreshTimer = useRef(null)

  const refresh = useCallback(async () => {
    try {
      const ords = await getOrders()
      setOrders(ords)
      setBroken(false)
    } catch {
      // F1: giữ data cũ + banner, KHÔNG trắng trang
      setBroken(true)
    }
  }, [])

  useEffect(() => {
    refresh()
    getProducts().then(setProducts).catch(() => {})
  }, [refresh])

  // Tự thử lại khi đang đứt
  useEffect(() => {
    if (!broken) return
    const t = setInterval(refresh, 15000)
    return () => clearInterval(t)
  }, [broken, refresh])

  // ── F1: realtime — đơn mới/đổi tự hiện, không bắt F5 ─────────────────
  useEffect(() => {
    const ch = supabase
      .channel('admin2-orders-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        clearTimeout(refreshTimer.current)
        refreshTimer.current = setTimeout(refresh, 600)   // gom nhiều sự kiện sát nhau
      })
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setBroken(true)
        if (status === 'SUBSCRIBED') refresh()
      })
    return () => { clearTimeout(refreshTimer.current); supabase.removeChannel(ch) }
  }, [refresh])

  const productMap = useMemo(
    () => Object.fromEntries(products.map(p => [p.id, p])), [products])

  // ── Lọc + tab ────────────────────────────────────────────────────────
  const filtered = useMemo(
    () => filterOrders(orders || [], { q, range, from, to, source }),
    [orders, q, range, from, to, source])
  const rows = useMemo(() => ordersInTab(tab, filtered), [tab, filtered])

  const tabs = useMemo(() => ORDER_TABS
    .filter(t => !t.hideWhenEmpty || tabCount(t, filtered) > 0)
    .map(t => ({ key: t.key, label: t.label, count: tabCount(t, filtered), hot: !!t.hot })),
  [filtered])

  // ── Chọn hàng loạt ───────────────────────────────────────────────────
  const [selected, setSelected] = useState(() => new Set())
  const toggle = id => setSelected(s => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n
  })
  const toggleAll = list => setSelected(s => {
    const all = list.every(o => s.has(o.id))
    const n = new Set(s)
    list.forEach(o => all ? n.delete(o.id) : n.add(o.id))
    return n
  })
  const clearSel = () => setSelected(new Set())
  useEffect(() => { clearSel() }, [tab])   // đổi tab thì bỏ chọn (giữ từ khoá)

  // ── F3: xác nhận đơn (lẻ + hàng loạt, chạy tuần tự) ──────────────────
  const [busy, setBusy] = useState(false)
  const confirmOrders = useCallback(async (list) => {
    const targets = list.filter(o => o.status === 'Pending')
    if (!targets.length) { toast.warn('Không có đơn Chờ xác nhận nào trong lựa chọn'); return }
    setBusy(true)
    let ok = 0
    for (const o of targets) {
      try {
        await updateOrderDB(o.id, { status: 'Confirmed' })
        setOrders(prev => (prev || []).map(x => x.id === o.id ? { ...x, status: 'Confirmed' } : x))
        ok++
        if (targets.length === 1) toast.ok(`✓ ${o.code} — đã xác nhận`)
      } catch (e) {
        // đơn nào lỗi báo riêng đơn đó, không chặn cả lô
        toast.err(`✕ ${o.code} — không xác nhận được: ${e?.message || e}`)
      }
    }
    if (targets.length > 1 && ok > 0) toast.ok(`✓ Đã xác nhận ${ok}/${targets.length} đơn`)
    if (list.length > targets.length) {
      toast.warn(`${list.length - targets.length} đơn bị bỏ qua (không ở trạng thái Chờ xác nhận)`)
    }
    clearSel()
    setBusy(false)
  }, [toast])

  const saveNote = useCallback(async (o, note) => {
    try {
      await updateOrderDB(o.id, { note: String(note).slice(0, 500) })
      setOrders(prev => (prev || []).map(x => x.id === o.id ? { ...x, note } : x))
      toast.ok('📝 Đã lưu ghi chú')
    } catch (e) { toast.err('Không lưu được ghi chú: ' + (e?.message || e)) }
  }, [toast])

  // ── F4/F6/F7/F8: modal + thao tác ────────────────────────────────────
  const [exportTargets, setExportTargets] = useState(null)  // mảng đơn → mở ExportModal
  const [cancelTarget, setCancelTarget]   = useState(null)  // đơn → mở CancelModal
  const [modal, setModal]                 = useState(null)  // ConfirmModal dùng chung
  const [reconcileOpen, setReconcileOpen] = useState(false) // F5 đối soát
  const [newOrderOpen, setNewOrderOpen]   = useState(false) // F9 tạo đơn tay

  const openExport = useCallback((list) => {
    if (!list?.length) { toast.warn('Tick đơn muốn xuất trước đã'); return }
    setExportTargets(list)
  }, [toast])

  /* Nút xuất trên thanh lọc: có tick thì xuất phần tick; đứng ở tab
     Đã xác nhận mà chưa tick gì thì lấy CẢ TAB (đúng nhịp "tick hết → xuất") */
  const exportFromToolbar = useCallback(() => {
    const sel = rows.filter(o => selected.has(o.id))
    if (sel.length) return openExport(sel)
    if (tab === 'confirmed' && rows.length) return openExport(rows)
    toast.warn('Tick đơn muốn xuất, hoặc vào tab "Đã xác nhận" rồi bấm lại')
  }, [rows, selected, tab, openExport, toast])

  const onExported = useCallback((ids, now) => {
    const idSet = new Set(ids)
    setOrders(prev => (prev || []).map(o => idSet.has(o.id) ? { ...o, bigsellerExportedAt: now } : o))
    clearSel()
  }, [])

  const cancelOrder = useCallback(
    (order, reason) => doCancelOrder({ order, reason, toast, setOrders }),
    [toast])

  const revertOrder = useCallback((o) => setModal({
    title: `Trả ${o.code} về Chờ xác nhận?`,
    body: <>Đơn sẽ quay lại tab Chờ xác nhận.{o.bigsellerExportedAt && <> <b>Đơn ĐÃ xuất BigSeller</b> — file cũ vẫn chứa đơn này, kiểm bên BS trước khi xuất lại.</>}</>,
    confirmText: 'Trả về Chờ xác nhận',
    onConfirm: () => doRevertToPending({ order: o, toast, setOrders }),
  }), [toast])

  // ── F0: bấm bước trong bảng quy trình → nhảy tới thao tác thật ───────
  const onGuide = useCallback((action) => {
    if (action === 'goto-pending')   setParams({ tab: 'pending',   id: '' })
    if (action === 'goto-confirmed') setParams({ tab: 'confirmed', id: '' })
    if (action === 'goto-reconcile') setReconcileOpen(true)
  }, [setParams])

  /* F5: sau khi Áp dụng — vá trạng thái vào danh sách đang cầm trên tay
     (realtime cũng sẽ tự refresh, đây là để thấy NGAY không chờ) */
  const onReconciled = useCallback((changes) => {
    const map = new Map(changes.map(c => [c.id, c]))
    setOrders(prev => (prev || []).map(o => {
      const c = map.get(o.id)
      return c ? { ...o, status: c.status, bigsellerOrderId: c.bigsellerOrderId || o.bigsellerOrderId } : o
    }))
  }, [])

  // ── Màn chi tiết (F7) ────────────────────────────────────────────────
  const openOrder = openId && (orders || []).find(o => o.id === openId)
  if (openId && orders && !openOrder) {
    // id trên URL không còn (đơn bị xoá?) — quay về danh sách
    setTimeout(() => setParams({ id: '' }), 0)
  }
  // Modal dùng chung cho cả màn danh sách lẫn màn chi tiết
  const modals = (
    <>
      {exportTargets && (
        <ExportModal
          orders={exportTargets}
          products={products}
          onDone={onExported}
          onClose={() => setExportTargets(null)}
        />
      )}
      <CancelModal order={cancelTarget} onCancel={cancelOrder} onClose={() => setCancelTarget(null)} />
      {reconcileOpen && (
        <ReconcileModal orders={orders || []} onApplied={onReconciled} onClose={() => setReconcileOpen(false)} />
      )}
      {newOrderOpen && (
        <NewOrderModal
          products={products}
          onCreated={() => { refresh(); setParams({ tab: 'pending', id: '' }) }}
          onClose={() => setNewOrderOpen(false)}
        />
      )}
      <ConfirmModal modal={modal} onClose={() => setModal(null)} />
    </>
  )

  if (openOrder) {
    return (
      <>
        <OrderDetail
          order={openOrder}
          productMap={productMap}
          onBack={() => setParams({ id: '' })}
          onConfirm={confirmOrders}
          onSaveNote={saveNote}
          onExport={openExport}
          onCancel={setCancelTarget}
          onRevert={revertOrder}
        />
        {modals}
      </>
    )
  }

  const selRows = rows.filter(o => selected.has(o.id))
  const selPending = selRows.filter(o => o.status === 'Pending')

  return (
    <div>
      <h1 style={{ fontFamily: T.fontTitle, fontWeight: 800, fontSize: 19, color: T.navyDeep, marginBottom: 2 }}>
        Quản lý đơn hàng
      </h1>
      <p style={{ color: T.muted, fontSize: 12, marginBottom: 16 }}>
        Web nhận &amp; chốt đơn → xuất BigSeller mỗi sáng → mỗi chiều đối soát nhận trạng thái về.
      </p>

      <GuideStrip guide="orders" userEmail={ctx?.user?.email || ''} onAction={onGuide} />

      {broken && (
        <div style={{
          background: T.warnBg, border: '1px solid #f3d9a4', borderRadius: 10,
          padding: '9px 14px', fontSize: 12.5, color: '#92400e', marginBottom: 10,
        }}>
          ⚠ Mất kết nối hoặc tải lỗi — đang hiện dữ liệu cũ và tự thử lại…
        </div>
      )}

      {/* ── Tab trạng thái (F1) ── */}
      <div style={{ background: T.card, border: `1px solid ${T.line}`, borderBottom: 'none', borderRadius: `${T.radius}px ${T.radius}px 0 0` }}>
        <Tabs tabs={tabs} active={tab} onChange={k => setParams({ tab: k })} />
      </div>

      {/* ── Tìm & lọc (F2) + nút hành động ── */}
      <FilterBar
        qDraft={qDraft} setQDraft={setQDraft}
        range={range} from={from} to={to} source={source} setParams={setParams}
        onExport={exportFromToolbar}
        onReconcile={() => setReconcileOpen(true)}
        onNewOrder={() => setNewOrderOpen(true)}
      />

      {/* ── Bảng đơn (F1) ── */}
      <div style={{
        background: T.card, border: `1px solid ${T.line}`, borderTop: 'none',
        borderRadius: `0 0 ${T.radius}px ${T.radius}px`, boxShadow: T.shadow, overflow: 'hidden',
      }}>
        {orders === null
          ? <div style={{ padding: 40, textAlign: 'center', color: T.muted }}>⏳ Đang tải đơn hàng…</div>
          : <OrderTable
              rows={rows}
              productMap={productMap}
              selected={selected}
              onToggle={toggle}
              onToggleAll={toggleAll}
              onOpen={o => setParams({ id: o.id })}
              onConfirm={confirmOrders}
              onExport={openExport}
              emptyHint={q ? 'Xoá từ khoá để xem toàn bộ.' : undefined}
            />}
      </div>

      {/* ── Thanh bulk (F3) ── */}
      {selRows.length > 0 && (
        <div style={{
          position: 'sticky', bottom: 12, background: T.navyDeep, color: '#fff',
          borderRadius: T.radius, padding: '11px 16px', display: 'flex',
          alignItems: 'center', gap: 12, marginTop: 14,
          boxShadow: '0 -4px 20px rgba(13,20,46,.25)',
        }}>
          <b style={{ fontFamily: T.fontTitle }}>Đã chọn {selRows.length} đơn</b>
          <button onClick={() => openExport(selRows)} style={{
            background: '#fff', color: T.navy, border: 'none', borderRadius: 8,
            padding: '6px 11px', fontFamily: T.fontTitle, fontWeight: 700, fontSize: 12, cursor: 'pointer',
          }}>📤 Xuất BigSeller</button>
          {selPending.length > 0 && (
            <button disabled={busy} onClick={() => confirmOrders(selRows)} style={{
              background: '#fff', color: T.navy, border: 'none', borderRadius: 8,
              padding: '6px 11px', fontFamily: T.fontTitle, fontWeight: 700, fontSize: 12,
              cursor: 'pointer', opacity: busy ? .6 : 1,
            }}>{busy ? '⏳ Đang xác nhận…' : `✓ Xác nhận ${selPending.length} đơn`}</button>
          )}
          <button onClick={clearSel} style={{
            background: 'transparent', color: '#aab4d4', border: 'none',
            fontFamily: T.fontTitle, fontWeight: 700, fontSize: 12, marginLeft: 'auto', cursor: 'pointer',
          }}>Bỏ chọn</button>
        </div>
      )}

      {modals}
    </div>
  )
}
