'use client'
// app/admin2/_components/OrderBell.js
// ─────────────────────────────────────────────────────────────────────
// Chuông ở topbar (Phase 1 F1): nghe realtime bảng orders — có đơn MỚI
// chèn vào là chấm đỏ + số nhảy, bấm chuông thì về thẳng tab Chờ xác
// nhận và xoá số. Không đụng dữ liệu, chỉ đếm sự kiện INSERT.
// Cần bật replication cho bảng orders (supabase/PHASE-1-realtime.sql).
// ─────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { T } from '../_lib/tokens'

export default function OrderBell() {
  const router = useRouter()
  const [count, setCount] = useState(0)

  useEffect(() => {
    const ch = supabase
      .channel('admin2-order-bell')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        () => setCount(c => c + 1))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  return (
    <button
      onClick={() => { setCount(0); router.push('/admin2/orders?tab=pending') }}
      title={count ? `${count} đơn mới từ lúc mở trang` : 'Chưa có đơn mới'}
      style={{
        position: 'relative', width: 34, height: 34, borderRadius: 9,
        background: 'rgba(255,255,255,.1)', border: 'none', color: '#fff',
        fontSize: 15, cursor: 'pointer',
      }}
    >
      🔔
      {count > 0 && (
        <span style={{
          position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16,
          borderRadius: 9, background: T.bad, color: '#fff', fontSize: 10,
          fontWeight: 800, display: 'grid', placeItems: 'center', padding: '0 4px',
          border: `2px solid ${T.navy}`, fontFamily: T.fontBody,
        }}>{count > 9 ? '9+' : count}</span>
      )}
    </button>
  )
}
