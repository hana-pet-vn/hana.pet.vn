'use client'
// app/admin/orders/page.js
import { useState, useEffect, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase, getOrders, updateOrderDB } from '../../../lib/supabase'

const FONT_T = "'Baloo 2','Be Vietnam Pro','Segoe UI',sans-serif"
const FONT_B = "'Be Vietnam Pro','Segoe UI',sans-serif"
const PRIMARY = '#1b295b'

const STATUS_COLOR = {
  Pending:         '#F59E0B',
  Confirmed:       '#3B82F6',
  Packing:         '#8B5CF6',
  'Handed to GHN': '#06B6D4',
  'In Transit':    '#1b295b',
  Delivered:       '#22C55E',
  Cancelled:       '#EF4444',
}
const ALL_STATUSES = ['Pending','Confirmed','Packing','Handed to GHN','In Transit','Delivered','Cancelled']
const STATUS_LABELS = {
  Pending: 'Chờ xử lý', Confirmed: 'Đã xác nhận', Packing: 'Đang đóng gói',
  'Handed to GHN': 'Đã giao cho GHN', 'In Transit': 'Đang vận chuyển',
  Delivered: 'Đã giao', Cancelled: 'Đã huỷ',
}

const fmt  = n => (n || 0).toLocaleString('vi-VN') + 'đ'
const fmtN = n => (n || 0).toLocaleString('vi-VN')

// ── Root export — required Suspense wrapper for useSearchParams ───────────────
export default function OrdersPageShell() {
  return (
    <Suspense fallback={
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f2f5fb', fontFamily: FONT_T, fontSize:18, color: PRIMARY }}>
        ⏳ Đang tải đơn hàng...
      </div>
    }>
      <OrdersPage />
    </Suspense>
  )
}

