'use client'
// app/admin2/layout.js
// ─────────────────────────────────────────────────────────────────────
// Khung chung /admin2: topbar navy + sidebar kiểu Shopee Seller Center.
// Tải session + 5 công tắc MỘT LẦN → phát xuống mọi trang qua
// AdminContext { user, role, switches }. Trang con KHÔNG tự query lại.
// ─────────────────────────────────────────────────────────────────────
import { createContext, useContext, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { T } from './_lib/tokens'
import { can } from './_lib/roles'
import { ToastProvider } from './_components/Toast'

const AdminContext = createContext(null)
export const useAdmin = () => useContext(AdminContext)

// Sidebar: mục nào cần công tắc thì khai ở perm — thiếu công tắc là ẨN
const NAV = [
  { href: '/admin2',           label: 'Tổng quan',          icon: '📊' },
  { href: '/admin2/orders',    label: 'Đơn hàng',           icon: '📋' },
  { href: '/admin2/products',  label: 'Sản phẩm & Kho',     icon: '📦' },
  { href: '/admin2/marketing', label: 'Kênh Marketing',     icon: '🎯', perm: 'manage_vouchers' },
  { href: '/admin2/store',     label: 'Trang trí gian hàng', icon: '🎨', perm: 'edit_store' },
  { href: '/admin2/settings',  label: 'Cài đặt',            icon: '⚙️', ownerOnly: true },
]

export default function Admin2Layout({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const isLogin = pathname === '/admin2/login'
  const [ctx, setCtx] = useState(null)   // { user, role, switches }
  const [err, setErr] = useState('')

  useEffect(() => {
    if (isLogin) return
    let alive = true
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { router.replace('/admin2/login'); return }
        const role = session.user?.app_metadata?.role || ''
        if (!['owner', 'staff'].includes(role)) {
          router.replace('/admin2/login?err=norole'); return
        }
        const { data: rows, error } = await supabase
          .from('staff_permissions').select('key, allowed')
        if (error) throw error
        const switches = Object.fromEntries((rows || []).map(r => [r.key, r.allowed]))
        if (alive) setCtx({ user: session.user, role, switches })
      } catch (e) {
        if (alive) setErr('Không tải được phiên đăng nhập. Tải lại trang thử nhé.')
      }
    })()
    return () => { alive = false }
  }, [isLogin, router])

  if (isLogin) return <ToastProvider>{children}</ToastProvider>

  if (err) return <Center>{err}</Center>
  if (!ctx) return <Center>Đang tải…</Center>

  return (
    <AdminContext.Provider value={ctx}>
      <ToastProvider>
        <div style={{
          display: 'grid', gridTemplateColumns: '230px 1fr',
          gridTemplateRows: '56px 1fr', height: '100vh',
          fontFamily: T.fontBody, background: T.bg, fontSize: 13, color: T.ink,
        }}>
          {/* ── Topbar ── */}
          <header style={{
            gridColumn: '1 / 3', background: T.navy, color: '#fff',
            display: 'flex', alignItems: 'center', gap: 14, padding: '0 18px', zIndex: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: T.fontTitle, fontWeight: 800, fontSize: 16 }}>
              <span style={{
                width: 30, height: 30, borderRadius: 8, background: '#fff', color: T.navy,
                display: 'grid', placeItems: 'center', fontSize: 15,
              }}>🐾</span>
              Hanapet <span style={{ fontWeight: 600, fontSize: 11, opacity: .65, letterSpacing: .4 }}>SELLER CENTER</span>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 12, opacity: .8 }}>
                {ctx.user.email} · {ctx.role === 'owner' ? 'Chủ shop' : 'Nhân viên'}
              </span>
              <button
                onClick={async () => { await supabase.auth.signOut(); router.replace('/admin2/login') }}
                style={{
                  background: 'rgba(255,255,255,.1)', border: 'none', color: '#fff',
                  padding: '7px 12px', borderRadius: 9, fontSize: 12,
                }}
              >Đăng xuất</button>
            </div>
          </header>

          {/* ── Sidebar ── */}
          <aside style={{
            background: T.card, borderRight: `1px solid ${T.line}`,
            padding: 12, display: 'flex', flexDirection: 'column', gap: 3, overflowY: 'auto',
          }}>
            {NAV.filter(n => {
              if (n.ownerOnly) return ctx.role === 'owner'
              if (n.perm) return can(ctx, n.perm)
              return true
            }).map(n => {
              const on = n.href === '/admin2' ? pathname === '/admin2' : pathname.startsWith(n.href)
              return (
                <Link key={n.href} href={n.href} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 10, textDecoration: 'none',
                  background: on ? T.navy : 'transparent',
                  color: on ? '#fff' : T.ink, fontWeight: on ? 700 : 500,
                }}>
                  <span>{n.icon}</span>{n.label}
                </Link>
              )
            })}
            <div style={{
              marginTop: 'auto', background: T.navySoft, border: `1px dashed ${T.line}`,
              borderRadius: 10, padding: '10px 12px', fontSize: 11, color: T.muted, lineHeight: 1.5,
            }}>
              <b style={{ color: T.navy }}>Admin mới (bản chạy thử)</b><br />
              Bản cũ vẫn ở /admin nếu cần.
            </div>
          </aside>

          {/* ── Nội dung ── */}
          <main style={{ overflowY: 'auto', padding: 20 }}>{children}</main>
        </div>
      </ToastProvider>
    </AdminContext.Provider>
  )
}

function Center({ children }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'grid', placeItems: 'center',
      fontFamily: T.fontBody, color: T.muted, background: T.bg,
    }}>{children}</div>
  )
}
