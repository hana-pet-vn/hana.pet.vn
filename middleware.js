// middleware.js — Phase 0 + CUTOVER HOÀN CHỈNH 05/08/2026
// ─────────────────────────────────────────────────────────────────────
// Admin MỚI giờ nằm thẳng ở /admin (đổi tên từ /admin2 theo yêu cầu
// chủ shop). Giữ NGUYÊN cách verify token cũ (đã đúng):
//   1. Không có vai owner/staff → đá về login kèm ?err=norole
//   2. Staff vào đường link cần công tắc mà công tắc TẮT → đá về Tổng quan
// /admin2 (link thời chạy song song) → tự chuyển về /admin tương ứng.
// /admin-cu = bản cũ, cầu tạm cho Kho/Marketing/Trang trí tới Phase 2–4,
// hành vi auth giữ như /admin ngày trước (chỉ cần token, không cần vai).
// ─────────────────────────────────────────────────────────────────────
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Đường link → công tắc (trùng với GATED_ROUTES trong _lib/roles.js)
const GATED = {
  '/admin/marketing': 'manage_vouchers',
  '/admin/store':     'edit_store',
}

export async function middleware(request) {
  const { pathname } = request.nextUrl
  if (!pathname.startsWith('/admin')) return NextResponse.next()

  // Link /admin2 cũ (ai lỡ lưu) → về /admin tương ứng
  if (pathname.startsWith('/admin2')) {
    return NextResponse.redirect(new URL(pathname.replace(/^\/admin2/, '/admin'), request.url))
  }

  const isOld      = pathname.startsWith('/admin-cu')
  const loginPath  = isOld ? '/admin-cu/login' : '/admin/login'
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
      return NextResponse.redirect(new URL(isOld ? '/admin-cu' : '/admin', request.url))
    }

    // ── Phân vai + công tắc: chỉ áp cho admin MỚI ──
    if (user && !isOld && !isLoginPage) {
      const role = user.app_metadata?.role ?? ''

      if (!['owner', 'staff'].includes(role)) {
        const loginUrl = new URL('/admin/login', request.url)
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
            return NextResponse.redirect(new URL('/admin', request.url))
          }
        }
      }
    }
  }

  return NextResponse.next()
}

export const config = { matcher: ['/admin', '/admin/:path*', '/admin2', '/admin2/:path*', '/admin-cu/:path*'] }
