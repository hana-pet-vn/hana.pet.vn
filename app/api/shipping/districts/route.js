// app/api/shipping/districts/route.js
// Returns districts for a given province ID from GHN master data
import { getGHNDistricts } from '../../../../lib/shipping'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const provinceId = searchParams.get('province_id')
  if (!provinceId) return Response.json({ error: 'province_id required' }, { status: 400 })
  try {
    const data = await getGHNDistricts(Number(provinceId))
    return Response.json(data)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
