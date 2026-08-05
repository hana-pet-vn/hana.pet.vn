'use client'
// app/admin/settings/page.js — Cài đặt (bản Phase 1: phí vận chuyển;
// phân quyền 5 công tắc + quản lý nhân viên lên ở Phase 3)
// ─────────────────────────────────────────────────────────────────────
// Phí ship KHÔNG GHN (cắt 05/08/2026), 2 chế độ:
//   · Đồng giá toàn quốc — một mức duy nhất
//   · Theo vùng — 4 bậc kiểu hãng vận chuyển: nội tỉnh / cùng miền /
//     cận miền / xuyên miền, tính từ tỉnh shop đóng hàng
// Lưu site_config 'shipping_flat_fee'. Trang ownerOnly.
// ─────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { T } from '../_lib/tokens'
import { useToast } from '../_components/Toast'
import { getAllConfigs, setConfig } from '../../../lib/supabase'

const inp = {
  width: 140, border: `1.5px solid ${T.line}`, borderRadius: 10,
  padding: '9px 12px', fontSize: 13, outline: 'none',
  fontFamily: T.fontTitle, fontWeight: 700, color: T.navyDeep,
}
const lbl = { fontSize: 12, color: T.muted, marginBottom: 5, display: 'block' }
const DEFAULTS = {
  mode: 'flat', fee: 30000, freeOver: 0, homeProvinceId: '01',
  zones: { local: 20000, sameRegion: 30000, nearRegion: 35000, farRegion: 40000 },
}

export default function SettingsPage() {
  const toast = useToast()
  const [cfg, setCfg] = useState(null)          // bản đang sửa
  const [provinces, setProvinces] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => { (async () => {
    try {
      const all = await getAllConfigs()
      const v = (all?.shipping_flat_fee && typeof all.shipping_flat_fee === 'object') ? all.shipping_flat_fee : {}
      setCfg({ ...DEFAULTS, ...v, zones: { ...DEFAULTS.zones, ...(v.zones || {}) } })
    } catch { setCfg({ ...DEFAULTS }) }
    fetch('/api/shipping/provinces').then(r => r.json())
      .then(d => setProvinces(Array.isArray(d) ? d : [])).catch(() => {})
  })() }, [])

  const num = v => Number(String(v).replace(/[^\d]/g, '')) || 0
  const setZone = (k, v) => setCfg(c => ({ ...c, zones: { ...c.zones, [k]: num(v) } }))

  const save = async () => {
    setSaving(true)
    try {
      await setConfig('shipping_flat_fee', cfg)
      toast.ok('💾 Đã lưu phí vận chuyển — áp dụng cho đơn đặt sau lúc này')
    } catch (e) { toast.err('Không lưu được: ' + (e?.message || e)) }
    finally { setSaving(false) }
  }

  const ZONES = [
    ['local',      'Nội tỉnh',   'khách cùng tỉnh với shop'],
    ['sameRegion', 'Cùng miền',  'cùng Bắc / Trung / Nam'],
    ['nearRegion', 'Cận miền',   'Bắc↔Trung hoặc Trung↔Nam'],
    ['farRegion',  'Xuyên miền', 'Bắc↔Nam — xa nhất'],
  ]

  return (
    <div>
      <h1 style={{ fontFamily: T.fontTitle, fontWeight: 800, fontSize: 19, color: T.navyDeep, marginBottom: 2 }}>
        Cài đặt
      </h1>
      <p style={{ color: T.muted, fontSize: 12, marginBottom: 16 }}>
        Phân quyền nhân viên (5 công tắc) sẽ lên ở Phase 3.
      </p>

      <div style={{
        background: T.card, border: `1px solid ${T.line}`, borderRadius: T.radius,
        boxShadow: T.shadow, maxWidth: 620, overflow: 'hidden',
      }}>
        <div style={{
          padding: '13px 16px', borderBottom: `1px solid ${T.line}`,
          fontFamily: T.fontTitle, fontWeight: 700, fontSize: 13, color: T.navyDeep,
        }}>
          🚚 Phí vận chuyển thu của khách
        </div>

        {!cfg ? <div style={{ padding: 16, color: T.muted, fontSize: 12.5 }}>Đang tải…</div> : (
          <div style={{ padding: 16, fontSize: 12.5, lineHeight: 1.7 }}>
            <div style={{ color: T.muted, marginBottom: 12 }}>
              Vận đơn thật và cước thật nằm bên BigSeller — đây chỉ là mức web THU CỦA KHÁCH lúc đặt hàng.
            </div>

            {/* Chọn chế độ */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {[['flat', 'Đồng giá toàn quốc'], ['zone', 'Theo vùng (áng theo khoảng cách)']].map(([m, label]) => (
                <button key={m} onClick={() => setCfg(c => ({ ...c, mode: m }))} style={{
                  border: `1.5px solid ${cfg.mode === m ? T.navy : T.line}`,
                  background: cfg.mode === m ? T.navySoft : '#fff',
                  color: cfg.mode === m ? T.navy : T.muted,
                  borderRadius: 9, padding: '8px 14px', fontFamily: T.fontTitle,
                  fontWeight: 700, fontSize: 12.5, cursor: 'pointer',
                }}>{label}</button>
              ))}
            </div>

            {cfg.mode === 'flat' ? (
              <div>
                <span style={lbl}>Mức phí (đ/đơn)</span>
                <input style={inp} value={cfg.fee} inputMode="numeric"
                  onChange={e => setCfg(c => ({ ...c, fee: num(e.target.value) }))} />
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 12 }}>
                  <span style={lbl}>Shop đóng hàng ở tỉnh/thành</span>
                  <select
                    value={cfg.homeProvinceId}
                    onChange={e => setCfg(c => ({ ...c, homeProvinceId: e.target.value }))}
                    style={{ ...inp, width: 260, fontWeight: 600 }}
                  >
                    {provinces.map(p => <option key={p.ProvinceID} value={p.ProvinceID}>{p.ProvinceName}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  {ZONES.map(([k, name, hint]) => (
                    <div key={k}>
                      <span style={lbl}>{name} <span style={{ fontSize: 10.5 }}>({hint})</span></span>
                      <input style={inp} value={cfg.zones[k]} inputMode="numeric"
                        onChange={e => setZone(k, e.target.value)} />
                    </div>
                  ))}
                </div>
              </>
            )}

            <div style={{ marginTop: 14, borderTop: `1px solid ${T.line}`, paddingTop: 12, display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div>
                <span style={lbl}>Freeship cho đơn từ (đ) — 0 = tắt</span>
                <input style={inp} value={cfg.freeOver} inputMode="numeric"
                  onChange={e => setCfg(c => ({ ...c, freeOver: num(e.target.value) }))} />
              </div>
              <button onClick={save} disabled={saving} style={{
                background: T.navy, color: '#fff', border: 'none', borderRadius: 9,
                padding: '10px 18px', fontFamily: T.fontTitle, fontWeight: 700, fontSize: 12.5,
                cursor: 'pointer', opacity: saving ? .6 : 1,
              }}>{saving ? 'Đang lưu…' : '💾 Lưu'}</button>
            </div>

            <div style={{ marginTop: 10, fontSize: 11.5, color: T.muted }}>
              Áp dụng cho đơn đặt sau khi lưu (trang thanh toán nhớ tạm tối đa 1 phút). Đơn cũ không đổi.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
