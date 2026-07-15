// app/api/shipping/fee/route.js
import { calcShippingFee } from '../../../../lib/shipping'

const ipLog = new Map()
const RATE_LIMIT = 10
const WINDOW_MS  = 60_000

function isRateLimited(ip) {
  const now  = Date.now()
  const hits = (ipLog.get(ip) || []).filter(t => now - t < WINDOW_MS)
  hits.push(now)
  ipLog.set(ip, hits)
  return hits.length > RATE_LIMIT
}

setInterval(() => {
  const now = Date.now()
  for (const [ip, hits] of ipLog.entries()) {
    const fresh = hits.filter(t => now - t < WINDOW_MS)
    if (fresh.length === 0) ipLog.delete(ip)
    else ipLog.set(ip, fresh)
  }
}, 300_000)

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (isRateLimited(ip)) {
    return Response.json(
      { success: false, error: 'Too many requests. Please wait a moment.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    )
  }

  try {
    const body = await request.json()

    const params = {
      toDistrictId:   body.toDistrictId   || body.districtId,
      toWardCode:     body.toWardCode      || body.wardCode,
      province:       body.province,
      district:       body.district,
      weight:         body.weight          || 200,
      insuranceValue: body.value           || body.insuranceValue || 0,
    }

    const result = await calcShippingFee(params)
    return Response.json({ success: true, ...result })

  } catch (err) {
    // Log the REAL error — visible in Vercel function logs
    console.error('[shipping/fee] GHN API error:', err.message, {
      GHN_FROM_DISTRICT_ID: process.env.GHN_FROM_DISTRICT_ID || process.env.GHN_SHIPPING_DISTRICT_ID,
      GHN_TOKEN_SET:        !!process.env.GHN_TOKEN,
      GHN_SHOP_ID:          process.env.GHN_SHOP_ID,
    })
    return Response.json({
      success:       false,
      fee:           30000,
      estimatedDays: 3,
      provider:      'GHN',
      note:          `Estimated fee (GHN error: ${err.message})`,
    })
  }
}
