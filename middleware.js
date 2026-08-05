// middleware.js — Phase 0 + CUTOVER 05/08/2026
// ─────────────────────────────────────────────────────────────────────
// Giữ NGUYÊN cách verify token cũ (đã đúng). /admin2:
//   1. Không có vai owner/staff → đá về login kèm ?err=norole
//   2. Staff vào đường link cần công tắc mà công tắc TẮT → đá về Tổng quan
// CUTOVER: /admin (và link con cũ) chuyển thẳng sang /admin2 tương ứng.
// Bản cũ dời về /admin-cu — chỉ dùng tạm cho Kho/Marketing/Trang trí
// tới khi Phase 2–4 chuyển xong, hành vi auth giữ như /admin ngày trước.
// ─────────────────────────────────────────────────────────────────────
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Đường link → công tắc (trùng với GATED_ROUTES trong _lib/roles.js)
const GATED = {
  '/admin2/marketing': 'manage_vouchers',
  '/admin2/store':     'edit_store',
}

export async function middleware(request) {
  const { pathname } = request.nextUrl
  if (!pathname.startsWith('/admin')) return NextResponse.next()

  // ── CUTOVER: mọi đường /admin cũ → /admin2 tương ứng ──
  if (!pathname.startsWith('/admin2') && !pathname.startsWith('/admin-cu')) {
    const MAP = { '/admin': '/admin2', '/admin/orders': '/admin2/orders', '/admin/login': '/admin2/login' }
    return NextResponse.redirect(new URL(MAP[pathname] || '/admin2', request.url))
  }

  const isAdmin2   = pathname.startsWith('/admin2')
  const loginPath  = isAdmin2 ? '/admin2/login' : '/admin-cu/login'
  const isLoginPage = pathname === loginPath
  const accessToken = request.cookies.get('sb-access-token')?.value

  // Không có token → về login (khỏi gọi mạng)
  if (!accessToken && !isLoginPage) {
    const loginUrl = new URL(loginPath, request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (accessToken) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    )
    const { data: { user } } = await supabase.auth.getUser(accessToken)

    // Token rởm/hết hạn → xoá cookie, về login
    if (!user && !isLoginPage) {
      const loginUrl = new URL(loginPath, request.url)
      loginUrl.searchParams.set('next', pathname)
      const res = NextResponse.redirect(loginUrl)
      res.cookies.set('sb-access-token', '', { maxAge: 0, path: '/' })
      return res
    }
    if (user && isLoginPage) {
      return NextResponse.redirect(new URL(isAdmin2 ? '/admin2' : '/admin-cu', request.url))
    }

    // ── Phần MỚI: chỉ áp cho /admin2 ──
    if (user && isAdmin2 && !isLoginPage) {
      const role = user.app_metadata?.role ?? ''

      if (!['owner', 'staff'].includes(role)) {
        const loginUrl = new URL('/admin2/login', request.url)
        loginUrl.searchParams.set('err', 'norole')
        const res = NextResponse.redirect(loginUrl)
        res.cookies.set('sb-access-token', '', { maxAge: 0, path: '/' })
        return res
      }

      if (role === 'staff') {
        const gate = Object.entries(GATED).find(([p]) => pathname.startsWith(p))
        if (gate) {
          // QUAN TRỌNG: phải mang token của user khi đọc bảng công tắc —
          // client anon trần sẽ bị RLS chặn (bảng chỉ cho owner/staff đọc)
          const authed = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            { global: { headers: { Authorization: `Bearer ${accessToken}` } } },
          )
          const { data } = await authed
            .from('staff_permissions')
            .select('allowed')
            .eq('key', gate[1])
            .maybeSingle()
          if (!data?.allowed) {
            return NextResponse.redirect(new URL('/admin2', request.url))
          }
        }
      }
    }
  }

  return NextResponse.next()
}

export const config = { matcher: ['/admin', '/admin/:path*', '/admin2/:path*', '/admin-cu/:path*'] }
