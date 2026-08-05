'use client'
// app/admin/page.js — Tổng quan (placeholder tới Phase 3)
import { useAdmin } from './layout'
import { can } from './_lib/roles'
import { T } from './_lib/tokens'

export default function OverviewPage() {
  const ctx = useAdmin()
  return (
    <div>
      <h1 style={{ fontFamily: T.fontTitle, fontSize: 19, color: T.navyDeep, marginBottom: 4 }}>
        Tổng quan
      </h1>
      <p style={{ color: T.muted, marginBottom: 16 }}>
        Chào {ctx.role === 'owner' ? 'chủ shop' : 'bạn'} 👋 — số liệu chi tiết sẽ lên ở Phase 3.
      </p>
      {!can(ctx, 'see_revenue') && (
        <div style={{
          background: T.navySoft, border: `1px dashed ${T.line}`, borderRadius: 12,
          padding: '12px 16px', fontSize: 12.5, color: T.muted,
        }}>
          Doanh thu chỉ hiện khi chủ shop bật quyền xem.
        </div>
      )}
    </div>
  )
}
