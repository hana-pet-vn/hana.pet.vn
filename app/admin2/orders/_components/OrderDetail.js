'use client'
// app/admin2/orders/_components/OrderDetail.js
// ─────────────────────────────────────────────────────────────────────
// Chi tiết một đơn (F7): pipeline trạng thái như demo v2, thông tin
// khách + món hàng + tiền, ghi chú nội bộ (khách không thấy).
// Thao tác ghi (xác nhận / xuất BS / huỷ / menu "…") do trang cha đưa
// xuống qua props — component này không tự gọi Supabase để ghi.
// ─────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react'
import { T } from '../../_lib/tokens'
import { StatusBadge } from '../../_components/ui'
import { useToast } from '../../_components/Toast'
import { fmtMoney } from '../_lib/utils'
import { BsLine } from './OrderTable'

/* Pipeline gộp như demo: hai trạng thái vận chuyển chung một bước */
const PIPE = [
  { label: 'Chờ xác nhận',  statuses: ['Pending'] },
  { label: 'Đã xác nhận',   statuses: ['Confirmed'] },
  { label: 'Đang đóng gói', statuses: ['Packing'] },
  { label: 'Đang giao',     statuses: ['Handed to GHN', 'In Transit', 'Shipped'] },
  { label: 'Đã giao',       statuses: ['Delivered'] },
]

function MenuItem({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={e => { e.currentTarget.style.background = T.navySoft }}
      onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
      style={{
        display: 'block', width: '100%', textAlign: 'left', background: '#fff',
        border: 'none', borderBottom: `1px solid #edf0f8`, padding: '10px 14px',
        fontSize: 12.5, fontFamily: T.fontBody, color: T.ink, cursor: 'pointer',
      }}
    >{children}</button>
  )
}

const panel = {
  background: T.card, border: `1px solid ${T.line}`, borderRadius: T.radius,
  boxShadow: T.shadow, overflow: 'hidden',
}
const panelH = {
  padding: '13px 16px', borderBottom: `1px solid ${T.line}`,
  fontFamily: T.fontTitle, fontWeight: 700, fontSize: 13, color: T.navyDeep,
  display: 'flex', alignItems: 'center', gap: 8,
}

