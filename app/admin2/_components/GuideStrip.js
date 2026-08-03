'use client'
// app/admin2/_components/GuideStrip.js
// ─────────────────────────────────────────────────────────────────────
// "Bảng quy trình gắn tường" (Phase 1 F0): bản rút gọn LUONG-VAN-HANH
// nằm đầu tab, mỗi bước BẤM ĐƯỢC để nhảy tới thao tác thật.
// Nội dung + bố cục lấy theo demo-admin-hanapet-v2.html ĐÃ DUYỆT.
// Nội dung khai báo MỘT chỗ (GUIDES bên dưới) — sửa quy trình sửa 1 nơi.
// Nhớ trạng thái thu gọn theo tài khoản (localStorage theo email);
// nhân viên mới mặc định MỞ.
// ─────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { T } from '../_lib/tokens'

// Nội dung quy trình — nguồn duy nhất, tab Đơn hàng và tab Kho cùng đọc từ đây.
// Mỗi bước: { n, head, desc, action?, lbl?, auto? }
//   n      = số thứ tự hiện trong vòng tròn ('✦' + auto:true = bước tự động)
//   action = mã lệnh trang chủ quản xử lý (onAction), có action thì bấm được
export const GUIDES = {
  orders: {
    title: '📖 Quy trình đơn hàng — dán tường',
    steps: [
      {
        n: '1', head: 'Đơn mới → gọi chốt',
        desc: <>Chốt xong bấm <b>✓ Xác nhận</b>. Khách không nghe máy → ghi vào Ghi chú của đơn.</>,
        action: 'goto-pending', lbl: 'Tới đơn chờ ›',
      },
      {
        n: '2', head: 'Mỗi SÁNG: xuất BigSeller',
        desc: <>Tab <b>Đã xác nhận</b> → tick hết → <b>📤 Xuất BigSeller</b> → nhập file vào BS. Đơn không Xác nhận = KHÔNG được giao.</>,
        action: 'goto-confirmed', lbl: 'Tới tab Đã xác nhận ›',
      },
      {
        n: '✦', auto: true, head: 'In tem + giao: KHÔNG làm ở đây',
        desc: <>In tem, vận đơn: bên BigSeller. Trạng thái giao về web qua file mỗi chiều (bước 3).</>,
      },
      {
        n: '3', head: 'Mỗi CHIỀU: nhận trạng thái về',
        desc: <>Bên BS xuất file <b>trạng thái đơn</b> (khoảng 7 ngày gần nhất, xuất ĐỦ các trang) → bấm <b>🔄 Đối soát</b> → xem bảng thay đổi → Áp dụng. Đây là đường cập nhật CHÍNH.</>,
        action: 'goto-reconcile', lbl: 'Mở đối soát ›',
      },
      {
        n: '4', head: 'Huỷ đơn = kho tự cộng trả',
        desc: <>Đơn ĐÃ xuất BS mà huỷ → <b>phải huỷ cả bên BS</b>, không thì BS vẫn in đơn đó.</>,
      },
    ],
  },
  inventory: {
    title: '📖 Quy trình kho — dán tường',
    steps: [
      {
        n: '1', head: 'Sửa số tồn → sửa Ở BIGSELLER',
        desc: <>BS là <b>sổ cái duy nhất</b> (Shopee/TikTok trừ ở đó). Số trên web chỉ là bản sao.</>,
      },
      {
        n: '2', head: '2–3 ngày/lần: Đồng bộ kho',
        desc: <>Xuất file tồn từ BS → <b>🔁 Đồng bộ kho</b> → xem lệch → Áp dụng.</>,
        action: 'goto-sync', lbl: 'Mở đồng bộ ›',
      },
      {
        n: '✦', auto: true, head: 'Web tự treo "Hết hàng"',
        desc: <>Khi tồn ≤ <b>ngưỡng ngừng bán</b>. Thấy web báo hết mà kho còn → chạy Đồng bộ, ĐỪNG tự cộng số.</>,
      },
      {
        n: '3', head: 'Ô SKU BigSeller trống = báo động',
        desc: <>Món chưa khai SKU thì <b>đơn chứa nó không xuất được</b> sang BS. Khai ngay khi thấy viền đỏ.</>,
      },
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
      background: 'linear-gradient(135deg,#eef1fa,#f7f9ff)',
      border: `1px solid ${T.line}`, borderRadius: T.radius,
      padding: '10px 14px', marginBottom: 14, fontFamily: T.fontBody,
    }}>
      <div
        onClick={toggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
          fontFamily: T.fontTitle, fontWeight: 700, fontSize: 12.5, color: T.navy,
        }}
      >
        {g.title}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: T.muted, fontWeight: 600 }}>
          {open ? 'Thu gọn ▲' : 'Mở ra ▼'}
        </span>
      </div>

      {open && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          {g.steps.map((s, i) => {
            const clickable = !!s.action
            return (
              <div
                key={i}
                onClick={() => clickable && onAction?.(s.action)}
                title={clickable ? 'Bấm để nhảy tới thao tác này' : ''}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 7,
                  background: '#fff', border: `1px solid ${T.line}`, borderRadius: 10,
                  padding: '8px 11px', fontSize: 11.5, lineHeight: 1.45, maxWidth: 240,
                  cursor: clickable ? 'pointer' : 'default',
                }}
              >
                <span style={{
                  width: 18, height: 18, borderRadius: '50%',
                  background: s.auto ? T.ok : T.navy, color: '#fff',
                  fontFamily: T.fontTitle, fontWeight: 800, fontSize: 10,
                  display: 'grid', placeItems: 'center', flexShrink: 0, marginTop: 1,
                }}>{s.n}</span>
                <span>
                  <b style={{ color: T.navyDeep }}>{s.head}</b><br />
                  {s.desc}
                  {clickable && <><br /><span style={{ fontSize: 10, color: T.info, fontFamily: T.fontTitle, fontWeight: 700 }}>{s.lbl}</span></>}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
