// app/api/shipping/districts/route.js
// Quận/huyện theo tỉnh — danh bạ TĨNH (đã cắt GHN 05/08/2026).
import { getDistricts } from '../../../../lib/vn-address'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const provinceId = searchParams.get('province_id')
  if (!provinceId) return Response.json({ error: 'province_id required' }, { status: 400 })
  return Response.json(getDistricts(provinceId), {
    headers: { 'Cache-Control': 'public, max-age=86400' },
  })
}