// ── Actual page (uses useSearchParams safely inside Suspense) ─────────────────
function OrdersPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [orders,  setOrders]  = useState([])
  const [sel,     setSel]     = useState(null)

  const [search,     setSearch]     = useState('')
  const [statusFilt, setStatusFilt] = useState('all')
  const [dateFrom,   setDateFrom]   = useState('')
  const [dateTo,     setDateTo]     = useState('')
  const [source,     setSource]     = useState('all')

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/admin/login'); return }
      setUser(session.user)
      const ords = await getOrders()
      setOrders(ords)
      setLoading(false)
      const id = searchParams.get('id')
      if (id) setSel(id)
    })()
  }, [])

  const filtered = useMemo(() => {
    return orders.filter(o => {
      if (statusFilt !== 'all' && o.status !== statusFilt) return false
      if (source !== 'all' && o.source !== source) return false
      if (dateFrom) {
        const d = new Date(o.createdAt); d.setHours(0,0,0,0)
        if (d < new Date(dateFrom)) return false
      }
      if (dateTo) {
        const d = new Date(o.createdAt); d.setHours(23,59,59,999)
        if (d > new Date(dateTo + 'T23:59:59')) return false
      }
      if (search) {
        const q = search.toLowerCase()
        const name  = o.customer?.name?.toLowerCase()  || ''
        const phone = o.customer?.phone?.toLowerCase() || ''
        const code  = o.code?.toLowerCase()            || ''
        if (!name.includes(q) && !phone.includes(q) && !code.includes(q)) return false
      }
      return true
    })
  }, [orders, statusFilt, dateFrom, dateTo, search, source])

  const summary = useMemo(() => {
    const delivered = filtered.filter(o => o.status === 'Delivered')
    const cancelled = filtered.filter(o => o.status === 'Cancelled')
    const active    = filtered.filter(o => o.status !== 'Cancelled')
    const grossRevenue  = delivered.reduce((s, o) => s + (o.total       || 0), 0)
    const totalSubtotal = delivered.reduce((s, o) => s + (o.subtotal    || o.total || 0), 0)
    const totalShipping = delivered.reduce((s, o) => s + (o.shippingFee || 0), 0)
    const totalDiscount = delivered.reduce((s, o) => s + (o.discount    || 0), 0)
    return {
      totalOrders:    filtered.length,
      deliveredCount: delivered.length,
      cancelledCount: cancelled.length,
      pendingCount:   active.filter(o => o.status === 'Pending').length,
      grossRevenue,
      netSales:       totalSubtotal - totalDiscount,
      totalShipping,
      totalDiscount,
      avgOrderValue:  delivered.length ? Math.round(grossRevenue / delivered.length) : 0,
    }
  }, [filtered])

  const exportCSV = () => {
    const rows = [['Mã Đơn','Ngày','Khách Hàng','SĐT','Email','Tỉnh/TP','Quận/Huyện','Phường/Xã','Địa Chỉ','Trạng Thái','Nguồn','Sản Phẩm','SL','Tạm Tính (đ)','Giảm Giá (đ)','Phí Ship (đ)','Tổng (đ)','Mã Giảm Giá','Mã Vận Đơn','Ghi Chú']]
    filtered.forEach(o => {
      const c     = o.customer || {}
      const items = (o.items || []).map(i => `${(i.name || i.product?.name || '?')}${i.variantName?` — ${i.variantName}`:''} x${i.qty}`).join(' | ')
      const qty   = (o.items || []).reduce((s, i) => s + (i.qty || 0), 0)
      const date  = new Date(o.createdAt).toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
      rows.push([o.code, date, c.name||'', c.phone||'', c.email||'', c.provinceName||c.province||'', c.districtName||c.district||'', c.wardName||c.ward||'', c.address||'', STATUS_LABELS[o.status]||o.status, o.source||'website', items, qty, o.subtotal||o.total||0, o.discount||0, o.shippingFee||0, o.total||0, o.voucher||'', o.trackingCode||'', o.note||''])
    })
    const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `Hanapet_Orders_${dateFrom||'all'}_to_${dateTo||'now'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    document.cookie = 'sb-access-token=; max-age=0; path=/'
    document.cookie = 'sb-refresh-token=; max-age=0; path=/'
    router.replace('/admin/login')
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f2f5fb', fontFamily:FONT_T, fontSize:18, color:PRIMARY }}>
      ⏳ Đang tải đơn hàng...
    </div>
  )

  const selOrder = sel ? orders.find(o => o.id === sel) : null

  return (
    <div style={{ minHeight:'100vh', background:'#f2f5fb', fontFamily:FONT_B }}>
      {/* Top bar */}
      <div style={{ background:'#0d142e', padding:'0 24px', display:'flex', alignItems:'center', gap:14, height:56 }}>
        <button onClick={() => router.push('/admin')} style={{ background:'transparent', border:'none', color:'rgba(255,255,255,0.6)', cursor:'pointer', fontFamily:FONT_T, fontSize:13 }}>← Trang chính</button>
        <span style={{ fontFamily:FONT_T, fontSize:18, color:PRIMARY }}>📋 Đơn Hàng</span>
        <div style={{ flex:1 }} />
        <span style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>{user?.email}</span>
        <button onClick={signOut} style={{ background:PRIMARY, border:'none', borderRadius:8, padding:'5px 14px', color:'#fff', cursor:'pointer', fontFamily:FONT_T, fontSize:12 }}>🚪 Đăng xuất</button>
      </div>

      <div style={{ display:'flex', height:'calc(100vh - 56px)' }}>
        {/* Main panel */}
        <div style={{ flex:1, overflow:'auto', padding:24 }}>

          {/* Filters */}
          <div style={{ background:'#fff', borderRadius:16, padding:20, border:'2px solid #dbe2f1', marginBottom:20 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:12 }}>
              <div>
                <label style={LABEL}>Tìm kiếm (tên / SĐT / mã đơn)</label>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="VD: Nguyễn Văn A" style={INPUT} />
              </div>
              <div>
                <label style={LABEL}>Trạng thái</label>
                <select value={statusFilt} onChange={e => setStatusFilt(e.target.value)} style={INPUT}>
                  <option value="all">Tất cả trạng thái</option>
                  {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]||s}</option>)}
                </select>
              </div>
              <div>
                <label style={LABEL}>Từ ngày</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={INPUT} />
              </div>
              <div>
                <label style={LABEL}>Đến ngày</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={INPUT} />
              </div>
              <div>
                <label style={LABEL}>Nguồn</label>
                <select value={source} onChange={e => setSource(e.target.value)} style={INPUT}>
                  <option value="all">Tất cả nguồn</option>
                  <option value="website">Website</option>
                  <option value="facebook">Facebook</option>
                  <option value="zalo">Zalo</option>
                  <option value="manual">Thủ công</option>
                </select>
              </div>
              <div style={{ display:'flex', alignItems:'flex-end', gap:8 }}>
                <button onClick={exportCSV} style={{ flex:1, background:'#22C55E', color:'#fff', border:'none', borderRadius:10, padding:'9px 0', fontFamily:FONT_T, fontSize:13, cursor:'pointer' }}>📥 Xuất CSV</button>
                <button onClick={() => { setSearch(''); setStatusFilt('all'); setDateFrom(''); setDateTo(''); setSource('all') }} style={{ background:'#f2f5fb', color:'#5f6c8f', border:'2px solid #dbe2f1', borderRadius:10, padding:'9px 14px', fontFamily:FONT_T, fontSize:12, cursor:'pointer' }}>✕ Đặt lại</button>
              </div>
            </div>
          </div>

          {/* PnL Summary */}
          <div style={{ background:'#fff', borderRadius:16, padding:20, border:'2px solid #dbe2f1', marginBottom:20 }}>
            <div style={{ fontFamily:FONT_T, fontSize:14, color:'#5f6c8f', marginBottom:14 }}>
              📊 Tổng quan — {filtered.length} đơn {(dateFrom || dateTo) ? `(${dateFrom||'…'} → ${dateTo||'nay'})` : '(toàn thời gian)'}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:12 }}>
              {[
                { label:'Tổng Đơn Hàng',         value:fmtN(summary.totalOrders),    color:'#0d142e' },
                { label:'Đã Giao',             value:fmtN(summary.deliveredCount), color:'#22C55E' },
                { label:'Đã Huỷ',             value:fmtN(summary.cancelledCount), color:'#EF4444' },
                { label:'Chờ Xử Lý',               value:fmtN(summary.pendingCount),   color:'#F59E0B' },
                { label:'Doanh Thu Gộp',         value:fmt(summary.grossRevenue),    color:'#22C55E' },
                { label:'Doanh Thu Sản Phẩm (net)',   value:fmt(summary.netSales),        color:PRIMARY   },
                { label:'Tổng Phí Vận Chuyển',   value:fmt(summary.totalShipping),   color:'#3B82F6' },
                { label:'Tổng Giảm Giá',   value:fmt(summary.totalDiscount),   color:'#8B5CF6' },
                { label:'Giá Trị TB/Đơn',      value:fmt(summary.avgOrderValue),   color:'#06B6D4' },
              ].map(c => (
                <div key={c.label} style={{ background:'#f2f5fb', borderRadius:12, padding:'12px 14px', border:'1px solid #dbe2f1' }}>
                  <div style={{ fontFamily:FONT_T, fontSize:15, color:c.color, marginBottom:2 }}>{c.value}</div>
                  <div style={{ fontFamily:FONT_B, fontSize:11, color:'#5f6c8f' }}>{c.label}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop:14, fontFamily:FONT_B, fontSize:11, color:'#5f6c8f', background:'#f2f5fb', borderRadius:8, padding:'8px 12px', border:'1px solid #dbe2f1' }}>
              💡 <strong>Khi kê khai thuế (thuế GTGT / thuế TNCN):</strong> Dùng "Doanh Thu Sản Phẩm (net)" làm doanh thu chịu thuế. Phí vận chuyển chỉ là khoản thu hộ. Xuất CSV → mở bằng Excel → đối chiếu với kế toán của bạn.
            </div>
          </div>

          {/* Orders table */}
          <div style={{ background:'#fff', borderRadius:16, border:'2px solid #dbe2f1', overflow:'hidden' }}>
            <div style={{ display:'grid', gridTemplateColumns:'130px 1fr 130px 120px 110px 110px 80px', background:'#f2f5fb', borderBottom:'2px solid #dbe2f1' }}>
              {['Mã Đơn','Khách Hàng','Ngày','Trạng Thái','Tổng','Ship','Nguồn'].map(h => (
                <div key={h} style={{ padding:'10px 14px', fontFamily:FONT_T, fontSize:11, color:'#5f6c8f', fontWeight:700 }}>{h}</div>
              ))}
            </div>
            {filtered.length === 0
              ? <div style={{ textAlign:'center', padding:'48px 0', color:'#5f6c8f', fontFamily:FONT_T }}>Không có đơn nào khớp bộ lọc</div>
              : filtered.map(o => {
                  const isSelected = sel === o.id
                  return (
                    <div key={o.id} onClick={() => setSel(isSelected ? null : o.id)}
                      style={{ display:'grid', gridTemplateColumns:'130px 1fr 130px 120px 110px 110px 80px', borderBottom:'1px solid #dbe2f1', cursor:'pointer', background: isSelected ? '#f2f5fb' : '#fff' }}>
                      <div style={{ padding:'12px 14px', fontFamily:'monospace', fontSize:12, color:PRIMARY, fontWeight:700 }}>{o.code}</div>
                      <div style={{ padding:'12px 14px' }}>
                        <div style={{ fontFamily:FONT_B, fontSize:13, color:'#0d142e' }}>{o.customer?.name}</div>
                        <div style={{ fontFamily:FONT_B, fontSize:11, color:'#5f6c8f' }}>{o.customer?.phone}</div>
                      </div>
                      <div style={{ padding:'12px 14px', fontFamily:FONT_B, fontSize:11, color:'#5f6c8f' }}>{o.date}</div>
                      <div style={{ padding:'12px 14px' }}>
                        <span style={{ background:(STATUS_COLOR[o.status]||'#888')+'18', color:STATUS_COLOR[o.status]||'#888', border:`1px solid ${STATUS_COLOR[o.status]||'#888'}44`, borderRadius:20, padding:'2px 10px', fontSize:11, fontFamily:FONT_T, fontWeight:700 }}>{STATUS_LABELS[o.status]||o.status}</span>
                      </div>
                      <div style={{ padding:'12px 14px', fontFamily:FONT_T, fontSize:13, color:PRIMARY, fontWeight:700 }}>{fmt(o.total)}</div>
                      <div style={{ padding:'12px 14px', fontFamily:FONT_B, fontSize:12, color:'#3B82F6' }}>{fmt(o.shippingFee)}</div>
                      <div style={{ padding:'12px 14px', fontFamily:FONT_B, fontSize:11, color:'#5f6c8f' }}>{o.source||'website'}</div>
                    </div>
                  )
                })
            }
          </div>
        </div>

        {/* Right detail panel */}
        {selOrder && (
          <OrderDetail
            order={selOrder}
            onClose={() => setSel(null)}
            onUpdate={async (id, patch) => {
              await updateOrderDB(id, patch)
              setOrders(prev => prev.map(o => o.id === id ? { ...o, ...patch } : o))
            }}
          />
        )}
      </div>
    </div>
  )
}

// ── Order Detail Panel ────────────────────────────────────────────────────────
function OrderDetail({ order: o, onClose, onUpdate }) {
  const [tracking, setTracking] = useState(o.trackingCode || '')
  const [status,   setStatus]   = useState(o.status)
  const [note,     setNote]     = useState(o.note || '')
  const [source,   setSource]   = useState(o.source || 'website')
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)

  const STEPS   = ALL_STATUSES.filter(s => s !== 'Cancelled')
  const stepIdx = STEPS.indexOf(status)

  const save = async () => {
    setSaving(true)
    try {
      await onUpdate(o.id, { status, trackingCode: tracking, note, source })
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    } catch (e) { alert('Lỗi khi lưu: ' + e.message) }
    finally { setSaving(false) }
  }

  const advance = async () => {
    const next = STEPS[stepIdx + 1]
    if (!next) return
    try {
      await onUpdate(o.id, { status: next })
      setStatus(next)
    } catch (e) { alert('Lỗi cập nhật: ' + e.message) }
  }

  const printInvoice = () => {
    const c     = o.customer || {}
    const items = (o.items || []).map((it, i) => {
      const name  = (it.name || it.product?.name || '?') + (it.variantName ? ` — ${it.variantName}` : '')
      const price = it.price || it.product?.price || 0
      return `<tr><td>${i+1}</td><td>${name}</td><td>${it.qty}</td><td>${price.toLocaleString('vi-VN')}đ</td><td>${(price*it.qty).toLocaleString('vi-VN')}đ</td></tr>`
    }).join('')
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Hoá Đơn ${o.code}</title>
    <style>body{font-family:Arial,sans-serif;padding:32px;max-width:600px;margin:auto}h1{color:#1b295b}table{width:100%;border-collapse:collapse;margin:16px 0}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f2f5fb}.total{font-size:18px;font-weight:bold;color:#1b295b}.note{font-size:12px;color:#888;margin-top:24px}</style></head>
    <body><h1>🐾 Hanapet</h1>
    <p><strong>Đơn hàng:</strong> ${o.code} &nbsp; <strong>Ngày:</strong> ${o.date}</p>
    <p><strong>Khách hàng:</strong> ${c.name} · ${c.phone}</p>
    <p><strong>Địa chỉ:</strong> ${c.address}, ${c.wardName||''}, ${c.districtName||''}, ${c.provinceName||''}</p>
    ${o.trackingCode ? `<p><strong>Mã vận đơn:</strong> ${o.trackingCode}</p>` : ''}
    <table><thead><tr><th>#</th><th>Sản phẩm</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead><tbody>${items}</tbody></table>
    ${o.discount ? `<p>Tạm tính: ${(o.subtotal||o.total).toLocaleString('vi-VN')}đ</p><p>Giảm giá (${o.discPct}% ${o.voucher}): -${o.discount.toLocaleString('vi-VN')}đ</p>` : ''}
    ${o.shippingFee ? `<p>Phí vận chuyển: ${o.shippingFee.toLocaleString('vi-VN')}đ</p>` : ''}
    <p class="total">Tổng cộng: ${(o.total||0).toLocaleString('vi-VN')}đ</p>
    ${o.note ? `<p class="note">Ghi chú: ${o.note}</p>` : ''}
    <p class="note">Hanapet — Hà Nội · hana.pet.vn</p></body></html>`
    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
    w.print()
  }

  return (
    <div style={{ width:380, borderLeft:'2px solid #dbe2f1', background:'#fff', overflow:'auto', flexShrink:0, padding:20 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div style={{ fontFamily:FONT_T, fontSize:15, color:PRIMARY }}>{o.code}</div>
        <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#5f6c8f' }}>×</button>
      </div>

      {/* Status pipeline */}
      <div style={{ background:'#f2f5fb', borderRadius:12, padding:14, border:'2px solid #dbe2f1', marginBottom:16 }}>
        <div style={{ fontSize:10, fontFamily:FONT_T, color:'#5f6c8f', letterSpacing:1, marginBottom:10 }}>TRẠNG THÁI ĐƠN HÀNG</div>
        <div style={{ display:'flex', overflowX:'auto', gap:0 }}>
          {STEPS.map((s, i) => {
            const done   = STEPS.indexOf(status) >= i
            const active = status === s
            return (
              <div key={s} style={{ display:'flex', alignItems:'center', flexShrink:0 }}>
                <div style={{ textAlign:'center' }}>
                  <div style={{ width:24, height:24, borderRadius:12, background: active ? PRIMARY : done ? '#22C55E' : '#e0e0e0', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 3px', fontSize:10, color:'#fff', fontWeight:700 }}>{done ? (active ? '●' : '✓') : '○'}</div>
                  <div style={{ fontFamily:FONT_T, fontSize:8, color: active ? PRIMARY : done ? '#22C55E' : '#ccc', maxWidth:44, textAlign:'center', lineHeight:1.2 }}>{STATUS_LABELS[s]||s}</div>
                </div>
                {i < STEPS.length - 1 && <div style={{ width:16, height:2, background: STEPS.indexOf(status) > i ? '#22C55E' : '#e0e0e0', flexShrink:0, margin:'0 0 14px' }} />}
              </div>
            )
          })}
        </div>
        <div style={{ display:'flex', gap:8, marginTop:12, flexWrap:'wrap' }}>
          {stepIdx < STEPS.length - 1 && status !== 'Cancelled' && (
            <button onClick={advance} style={{ background:PRIMARY, color:'#fff', border:'none', borderRadius:8, padding:'7px 14px', fontFamily:FONT_T, fontSize:12, cursor:'pointer' }}>→ {STATUS_LABELS[STEPS[stepIdx + 1]]||STEPS[stepIdx + 1]}</button>
          )}
          {status !== 'Cancelled' && status !== 'Delivered' && (
            <button onClick={() => setStatus('Cancelled')} style={{ background:'#fdeeee', color:'#d64545', border:'1px solid #f0c4c4', borderRadius:8, padding:'7px 12px', fontFamily:FONT_T, fontSize:12, cursor:'pointer' }}>Huỷ đơn</button>
          )}
        </div>
      </div>

      <Section title="Khách Hàng">
        <Row label="Tên"    value={o.customer?.name} />
        <Row label="SĐT"   value={o.customer?.phone} />
        <Row label="Email"   value={o.customer?.email} />
        <Row label="Địa chỉ" value={[o.customer?.address, o.customer?.wardName, o.customer?.districtName, o.customer?.provinceName].filter(Boolean).join(', ')} />
      </Section>

      <Section title="💰 Tài Chính (cho báo cáo)">
        <Row label="Tạm tính"     value={fmt(o.subtotal || o.total)} />
        {o.discount > 0 && <Row label={`Giảm giá (${o.discPct}% / ${o.voucher})`} value={`-${fmt(o.discount)}`} valueColor="#8B5CF6" />}
        <Row label="Phí vận chuyển" value={fmt(o.shippingFee)} valueColor="#3B82F6" />
        <div style={{ borderTop:'2px solid #dbe2f1', marginTop:8, paddingTop:8, display:'flex', justifyContent:'space-between' }}>
          <span style={{ fontFamily:FONT_T, fontSize:14, color:'#0d142e' }}>Tổng cộng</span>
          <span style={{ fontFamily:FONT_T, fontSize:16, color:PRIMARY, fontWeight:700 }}>{fmt(o.total)}</span>
        </div>
        <div style={{ marginTop:6, fontFamily:FONT_B, fontSize:11, color:'#5f6c8f' }}>
          Doanh thu sản phẩm (chịu thuế): {fmt((o.subtotal || o.total) - (o.discount || 0))}
        </div>
      </Section>

      <Section title={`Sản Phẩm (${(o.items||[]).length})`}>
        {(o.items || []).map((it, i) => {
          const name  = (it.name || it.product?.name || `Sản phẩm ${i+1}`) + (it.variantName ? ` — ${it.variantName}` : '')
          const price = it.price || it.product?.price || 0
          return (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid #dbe2f1', fontFamily:FONT_B, fontSize:12 }}>
              <span style={{ color:'#0d142e' }}>{name} ×{it.qty}</span>
              <span style={{ color:PRIMARY, fontWeight:700 }}>{fmt(price * it.qty)}</span>
            </div>
          )
        })}
      </Section>

      <Section title="Vận Chuyển">
        <div style={{ marginBottom:10 }}>
          <label style={LABEL}>Mã Vận Đơn</label>
          <input value={tracking} onChange={e => setTracking(e.target.value)} placeholder="Mã vận đơn GHN..." style={INPUT} />
        </div>
        <div style={{ marginBottom:10 }}>
          <label style={LABEL}>Trạng Thái Đơn</label>
          <select value={status} onChange={e => setStatus(e.target.value)} style={INPUT}>
            {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]||s}</option>)}
          </select>
        </div>
        <div style={{ marginBottom:10 }}>
          <label style={LABEL}>Nguồn</label>
          <select value={source} onChange={e => setSource(e.target.value)} style={INPUT}>
            {['website','facebook','zalo','tiktok','phone','manual'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ marginBottom:10 }}>
          <label style={LABEL}>Ghi Chú</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} style={{ ...INPUT, resize:'vertical' }} />
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={save} disabled={saving} style={{ flex:1, background:PRIMARY, color:'#fff', border:'none', borderRadius:10, padding:'10px 0', fontFamily:FONT_T, fontSize:13, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saved ? '✅ Đã lưu!' : saving ? '⏳ Đang lưu...' : '💾 Lưu Thay Đổi'}
          </button>
          <button onClick={printInvoice} style={{ background:'#f2f5fb', color:'#5f6c8f', border:'2px solid #dbe2f1', borderRadius:10, padding:'10px 14px', fontFamily:FONT_T, fontSize:13, cursor:'pointer' }}>🖨 In</button>
        </div>
      </Section>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ fontSize:10, fontFamily:FONT_T, color:'#5f6c8f', letterSpacing:1, marginBottom:8 }}>{title.toUpperCase()}</div>
      <div style={{ background:'#f2f5fb', borderRadius:10, padding:12, border:'1px solid #dbe2f1' }}>{children}</div>
    </div>
  )
}

function Row({ label, value, valueColor }) {
  if (!value) return null
  return (
    <div style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', fontFamily:FONT_B, fontSize:12 }}>
      <span style={{ color:'#5f6c8f' }}>{label}</span>
      <span style={{ color: valueColor || '#0d142e', fontWeight:600, maxWidth:'60%', textAlign:'right' }}>{value}</span>
    </div>
  )
}

const INPUT = { width:'100%', padding:'8px 10px', borderRadius:8, border:'2px solid #dbe2f1', fontFamily:FONT_B, fontSize:13, boxSizing:'border-box', background:'#fff', outline:'none' }
const LABEL = { display:'block', fontSize:11, fontFamily:FONT_T, color:'#5f6c8f', marginBottom:4 }
