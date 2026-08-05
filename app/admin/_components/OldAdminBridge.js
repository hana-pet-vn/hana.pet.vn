'use client'
// app/admin/_components/OldAdminBridge.js
// ─────────────────────────────────────────────────────────────────────
// Cầu tạm sau CUTOVER (05/08/2026): phần nào CHƯA chuyển sang giao diện
// mới (Kho / Marketing / Trang trí — Phase 2–4) thì trang mới hiện thẻ
// này, một bấm là sang bản cũ /admin-cu làm việc bình thường.
// Chuyển xong phase nào thì trang đó thay thẻ này bằng UI thật.
// ─────────────────────────────────────────────────────────────────────
import { T } from '../_lib/tokens'

export default function OldAdminBridge({ title, phase, note }) {
  return (
    <div>
      <h1 style={{ fontFamily: T.fontTitle, fontWeight: 800, fontSize: 19, color: T.navyDeep, marginBottom: 4 }}>
        {title}
      </h1>
      <p style={{ color: T.muted, fontSize: 12.5, marginBottom: 16 }}>
        Giao diện mới cho phần này lên ở {phase}.{note ? ` ${note}` : ''}
      </p>
      <div style={{
        background: T.card, border: `1px solid ${T.line}`, borderRadius: T.radius,
        boxShadow: T.shadow, padding: 20, maxWidth: 560, fontSize: 13, lineHeight: 1.7,
      }}>
        Trong lúc chờ, mọi thao tác của phần này vẫn làm ở <b>bản admin cũ</b> —
        dữ liệu là MỘT, làm bên nào cũng ăn xuống cùng chỗ.
        <div style={{ marginTop: 14 }}>
          <a href="/admin-cu" style={{
            display: 'inline-block', background: T.navy, color: '#fff',
            borderRadius: 9, padding: '10px 18px', fontFamily: T.fontTitle,
            fontWeight: 700, fontSize: 12.5, textDecoration: 'none',
          }}>↗ Mở bản cũ (/admin-cu)</a>
        </div>
      </div>
    </div>
  )
}
