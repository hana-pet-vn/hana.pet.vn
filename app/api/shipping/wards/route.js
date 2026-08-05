// app/api/shipping/wards/route.js
// Phường/xã theo quận/huyện — danh bạ TĨNH (đã cắt GHN 05/08/2026).
import { getWards } from '../../../../lib/vn-address'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const districtId = searchParams.get('district_id')
  if (!districtId) return Response.json({ error: 'district_id required' }, { status: 400 })
  return Response.json(getWards(districtId), {
    headers: { 'Cache-Control': 'public, max-age=86400' },
  })
}
