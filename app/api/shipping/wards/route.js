// app/api/shipping/wards/route.js
// Returns wards for a given district ID from GHN master data
import { getGHNWards } from '../../../../lib/shipping'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const districtId = searchParams.get('district_id')
  if (!districtId) return Response.json({ error: 'district_id required' }, { status: 400 })
  try {
    const data = await getGHNWards(Number(districtId))
    return Response.json(data)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
