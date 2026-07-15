// middleware.js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function middleware(request) {
  const { pathname } = request.nextUrl
  if (!pathname.startsWith('/admin')) return NextResponse.next()

  const isLoginPage = pathname === '/admin/login'
  const accessToken = request.cookies.get('sb-access-token')?.value

  // No token at all → straight to login (skip network call)
  if (!accessToken && !isLoginPage) {
    const loginUrl = new URL('/admin/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Token present → actually VERIFY it with Supabase (a fake cookie must not pass)
  if (accessToken) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    )
    const { data: { user } } = await supabase.auth.getUser(accessToken)

    if (!user && !isLoginPage) {
      // Invalid/expired token → clear it and send to login
      const loginUrl = new URL('/admin/login', request.url)
      loginUrl.searchParams.set('next', pathname)
      const res = NextResponse.redirect(loginUrl)
      res.cookies.set('sb-access-token', '', { maxAge: 0, path: '/' })
      return res
    }
    if (user && isLoginPage) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  return NextResponse.next()
}

export const config = { matcher: ['/admin/:path*'] }
