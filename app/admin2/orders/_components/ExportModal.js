'use client'
// app/admin2/orders/_components/ExportModal.js
// ─────────────────────────────────────────────────────────────────────
// F4 — Xuất BigSeller (CSV) theo luồng: chọn đơn → XEM TRƯỚC (cảnh báo
// hiện RA HẾT, không nuốt im) → tải file → ghi dấu bigsellerExportedAt.
// buildExport() của lib/bigseller.js giữ NGUYÊN (đã khớp template BS
// 100%). Đơn không đủ điều kiện bị loại + liệt kê lý do, không chặn lô.
// Xuất lại lần 2: cho phép nhưng phải xác nhận (cảnh báo đơn đôi).
// ─────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { T, ORDER_STATUS } from '../../_lib/tokens'
import { useToast } from '../../_components/Toast'
import { getAllConfigs, updateOrderDB } from '../../../../lib/supabase'
import {
  buildExport, downloadText, EXPORTABLE_STATUSES, DEFAULT_STORE_NAME,
} from '../../../../lib/bigseller'

const box = { border: `1px solid ${T.line}`, borderRadius: 10, padding: '10px 12px', marginBottom: 8, fontSize: 12.5 }

export default function ExportModal({ orders, products, onDone, onClose }) {
  const toast = useToast()
  const [cfg, setCfg] = useState(null)          // { map, store }
  const [phase, setPhase] = useState('load')    // load → preview → confirm-re → applying
  const [plan, setPlan] = useState(null)        // kết quả buildExport + phân loại

  useEffect(() => { (async () => {
    try {
      const all = await getAllConfigs()
      const bs = all?.bigseller || {}
      setCfg({ map: bs.map || {}, store: bs.store || DEFAULT_STORE_NAME })
    } catch {
      setCfg({ map: {}, store: DEFAULT_STORE_NAME })
    }
  })() }, [])

  // Dựng kế hoạch xuất ngay khi có config
  useEffect(() => {
    if (!cfg) return
    // 1. Loại đơn sai trạng thái, LIỆT KÊ lý do — không chặn cả lô
    const eligible = [], rejected = []
    for (const o of orders) {
      if (EXPORTABLE_STATUSES.includes(o.status)) eligible.push(o)
      else rejected.push({ code: o.code, why: `trạng thái "${ORDER_STATUS[o.status]?.label || o.status}"` })
    }
    // 2. Đơn đã xuất rồi → cần gật đầu riêng (nguy cơ đơn đôi bên BS)
    const reexport = eligible.filter(o => o.bigsellerExportedAt)
    // 3. buildExport giữ nguyên — xoá tạm dấu đã-xuất để nó không tự loại
    //    những đơn người dùng CỐ Ý xuất lại (chỉ trong bản sao, không đụng DB)
    const res = buildExport({
      orders: eligible.map(o => ({ ...o, bigsellerExportedAt: null })),
      products,
      skuMap: cfg.map,
      storeName: cfg.store,
    })
    setPlan({ ...res, rejected, reexport })
    setPhase(reexport.length ? 'confirm-re' : 'preview')
  }, [cfg, orders, products])

  const doDownload = async () => {
    setPhase('applying')
    const d = new Date()
    const p = n => String(n).padStart(2, '0')
    const fname = `hanapet-bigseller-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.csv`
    downloadText(fname, plan.csv)

    // Ghi dấu đã xuất cho TỪNG đơn trong file — lỗi đơn nào báo đơn đó
    const now = new Date().toISOString()
    const okIds = []
    for (const o of plan.exported) {
      try { await updateOrderDB(o.id, { bigsellerExportedAt: now }); okIds.push(o.id) }
      catch (e) { toast.err(`✕ ${o.code} — không ghi được dấu "đã xuất": ${e?.message || e}`) }
    }
    toast.ok(`📤 Đã tải ${fname} — ${plan.exported.length} đơn, ${plan.rows.length} dòng`)
    onDone(okIds, now)
    onClose()
  }

  const btn = (main) => ({
    border: 'none', borderRadius: 9, padding: '9px 15px', cursor: 'pointer',
    fontFamily: T.fontTitle, fontWeight: 700, fontSize: 12.5,
    background: main ? T.navy : '#fff', color: main ? '#fff' : T.navy,
    ...(main ? {} : { border: `1.5px solid ${T.line}` }),
  })

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(13,20,46,.45)', zIndex: 8000,
        display: 'grid', placeItems: 'center', padding: 16,
      }}
    >
      <div style={{
        background: '#fff', borderRadius: 16, width: 'min(640px,94vw)', maxHeight: '86vh',
        overflowY: 'auto', padding: 20, fontFamily: T.fontBody,
      }}>
        <h3 style={{ fontFamily: T.fontTitle, color: T.navyDeep, fontSize: 16, marginBottom: 4 }}>
          📤 Xuất BigSeller (CSV)
        </h3>
        <div style={{ fontSize: 12, color: T.muted, marginBottom: 14 }}>
          File đúng định dạng nhập thủ công của BS (39 cột) — combo tự bung theo BOM, giá tự chia.
          Bên BS: Xử lý đơn hàng → Nhập đơn hàng thủ công → Up file lên.
        </div>

        {(!plan || phase === 'load') && <div style={{ color: T.muted, padding: 20 }}>⏳ Đang soạn file…</div>}

        {plan && phase !== 'load' && (
          <>
            {/* Cảnh báo xuất lại — phải gật đầu mới đi tiếp */}
            {phase === 'confirm-re' && (
              <div style={{ ...box, background: T.warnBg, borderColor: '#f3d9a4', color: '#92400e' }}>
                ⚠ <b>{plan.reexport.length} đơn đã xuất trước đó:</b>{' '}
                {plan.reexport.map(o => o.code).join(' · ')}
                <div style={{ marginTop: 6 }}>
                  Nhập trùng bên BS sẽ tạo <b>đơn đôi</b> — kiểm bên BS trước khi xuất lại.
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button style={btn(false)} onClick={onClose}>Thôi, quay lại</button>
                  <button style={{ ...btn(true), background: T.warn }} onClick={() => setPhase('preview')}>
                    Hiểu rồi, vẫn xuất lại
                  </button>
                </div>
              </div>
            )}

            {/* Tổng quan file */}
            <div style={box}>
              Sẽ xuất <b>{plan.exported.length}</b> đơn → <b>{plan.rows.length}</b> dòng SKU
              {plan.exported.length > 0 && (
                <div style={{ color: T.muted, marginTop: 4, fontFamily: 'monospace', fontSize: 11.5 }}>
                  {plan.exported.slice(0, 8).map(o => o.code).join(' · ')}
                  {plan.exported.length > 8 && ` · …+${plan.exported.length - 8}`}
                </div>
              )}
            </div>

            {/* Đơn bị loại + lý do */}
            {(plan.rejected.length > 0 || plan.skipped.length > 0) && (
              <div style={{ ...box, color: T.muted }}>
                Bị loại khỏi lô ({plan.rejected.length + plan.skipped.length}):
                {[...plan.rejected, ...plan.skipped].slice(0, 8).map((x, i) => (
                  <div key={i} style={{ marginLeft: 10 }}>· {x.code} — {x.why}</div>
                ))}
                {plan.rejected.length + plan.skipped.length > 8 && (
                  <div style={{ marginLeft: 10 }}>· …và {plan.rejected.length + plan.skipped.length - 8} đơn nữa</div>
                )}
              </div>
            )}

            {/* Cảnh báo từ explodeOrder — HIỆN RA trước khi tải, không nuốt im */}
            {plan.warnings.length > 0 && (
              <div style={{ ...box, background: T.warnBg, borderColor: '#f3d9a4', color: '#92400e' }}>
                <b>⚠ Cảnh báo ({plan.warnings.length}):</b>
                {plan.warnings.slice(0, 10).map((w, i) => <div key={i} style={{ marginLeft: 10 }}>· {w}</div>)}
                {plan.warnings.length > 10 && <div style={{ marginLeft: 10 }}>· …và {plan.warnings.length - 10} cảnh báo nữa</div>}
                {plan.warnings.some(w => w.includes('Chưa khai mã BigSeller')) && (
                  <div style={{ marginTop: 6, fontSize: 11.5 }}>
                    💡 Khai mã SKU BigSeller hiện vẫn ở admin cũ (tab Kho → BigSeller) — sẽ chuyển về đây ở Phase 2.
                  </div>
                )}
              </div>
            )}

            {phase !== 'confirm-re' && (
              <div style={{ display: 'flex', gap: 9, justifyContent: 'flex-end', marginTop: 14 }}>
                <button style={btn(false)} onClick={onClose}>Đóng</button>
                <button
                  style={{ ...btn(true), opacity: plan.exported.length && phase !== 'applying' ? 1 : .5 }}
                  disabled={!plan.exported.length || phase === 'applying'}
                  onClick={doDownload}
                >
                  {phase === 'applying' ? '⏳ Đang tải…' : `Tải file CSV (${plan.exported.length} đơn)`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
