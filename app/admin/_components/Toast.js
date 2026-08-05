'use client'
// app/admin/_components/Toast.js
// ─────────────────────────────────────────────────────────────────────
// Thay thế alert(): thông báo nhỏ góc phải dưới, tự biến mất sau 3.5s.
// Cách dùng ở bất kỳ component nào trong /admin:
//   import { useToast } from '../_components/Toast'
//   const toast = useToast()
//   toast.ok('✓ HP-1024 — đã xác nhận')
//   toast.err('Không lưu được, thử lại')
//   toast.warn('2 đơn bị bỏ qua vì chưa chốt')
// ─────────────────────────────────────────────────────────────────────
import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { T } from '../_lib/tokens'

const ToastCtx = createContext(null)
export const useToast = () => useContext(ToastCtx)

const COLORS = {
  ok:   { bg: T.okBg,   bd: T.ok,   tx: T.ok },
  err:  { bg: T.badBg,  bd: T.bad,  tx: T.bad },
  warn: { bg: T.warnBg, bd: T.warn, tx: T.warn },
  info: { bg: T.infoBg, bd: T.info, tx: T.info },
}

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const idRef = useRef(0)

  const push = useCallback((type, msg, ms = 3500) => {
    const id = ++idRef.current
    setItems(list => [...list, { id, type, msg }])
    setTimeout(() => setItems(list => list.filter(t => t.id !== id)), ms)
  }, [])

  const api = {
    ok:   (m, ms) => push('ok', m, ms),
    err:  (m, ms) => push('err', m, ms ?? 5000), // lỗi cho đọc lâu hơn
    warn: (m, ms) => push('warn', m, ms ?? 5000),
    info: (m, ms) => push('info', m, ms),
  }

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div style={{
        position: 'fixed', right: 16, bottom: 16, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360,
      }}>
        {items.map(t => {
          const c = COLORS[t.type] || COLORS.info
          return (
            <div key={t.id} style={{
              background: c.bg, border: `1.5px solid ${c.bd}`, color: c.tx,
              borderRadius: T.radius, padding: '10px 14px', fontSize: 13,
              fontFamily: T.fontBody, boxShadow: T.shadow, lineHeight: 1.45,
            }}>
              {t.msg}
            </div>
          )
        })}
      </div>
    </ToastCtx.Provider>
  )
}
