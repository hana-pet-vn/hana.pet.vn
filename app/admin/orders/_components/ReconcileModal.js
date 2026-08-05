'use client'
// app/admin/orders/_components/ReconcileModal.js
// ─────────────────────────────────────────────────────────────────────
// F5 — Đối soát BigSeller: thả file → XEM TRƯỚC 4 khối → Áp dụng.
// Đường cập nhật trạng thái CHÍNH, nhịp MỖI CHIỀU một lần (bản 3).
// planReconcile() của lib/bigseller.js giữ NGUYÊN — chỉ-đẩy-tới,
// Huỷ luôn thắng kèm hoàn kho, 'Chờ xử lý' giữ nguyên, 'Trả hàng &
// Hoàn tiền' → "Hoàn hàng — chờ kiểm" (KHÔNG tự hoàn kho).
// Update > 20 đơn: bắt gõ đúng số lượng để xác nhận (thao tác nặng đô).
// Hoàn kho lỗi đơn nào: trạng thái VẪN đổi, ghi "cần kiểm kho tay".
// ─────────────────────────────────────────────────────────────────────
import { useState, useRef } from 'react'
import { T, ORDER_STATUS } from '../../_lib/tokens'
import { StatusBadge } from '../../_components/ui'
import { useToast } from '../../_components/Toast'
import { planReconcile } from '../../../../lib/bigseller'
import { updateOrderDB, restockOrder, mergeConfig } from '../../../../lib/supabase'

const box = { border: `1px solid ${T.line}`, borderRadius: 10, padding: '10px 12px', marginBottom: 8, fontSize: 12.5 }
const blkH = { fontFamily: T.fontTitle, fontWeight: 700, fontSize: 12, color: T.navyDeep, margin: '12px 0 7px' }

