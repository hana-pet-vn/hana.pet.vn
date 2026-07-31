'use client'
// app/admin2/login/page.js
// Port từ /admin/login (logic cookie GIỮ NGUYÊN — middleware đọc cookie này).
// Thêm: đọc ?err=norole để giải thích vì sao bị đá ra (tài khoản chưa gán vai).
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { T } from '../_lib/tokens'

export default function Admin2LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  useEffect(() => {
    const err = new URLSearchParams(window.location.search).get('err')
    if (err === 'norole') {
      setError('Tài khoản này chưa được cấp quyền vào admin. Liên hệ chủ shop nhé.')
    }
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      // Ghi cookie thủ công để middleware đọc được (giữ nguyên cách cũ)
      const { access_token, refresh_token } = data.session
      document.cookie = `sb-access-token=${access_token}; path=/; max-age=3600; SameSite=Lax`
      document.cookie = `sb-refresh-token=${refresh_token}; path=/; max-age=86400; SameSite=Lax`

      await new Promise(r => setTimeout(r, 100))
      const next = new URLSearchParams(window.location.search).get('next') || '/admin2'
      router.replace(next)
    } catch {
      setError('Sai email hoặc mật khẩu.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: 12,
    border: `2px solid ${T.line}`, fontSize: 14, boxSizing: 'border-box', outline: 'none',
  }
  const labelStyle = { display: 'block', fontSize: 13, color: T.muted, marginBottom: 6 }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f2f5fb', fontFamily: T.fontBody,
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: '40px 36px',
        width: '100%', maxWidth: 380, boxShadow: '0 4px 40px rgba(27,41,91,0.12)',
        border: `2px solid ${T.line}`,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🐾</div>
          <div style={{ fontFamily: T.fontTitle, fontSize: 22, color: T.navy }}>Hanapet Admin</div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>Đăng nhập để quản lý cửa hàng</div>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              required autoComplete="email" style={inputStyle} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Mật khẩu</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              required autoComplete="current-password" style={inputStyle} />
          </div>

          {error && (
            <div style={{
              background: '#fdeeee', color: '#c0392b', borderRadius: 10,
              padding: '10px 14px', fontSize: 13, marginBottom: 16, border: '1px solid #f0c4c4',
            }}>{error}</div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', background: T.navy, color: '#fff', border: 'none',
            borderRadius: 12, padding: '13px 0', fontFamily: T.fontTitle, fontSize: 16,
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
          }}>
            {loading ? '⏳ Đang đăng nhập...' : '🔒 Đăng Nhập'}
          </button>
        </form>

        <div style={{ textAlign: 'center', fontSize: 11, color: '#ccc', marginTop: 20 }}>
          Mật khẩu được bảo mật qua Supabase Auth
        </div>
      </div>
    </div>
  )
}
