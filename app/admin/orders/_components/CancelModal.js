'use client'
// app/admin/orders/_components/CancelModal.js
// ─────────────────────────────────────────────────────────────────────
// F6 — Huỷ đơn + hoàn kho. Modal NÓI RÕ HẬU QUẢ, lý do huỷ ghi tự do
// (đã chốt Q3: không bắt chọn danh mục lý do). Việc ghi DB nằm ở
// trang cha (onCancel) — thứ tự restock TRƯỚC, đổi trạng thái SAU.
// ─────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { T } from '../../_lib/tokens'

export default function CancelModal({ order, onCancel, onClose }) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  if (!order) return null

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget && !busy) onClose() }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(13,20,46,.45)', zIndex: 8500,
        display: 'grid', placeItems: 'center', padding: 16,
      }}
    >
      <div style={{
        background: '#fff', borderRadius: 16, width: 'min(460px,94vw)',
        padding: '22px 24px', fontFamily: T.fontBody,
      }}>
        <div style={{ fontFamily: T.fontTitle, fontWeight: 800, fontSize: 17, color: T.navyDeep, marginBottom: 8 }}>
          Huỷ đơn {order.code}?
        </div>
        <div style={{ fontSize: 13, color: T.ink, lineHeight: 1.6, marginBottom: 10 }}>
          Kho sẽ được <b>cộng trả từng món</b> đúng mùi/phân loại (combo bung theo BOM).
          <b> Không hoàn tác được.</b>
        </div>

        {order.bigsellerExportedAt && (
          <div style={{
            background: T.badBg, border: '1px solid #f0c4c4', borderRadius: 9,
            padding: '9px 12px', fontSize: 12.5, color: T.bad, marginBottom: 10,
          }}>
            ⚠ Đơn này <b>ĐÃ xuất sang BigSeller</b> — nhớ huỷ cả bên BS,
            nếu không BS vẫn in và giao đơn này.
          </div>
        )}

        <div style={{ fontSize: 12, color: T.muted, marginBottom: 5 }}>Lý do huỷ (không bắt buộc — lưu vào ghi chú)</div>
        <input
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="VD: khách bom · hết mùi khách cần · trùng đơn…"
          style={{
            width: '100%', border: `1.5px solid ${T.line}`, borderRadius: 10,
            padding: '9px 12px', fontSize: 12.5, outline: 'none', boxSizing: 'border-box',
            fontFamily: T.fontBody, marginBottom: 16,
          }}
        />

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={() => !busy && onClose()}
            style={{
              padding: '9px 16px', borderRadius: 10, fontSize: 13, cursor: 'pointer',
              background: '#fff', color: T.navy, border: `1.5px solid ${T.line}`, fontFamily: T.fontTitle, fontWeight: 700,
            }}
          >Giữ đơn</button>
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              try { await onCancel(order, reason); onClose() }
              finally { setBusy(false) }
            }}
            style={{
              padding: '9px 16px', borderRadius: 10, fontSize: 13, cursor: 'pointer',
              background: T.bad, color: '#fff', border: 'none', fontFamily: T.fontTitle,
              fontWeight: 700, opacity: busy ? .6 : 1,
            }}
          >{busy ? 'Đang huỷ…' : 'Huỷ & hoàn kho'}</button>
        </div>
      </div>
    </div>
  )
}