export default function ReconcileModal({ orders, onApplied, onClose }) {
  const toast = useToast()
  const [plan, setPlan] = useState(null)
  const [busy, setBusy] = useState('')          // 'read' | 'apply'
  const [result, setResult] = useState(null)    // tổng kết sau khi áp
  const [showUnchanged, setShowUnchanged] = useState(false)
  const [countInput, setCountInput] = useState('')
  const fileRef = useRef(null)

  const needTypedCount = plan && plan.updates.length > 20
  const countOk = !needTypedCount || Number(countInput) === plan.updates.length

  const readFile = async (file) => {
    if (!file) return
    setBusy('read'); setPlan(null); setResult(null); setCountInput('')
    try {
      const text = await file.text()
      const p = planReconcile({ csvText: text, orders })
      if (p.error) toast.err(p.error)
      else setPlan(p)
    } catch (e) { toast.err('Đọc file lỗi: ' + (e?.message || e)) }
    finally { setBusy(''); if (fileRef.current) fileRef.current.value = '' }
  }

  const apply = async () => {
    if (!plan?.updates?.length || !countOk) return
    setBusy('apply')
    let done = 0, needCheck = [], failed = []
    const changes = []

    for (const u of plan.updates) {
      // 1. Hoàn kho trước (chỉ khi chuyển sang Đã huỷ). Lỗi → VẪN đổi
      //    trạng thái, nhưng ghi rõ đơn cần kiểm kho tay.
      if (u.restock) {
        try { await restockOrder(u.order) }
        catch (e) { needCheck.push(u.order.code) }
      }
      // 2. Đổi trạng thái + nhớ mã BS (nếu dò mờ mới ghép được)
      try {
        const patch = { status: u.to }
        if (u.bsId) patch.bigsellerOrderId = u.bsId
        await updateOrderDB(u.order.id, patch)
        changes.push({ id: u.order.id, ...patch })
        done++
      } catch (e) { failed.push(`${u.order.code}: ${e?.message || e}`) }
    }

    // Ghi mốc "lần đối soát gần nhất" — Tổng quan (Phase 3) đọc để nhắc vàng
    try {
      await mergeConfig('bigseller_reconcile', {
        lastAt: new Date().toISOString(), updated: done, skipped: failed.length,
      })
    } catch {}

    setBusy('')
    setResult({ done, failed, needCheck })
    onApplied(changes)
    toast.ok(`🔄 Đối soát xong — cập nhật ${done}, bỏ qua ${failed.length}, cần kiểm ${needCheck.length}`)
  }

  const btn = (main) => ({
    border: 'none', borderRadius: 9, padding: '9px 15px', cursor: 'pointer',
    fontFamily: T.fontTitle, fontWeight: 700, fontSize: 12.5,
    background: main ? T.navy : '#fff', color: main ? '#fff' : T.navy,
    ...(main ? {} : { border: `1.5px solid ${T.line}` }),
  })

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget && busy !== 'apply') onClose() }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(13,20,46,.45)', zIndex: 8000,
        display: 'grid', placeItems: 'center', padding: 16,
      }}
    >
      <div style={{
        background: '#fff', borderRadius: 16, width: 'min(680px,94vw)', maxHeight: '86vh',
        overflowY: 'auto', padding: 20, fontFamily: T.fontBody,
      }}>
        <h3 style={{ fontFamily: T.fontTitle, color: T.navyDeep, fontSize: 16, marginBottom: 4 }}>
          🔄 Đối soát BigSeller
        </h3>
        <div style={{ fontSize: 12, color: T.muted, marginBottom: 14, lineHeight: 1.6 }}>
          Nhịp MỖI CHIỀU một lần — đường cập nhật trạng thái CHÍNH. Bên BS:
          Xử lý đơn hàng → Lịch sử đơn → chọn <b>7 ngày gần nhất</b> → Xuất đơn
          (nhớ xuất <b>TẤT CẢ các trang</b>) → mở bằng Excel → Lưu thành <b>.CSV</b> → thả vào đây.
        </div>

        {!result && (
          <input
            ref={fileRef} type="file" accept=".csv,text/csv"
            onChange={e => readFile(e.target.files?.[0])}
            style={{ fontSize: 12, marginBottom: 10, fontFamily: T.fontBody }}
          />
        )}
        {busy === 'read' && <div style={{ color: T.muted }}>⏳ Đang đọc file…</div>}

        {plan && !result && (
          <>
            <div style={{ ...box, color: T.muted }}>
              Đọc được <b style={{ color: T.navyDeep }}>{plan.totalInFile}</b> đơn trong file
              (đơn Shopee/TikTok không khớp mã web sẽ tự bỏ qua — an toàn).
            </div>

            {/* ── Khối 1: Sẽ cập nhật ── */}
            <div style={blkH}>1 · Sẽ cập nhật ({plan.updates.length})</div>
            {plan.updates.length === 0 && <div style={{ ...box, color: T.muted }}>Không có gì đổi — mọi đơn đã khớp.</div>}
            {plan.updates.slice(0, 30).map(u => (
              <div key={u.order.id} style={{
                ...box, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6,
              }}>
                <b style={{ fontFamily: T.fontTitle, color: T.navy }}>{u.order.code}</b>
                <StatusBadge status={u.from} />
                <span style={{ color: T.muted }}>→</span>
                <StatusBadge status={u.to} />
                {u.restock && (
                  <span style={{
                    marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: T.bad,
                    background: T.badBg, borderRadius: 20, padding: '2px 9px',
                  }}>kèm hoàn kho</span>
                )}
              </div>
            ))}
            {plan.updates.length > 30 && (
              <div style={{ fontSize: 12, color: T.muted, marginBottom: 6 }}>…và {plan.updates.length - 30} đơn nữa</div>
            )}

            {/* ── Khối 2: Không đổi (thu gọn) ── */}
            <div style={blkH}>
              2 · Không đổi ({plan.unchanged.length}){' '}
              <button onClick={() => setShowUnchanged(s => !s)} style={{
                border: 'none', background: 'none', color: T.info, fontSize: 11, cursor: 'pointer', fontFamily: T.fontBody,
              }}>{showUnchanged ? 'thu gọn ▲' : 'xem ▼'}</button>
            </div>
            {showUnchanged && plan.unchanged.length > 0 && (
              <div style={{ ...box, color: T.muted, fontFamily: 'monospace', fontSize: 11.5 }}>
                {plan.unchanged.map(o => o.code).join(' · ')}
              </div>
            )}

            {/* ── Khối 3: Trạng thái lạ ── */}
            {plan.unknownStatuses.length > 0 && (
              <>
                <div style={{ ...blkH, color: T.warn }}>3 · ⚠ Trạng thái lạ chưa có trong bảng map</div>
                <div style={{ ...box, background: T.warnBg, borderColor: '#f3d9a4', color: '#92400e' }}>
                  {plan.unknownStatuses.map(u => `"${u.status}" (${u.count} đơn)`).join(', ')}
                  <div style={{ marginTop: 4, fontSize: 11.5 }}>→ Không đoán, không đổi gì — báo để bổ sung vào bảng map trong lib/bigseller.js.</div>
                </div>
              </>
            )}

            {/* ── Khối 4: Đã xuất BS nhưng không có trong file ── */}
            {plan.missing.length > 0 && (
              <>
                <div style={{ ...blkH, color: T.bad }}>4 · 🔎 Đã xuất BS nhưng KHÔNG có trong file ({plan.missing.length})</div>
                <div style={{ ...box, background: T.badBg, borderColor: '#f0c4c4', color: T.bad }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 11.5 }}>
                    {plan.missing.slice(0, 10).map(o => o.code).join(' · ')}
                    {plan.missing.length > 10 && ` · …+${plan.missing.length - 10}`}
                  </span>
                  <div style={{ marginTop: 4, fontSize: 11.5, color: '#92400e' }}>
                    → Khả năng quên nhập sang BS (kho bên đó chưa trừ), hoặc file xuất thiếu trang / thiếu ngày. Kiểm giúp.
                  </div>
                </div>
              </>
            )}

            {/* ── Áp dụng ── */}
            {needTypedCount && (
              <div style={{ ...box, background: T.warnBg, borderColor: '#f3d9a4', color: '#92400e', marginTop: 10 }}>
                Thao tác lớn: <b>{plan.updates.length} đơn</b> sẽ đổi trạng thái.
                Gõ đúng con số <b>{plan.updates.length}</b> để mở nút Áp dụng:{' '}
                <input
                  value={countInput} onChange={e => setCountInput(e.target.value)}
                  inputMode="numeric" placeholder="…"
                  style={{
                    width: 70, border: `1.5px solid ${countOk ? T.ok : '#f3d9a4'}`, borderRadius: 8,
                    padding: '5px 8px', fontSize: 13, fontFamily: T.fontTitle, fontWeight: 700,
                    textAlign: 'center', outline: 'none',
                  }}
                />
              </div>
            )}
            <div style={{ display: 'flex', gap: 9, justifyContent: 'flex-end', marginTop: 14 }}>
              <button style={btn(false)} onClick={onClose} disabled={busy === 'apply'}>Đóng</button>
              <button
                style={{ ...btn(true), opacity: plan.updates.length && countOk && busy !== 'apply' ? 1 : .5 }}
                disabled={!plan.updates.length || !countOk || busy === 'apply'}
                onClick={apply}
              >
                {busy === 'apply' ? '⏳ Đang áp dụng…' : `Áp dụng ${plan.updates.length} thay đổi`}
              </button>
            </div>
          </>
        )}

        {/* ── Tổng kết ── */}
        {result && (
          <>
            <div style={{ ...box, background: T.okBg, borderColor: '#bbe8c8', color: '#166534' }}>
              ✅ <b>Cập nhật {result.done}</b> · bỏ qua {result.failed.length} · cần kiểm {result.needCheck.length}
            </div>
            {result.needCheck.length > 0 && (
              <div style={{ ...box, background: T.warnBg, borderColor: '#f3d9a4', color: '#92400e' }}>
                ⚠ Hoàn kho LỖI (trạng thái đã đổi, <b>kiểm kho tay</b> từng đơn):{' '}
                <span style={{ fontFamily: 'monospace' }}>{result.needCheck.join(' · ')}</span>
              </div>
            )}
            {result.failed.length > 0 && (
              <div style={{ ...box, background: T.badBg, borderColor: '#f0c4c4', color: T.bad }}>
                ✕ Không cập nhật được:
                {result.failed.map((f, i) => <div key={i} style={{ marginLeft: 10 }}>· {f}</div>)}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
              <button style={btn(true)} onClick={onClose}>Xong</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
