// app/api/shipping/provinces/route.js
// Returns all provinces from GHN master data — cache-friendly (data rarely changes)
import { getGHNProvinces } from '../../../../lib/shipping'

let cachedProvinces = null
let cacheTime = 0
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

export async function GET() {
  try {
    const now = Date.now()
    if (!cachedProvinces || now - cacheTime > CACHE_TTL) {
      cachedProvinces = await getGHNProvinces()
      cacheTime = now
    }
    return Response.json(cachedProvinces, {
      headers: { 'Cache-Control': 'public, max-age=86400' }
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
