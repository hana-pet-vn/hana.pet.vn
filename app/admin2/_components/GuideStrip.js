'use client'
// app/admin2/_components/GuideStrip.js
// ─────────────────────────────────────────────────────────────────────
// "Bảng quy trình gắn tường" (Phase 1 F0): bản rút gọn LUONG-VAN-HANH
// nằm đầu tab, mỗi bước BẤM ĐƯỢC để nhảy tới thao tác thật.
// Nội dung khai báo MỘT chỗ (GUIDES bên dưới) — sửa quy trình sửa 1 nơi.
// Nhớ trạng thái thu gọn theo tài khoản (localStorage theo email).
// ─────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { T } from '../_lib/tokens'

// Nội dung quy trình — nguồn duy nhất, tab Đơn hàng và tab Kho cùng đọc từ đây
export const GUIDES = {
  orders: {
    title: '📋 Quy trình đơn hàng mỗi ngày',
    steps: [
      { icon: '📞', text: 'Gọi chốt đơn mới',            action: 'goto-pending' },
      { icon: '📤', text: 'Mỗi sáng xuất BigSeller',      action: 'goto-confirmed' },
      { icon: '🚚', text: 'In & giao làm bên BS (tự động)', action: null },
      { icon: '🔄', text: 'Mỗi chiều đối soát',           action: 'goto-reconcile' },
      { icon: '❌', text: 'Huỷ đơn → nhớ huỷ cả bên BS',  action: null },
    ],
  },
  inventory: {
    title: '📦 Quy trình kho',
    steps: [
      { icon: '📥', text: 'BigSeller là sổ cái — web chỉ là bản sao', action: null },
      { icon: '🔄', text: 'Đồng bộ tồn kho bằng file BS',            action: 'goto-sync' },
      { icon: '⚠️', text: 'Sắp hết hàng → báo đỏ, đặt thêm',          action: null },
    ],
  },
}

export default function GuideStrip({ guide = 'orders', userEmail = '', onAction }) {
  const g = GUIDES[guide]
  const storageKey = `hp-guide-${guide}-${userEmail}`
  const [open, setOpen] = useState(true) // nhân viên mới mặc định MỞ

  useEffect(() => {
    try { if (localStorage.getItem(storageKey) === '0') setOpen(false) } catch {}
  }, [storageKey])

  const toggle = () => {
    setOpen(o => {
      try { localStorage.setItem(storageKey, o ? '0' : '1') } catch {}
      return !o
    })
  }

  if (!g) return null

  return (
    <div style={{
      background: T.navySoft, border: `1px dashed ${T.line}`, borderRadius: T.radius,
      padding: open ? '12px 16px' : '8px 16px', marginBottom: 14, fontFamily: T.fontBody,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ fontFamily: T.fontTitle, fontWeight: 700, fontSize: 13, color: T.navyDeep }}>
          {g.title}
        </div>
        <button onClick={toggle} style={{
          marginLeft: 'auto', background: 'none', border: 'none',
          color: T.muted, fontSize: 12,
        }}>
          {open ? 'Thu gọn ▲' : 'Mở ra ▼'}
        </button>
      </div>

      {open && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          {g.steps.map((s, i) => (
            <button
              key={i}
              onClick={() => s.action && onAction?.(s.action)}
              disabled={!s.action}
              title={s.action ? 'Bấm để nhảy tới thao tác này' : ''}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 12px', borderRadius: 10, fontSize: 12.5,
                background: '#fff', border: `1.5px solid ${s.action ? T.navy : T.line}`,
                color: s.action ? T.navy : T.muted,
                cursor: s.action ? 'pointer' : 'default',
              }}
            >
              <span style={{
                width: 18, height: 18, borderRadius: '50%', background: T.navy, color: '#fff',
                fontSize: 10.5, fontWeight: 800, display: 'grid', placeItems: 'center',
              }}>{i + 1}</span>
              {s.icon} {s.text}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