export default function OrderDetail({
  order: o, productMap, onBack, onConfirm, onSaveNote,
  onExport,      // F4 — mở luồng xuất BS cho đơn này
  onCancel,      // F6 — mở modal huỷ + hoàn kho
  onRevert,      // F7 menu "…" — trả về Chờ xác nhận (qua ConfirmModal ở cha)
  onCreateGHN,   // F8 — CHỈ owner mới được truyền xuống; staff = null → ẩn
}) {
  const toast = useToast()
  const [note, setNote] = useState(o.note || '')
  const [savingNote, setSavingNote] = useState(false)
  const [menu, setMenu] = useState(false)
  const menuRef = useRef(null)
  useEffect(() => {
    const close = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const copy = async (label, text) => {
    try { await navigator.clipboard.writeText(text || ''); toast.ok(`📋 Đã copy ${label}`) }
    catch { toast.err('Trình duyệt chặn copy — bôi đen chép tay giúp.') }
    setMenu(false)
  }
  const stepIdx = PIPE.findIndex(s => s.statuses.includes(o.status))
  const c = o.customer || {}
  const addr = [c.address, c.wardName || c.ward, c.districtName || c.district, c.provinceName || c.province]
    .filter(Boolean).join(', ')

  return (
    <div>
      <button onClick={onBack} style={{
        border: 'none', background: T.navySoft, color: T.navy, fontFamily: T.fontTitle,
        fontWeight: 700, fontSize: 12.5, borderRadius: 9, padding: '8px 14px',
        marginBottom: 14, cursor: 'pointer',
      }}>← Tất cả đơn hàng</button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <h1 style={{ fontFamily: T.fontTitle, fontWeight: 800, fontSize: 19, color: T.navyDeep, margin: 0 }}>
          Đơn {o.code}
        </h1>
        <StatusBadge status={o.status} />
        <span style={{ fontSize: 12, color: T.muted }}>{o.date} · nguồn: {o.source || 'website'}</span>
      </div>

      {/* ── Trạng thái ── */}
      <div style={panel}>
        <div style={panelH}>Trạng thái đơn hàng</div>
        <div style={{ padding: 16 }}>
          {o.status === 'Cancelled' ? (
            <div style={{ color: T.bad, fontFamily: T.fontTitle, fontWeight: 700 }}>
              ✕ Đơn đã huỷ — kho đã cộng trả từng món
            </div>
          ) : o.status === 'Return Check' ? (
            <div style={{
              background: T.warnBg, border: '1px solid #f3d9a4', borderRadius: 9,
              padding: '9px 13px', fontSize: 12.5, color: '#92400e',
            }}>
              ↩ <b>Hoàn hàng — chờ kiểm.</b> BigSeller báo "Trả hàng &amp; Hoàn tiền".
              Kho CHƯA tự cộng trả — nhận hàng, kiểm xong mới xử lý kho tay.
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-start', overflowX: 'auto', padding: '6px 2px 2px' }}>
              {PIPE.map((s, i) => {
                const done = i < stepIdx, now = i === stepIdx
                return (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    <div>
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%', display: 'grid', placeItems: 'center',
                        fontSize: 12, fontWeight: 700, color: '#fff',
                        background: done ? T.ok : now ? T.navy : '#d7ddec', margin: '0 auto 5px',
                      }}>{done ? '✓' : now ? '●' : '○'}</div>
                      <div style={{
                        fontFamily: T.fontTitle, fontSize: 10.5, fontWeight: 700,
                        color: done ? T.ok : now ? T.navy : T.muted,
                        maxWidth: 76, textAlign: 'center', lineHeight: 1.25,
                      }}>{s.label}</div>
                    </div>
                    {i < PIPE.length - 1 && (
                      <div style={{ width: 34, height: 2.5, background: done ? T.ok : '#d7ddec', margin: '14px 4px 0', flexShrink: 0 }} />
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {o.trackingCode && (
            <div style={{
              marginTop: 12, padding: '9px 13px', background: T.okBg,
              border: '1px solid #bbe8c8', borderRadius: 9, fontSize: 12.5, color: '#166534',
            }}>
              ✅ Vận đơn: <b>{o.shipping ? o.shipping + ' · ' : ''}{o.trackingCode}</b> — tạo bên BigSeller, cập nhật qua đối soát mỗi chiều
            </div>
          )}
          <BsLine order={o} />

          <div style={{ display: 'flex', gap: 9, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            {o.status === 'Pending' && (
              <button onClick={() => onConfirm([o])} style={{
                background: T.navy, color: '#fff', border: 'none', borderRadius: 9,
                padding: '9px 15px', fontFamily: T.fontTitle, fontWeight: 700, fontSize: 12.5, cursor: 'pointer',
              }}>✓ Xác nhận đơn</button>
            )}
            {o.status === 'Confirmed' && !o.bigsellerExportedAt && onExport && (
              <button onClick={() => onExport([o])} style={{
                background: T.navy, color: '#fff', border: 'none', borderRadius: 9,
                padding: '9px 15px', fontFamily: T.fontTitle, fontWeight: 700, fontSize: 12.5, cursor: 'pointer',
              }}>📤 Xuất BigSeller</button>
            )}
            {!['Delivered', 'Cancelled', 'Return Check'].includes(o.status) && onCancel && (
              <button onClick={() => onCancel(o)} style={{
                background: T.badBg, color: T.bad, border: '1px solid #f0c4c4', borderRadius: 9,
                padding: '9px 15px', fontFamily: T.fontTitle, fontWeight: 700, fontSize: 12.5, cursor: 'pointer',
              }}>Huỷ đơn (hoàn kho)</button>
            )}

            {/* Menu "…" — thao tác hiếm dùng */}
            <div ref={menuRef} style={{ position: 'relative', marginLeft: 'auto' }}>
              <button onClick={() => setMenu(m => !m)} style={{
                background: '#fff', color: T.navy, border: `1.5px solid ${T.line}`, borderRadius: 9,
                padding: '9px 13px', fontFamily: T.fontTitle, fontWeight: 800, fontSize: 13, cursor: 'pointer',
              }}>…</button>
              {menu && (
                <div style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 30,
                  background: '#fff', border: `1px solid ${T.line}`, borderRadius: 10,
                  boxShadow: '0 8px 24px rgba(13,20,46,.15)', minWidth: 220, overflow: 'hidden',
                }}>
                  {o.status === 'Confirmed' && onRevert && (
                    <MenuItem onClick={() => { setMenu(false); onRevert(o) }}>
                      ↺ Trả về Chờ xác nhận
                    </MenuItem>
                  )}
                  <MenuItem onClick={() => copy('địa chỉ', addr)}>📋 Copy địa chỉ</MenuItem>
                  <MenuItem onClick={() => copy('SĐT', c.phone)}>📋 Copy SĐT</MenuItem>
                  {onCreateGHN && !o.trackingCode && !['Delivered', 'Cancelled', 'Return Check'].includes(o.status) && (
                    <MenuItem onClick={() => { setMenu(false); onCreateGHN(o) }}>
                      🚚 Tạo vận đơn GHN từ web <span style={{ color: T.muted, fontSize: 10.5 }}>(chủ shop)</span>
                    </MenuItem>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Khách + món hàng ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
        <div style={panel}>
          <div style={panelH}>👤 Khách hàng</div>
          <div style={{ padding: '14px 16px', fontSize: 12.5, lineHeight: 1.9 }}>
            <div><span style={{ color: T.muted, display: 'inline-block', minWidth: 96 }}>Họ tên</span><b style={{ color: T.navyDeep }}>{c.name || '—'}</b></div>
            <div><span style={{ color: T.muted, display: 'inline-block', minWidth: 96 }}>Điện thoại</span><b style={{ color: T.navyDeep }}>{c.phone || '—'}</b></div>
            {c.email && <div><span style={{ color: T.muted, display: 'inline-block', minWidth: 96 }}>Email</span>{c.email}</div>}
            <div><span style={{ color: T.muted, display: 'inline-block', minWidth: 96 }}>Địa chỉ</span>{addr || '—'}</div>
            <div><span style={{ color: T.muted, display: 'inline-block', minWidth: 96 }}>Đặt lúc</span>{o.date}</div>
          </div>
        </div>

        <div style={panel}>
          <div style={panelH}>🧾 Món hàng</div>
          <div style={{ padding: '8px 16px 14px' }}>
            {(o.items || []).map((it, i) => {
              const img = productMap?.[it.productId]?.img || ''
              const label = (it.name || `Sản phẩm ${i + 1}`) + (it.variantName ? ` — ${it.variantName}` : '')
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '7px 0', borderBottom: '1px solid #edf0f8',
                }}>
                  {img
                    ? <img src={img} alt="" style={{ width: 36, height: 36, borderRadius: 9, objectFit: 'cover', background: T.navySoft, flexShrink: 0 }} />
                    : <div style={{ width: 36, height: 36, borderRadius: 9, background: T.navySoft, display: 'grid', placeItems: 'center', fontSize: 16, flexShrink: 0 }}>📦</div>}
                  <span style={{ fontWeight: 600, fontSize: 12.5, flex: 1 }}>{label} ×{it.qty}</span>
                  <span style={{ fontFamily: T.fontTitle, fontWeight: 700, color: T.navyDeep, whiteSpace: 'nowrap' }}>
                    {fmtMoney((it.price || 0) * (it.qty || 0))}
                  </span>
                </div>
              )
            })}
            <div style={{ fontSize: 12.5, paddingTop: 10, lineHeight: 1.9 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: T.muted }}>Tạm tính</span><span>{fmtMoney(o.subtotal || o.total)}</span>
              </div>
              {o.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: T.pack }}>
                  <span>Giảm giá{o.voucher ? ` (${o.voucher})` : ''}</span><span>−{fmtMoney(o.discount)}</span>
                </div>
              )}
              {o.shippingFee > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: T.muted }}>Phí vận chuyển</span><span>{fmtMoney(o.shippingFee)}</span>
                </div>
              )}
              <div style={{
                display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${T.line}`,
                marginTop: 6, paddingTop: 8,
              }}>
                <span style={{ color: T.muted }}>Tổng (COD)</span>
                <span style={{ fontFamily: T.fontTitle, fontWeight: 800, fontSize: 16, color: T.navyDeep }}>{fmtMoney(o.total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Ghi chú nội bộ ── */}
      <div style={{ ...panel, marginTop: 14 }}>
        <div style={panelH}>
          📝 Ghi chú nội bộ
          <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: 11, color: T.muted }}>khách không nhìn thấy</span>
        </div>
        <div style={{ padding: '14px 16px' }}>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="VD: 31/7 gọi 2 lần chưa nghe · khách dặn giao giờ hành chính…"
            style={{
              width: '100%', border: `1.5px solid ${T.line}`, borderRadius: 10,
              padding: '10px 12px', fontSize: 12.5, minHeight: 64, resize: 'vertical',
              outline: 'none', fontFamily: T.fontBody, boxSizing: 'border-box',
            }}
          />
          <div style={{ marginTop: 9, textAlign: 'right' }}>
            <button
              disabled={savingNote}
              onClick={async () => {
                setSavingNote(true)
                try { await onSaveNote(o, note) } finally { setSavingNote(false) }
              }}
              style={{
                background: T.navy, color: '#fff', border: 'none', borderRadius: 8,
                padding: '7px 13px', fontFamily: T.fontTitle, fontWeight: 700, fontSize: 12,
                cursor: 'pointer', opacity: savingNote ? .6 : 1,
              }}
            >{savingNote ? 'Đang lưu…' : 'Lưu ghi chú'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
