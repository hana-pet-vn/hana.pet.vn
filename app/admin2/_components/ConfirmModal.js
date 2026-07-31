'use client'
// app/admin2/_components/ConfirmModal.js
// ─────────────────────────────────────────────────────────────────────
// Thay thế confirm(): hộp xác nhận NÓI RÕ HẬU QUẢ trước khi làm việc
// nguy hiểm. Quy ước: mọi thao tác phá huỷ (huỷ đơn, lưu trữ SP, xuất
// lại file...) PHẢI đi qua đây, không dùng confirm() của trình duyệt.
//
// Cách dùng:
//   const [modal, setModal] = useState(null)
//   setModal({
//     title: 'Huỷ đơn HP-1024?',
//     body: 'Đơn sẽ chuyển sang Đã huỷ và hoàn kho. Nhớ huỷ cả bên BigSeller.',
//     danger: true, confirmText: 'Huỷ đơn',
//     onConfirm: async () => { ... },
//   })
//   ...
//   <ConfirmModal modal={modal} onClose={() => setModal(null)} />
// ─────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { T } from '../_lib/tokens'

export default function ConfirmModal({ modal, onClose }) {
  const [busy, setBusy] = useState(false)
  if (!modal) return null

  const handleConfirm = async () => {
    if (busy) return
    setBusy(true)
    try {
      await modal.onConfirm?.()
      onClose?.()
    } finally {
      setBusy(false)
    }
  }

  const mainColor = modal.danger ? T.bad : T.navy

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget && !busy) onClose?.() }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(13,20,46,.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9000, padding: 16,
      }}
    >
      <div style={{
        background: '#fff', borderRadius: 16, padding: '22px 24px',
        width: '100%', maxWidth: 420, fontFamily: T.fontBody,
        boxShadow: '0 10px 50px rgba(13,20,46,.25)',
      }}>
        <div style={{
          fontFamily: T.fontTitle, fontWeight: 800, fontSize: 17,
          color: T.navyDeep, marginBottom: 8,
        }}>
          {modal.title}
        </div>

        <div style={{ fontSize: 13.5, color: T.ink, lineHeight: 1.6, marginBottom: 18 }}>
          {modal.body}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={() => !busy && onClose?.()}
            style={{
              padding: '9px 16px', borderRadius: 10, fontSize: 13,
              background: '#fff', color: T.navy, border: `1.5px solid ${T.line}`,
            }}
          >
            {modal.cancelText || 'Thôi, quay lại'}
          </button>
          <button
            onClick={handleConfirm}
            disabled={busy}
            style={{
              padding: '9px 16px', borderRadius: 10, fontSize: 13,
              background: mainColor, color: '#fff', border: 'none',
              opacity: busy ? 0.6 : 1, fontWeight: 600,
            }}
          >
            {busy ? 'Đang làm…' : (modal.confirmText || 'Đồng ý')}
          </button>
        </div>
      </div>
    </div>
  )
}
