// app/api/shipping/provinces/route.js
// Danh sách tỉnh/thành từ danh bạ TĨNH trong repo (lib/vn-address) —
// đã cắt GHN 05/08/2026, không cần GHN_TOKEN, không gọi mạng.
import { getProvinces } from '../../../../lib/vn-address'

export async function GET() {
  return Response.json(getProvinces(), {
    headers: { 'Cache-Control': 'public, max-age=86400' },
  })
}
