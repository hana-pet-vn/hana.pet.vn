// app/api/shipping/fee/route.js
// ─────────────────────────────────────────────────────────────────────
// PHÍ SHIP KHÔNG CẦN GHN (cắt 05/08/2026) — vận đơn thật và cước thật
// nằm bên BigSeller; web chỉ áng phí thu của khách lúc đặt hàng.
// 2 chế độ (chỉnh ở /admin2/settings, lưu site_config 'shipping_flat_fee'):
//   · Đồng giá toàn quốc
//   · Theo vùng: nội tỉnh / cùng miền / cận miền / xuyên miền
// Cách tính nằm ở lib/vn-address computeShipFee — DÙNG CHUNG với
// /api/orders/create nên số hiện cho khách và số ghi vào đơn luôn khớp.
// Trả về đúng dạng cũ { success, fee, note } — trang thanh toán không đổi.
// ─────────────────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js'
import { computeShipFee, DEFAULT_FEE_CONFIG } from '../../../../lib/vn-address'

// Đỡ tay cho DB: nhớ config 60 giây (mỗi lần khách đổi địa chỉ là 1 call)
let cached = null
let cachedAt = 0

async function getFeeConfig() {
  const now = Date.now()
  if (cached && now - cachedAt < 60_000) return cached
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    )
    const { data } = await supabase
      .from('site_config').select('value').eq('key', 'shipping_flat_fee').maybeSingle()
    cached = (data?.value && typeof data.value === 'object') ? data.value : DEFAULT_FEE_CONFIG
    cachedAt = now
    return cached
  } catch {
    return DEFAULT_FEE_CONFIG
  }
}

export async function POST(request) {
  let districtId = null, provinceId = null, subtotal = 0
  try {
    const body = await request.json()
    districtId = body.toDistrictId || body.districtId || null
    provinceId = body.provinceId || null
    subtotal   = Number(body.value || body.insuranceValue) || 0
  } catch {}

  const cfg = await getFeeConfig()
  const { fee, note } = computeShipFee(cfg, { provinceId, districtId, subtotal })
  return Response.json({ success: true, fee, note })
}
