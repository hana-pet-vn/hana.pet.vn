// lib/vn-address/index.js
// ─────────────────────────────────────────────────────────────────────
// DANH BẠ HÀNH CHÍNH VIỆT NAM — TĨNH, nằm trong repo, KHÔNG cần GHN.
// (Quyết định 05/08/2026: cắt GHN khỏi web — vận đơn đã là việc của
// BigSeller, web chỉ cần địa chỉ 3 cấp để in vào file xuất BS.)
//
// Nguồn: bộ dữ liệu dvhcvn (Tổng cục Thống kê, bản 01/03/2025) —
// 63 tỉnh / 696 quận huyện / 10.047 phường xã, đúng cấu trúc 3 cấp
// mà template BigSeller dùng (cột Tỉnh / Huyện / Xã).
// Mỗi tỉnh gắn thêm Region: 'B' | 'T' | 'N' (Bắc/Trung/Nam) để áng
// phí ship theo vùng.
//
// Tên trường GIỮ NGUYÊN kiểu GHN (ProvinceID, DistrictName, WardCode…)
// để trang thanh toán và form tạo đơn KHÔNG phải đổi một dòng nào.
// ─────────────────────────────────────────────────────────────────────
import provinces from './provinces.json'
import districts from './districts.json'
import wards from './wards.json'

export const getProvinces = () => provinces
export const getDistricts = (provinceId) => districts[String(provinceId)] || []
export const getWards     = (districtId) => wards[String(districtId)] || []

// ── Tra ngược: quận/huyện → tỉnh (trang thanh toán chỉ gửi districtId) ──
const districtToProvince = {}
for (const [pid, list] of Object.entries(districts)) {
  for (const d of list) districtToProvince[d.DistrictID] = pid
}
export const provinceOfDistrict = (districtId) => districtToProvince[String(districtId)] || null

const provinceById = Object.fromEntries(provinces.map(p => [p.ProvinceID, p]))
export const regionOf = (provinceId) => provinceById[String(provinceId)]?.Region || null

// ═════════════════════════════════════════════════════════════════════
// PHÍ SHIP — 2 chế độ, cấu hình ở site_config 'shipping_flat_fee':
//   { mode: 'flat' | 'zone', fee, freeOver, homeProvinceId,
//     zones: { local, sameRegion, nearRegion, farRegion } }
//
//   flat : một giá toàn quốc (fee)
//   zone : áng theo khoảng cách địa lý KIỂU HÃNG VẬN CHUYỂN — 4 bậc:
//          nội tỉnh → cùng miền → cận miền (Bắc↔Trung, Trung↔Nam)
//          → xuyên miền (Bắc↔Nam). Không tính theo km vì hãng cũng
//          không tính theo km — bậc vùng mới là thứ quyết định cước.
// ═════════════════════════════════════════════════════════════════════
export const DEFAULT_FEE_CONFIG = {
  mode: 'flat',
  fee: 30000,
  freeOver: 0,
  homeProvinceId: '01',            // Hà Nội — nơi shop đóng hàng
  zones: { local: 20000, sameRegion: 30000, nearRegion: 35000, farRegion: 40000 },
}

const TIER_LABEL = {
  local:      'nội tỉnh',
  sameRegion: 'cùng miền',
  nearRegion: 'cận miền',
  farRegion:  'xuyên miền',
}

export function shipTier(homeProvinceId, provinceId) {
  if (String(homeProvinceId) === String(provinceId)) return 'local'
  const a = regionOf(homeProvinceId), b = regionOf(provinceId)
  if (!a || !b) return 'farRegion'                 // không rõ thì lấy mức cao — an toàn
  if (a === b) return 'sameRegion'
  if ((a === 'B' && b === 'N') || (a === 'N' && b === 'B')) return 'farRegion'
  return 'nearRegion'                              // Bắc↔Trung hoặc Trung↔Nam
}

/* Tính phí từ config + địa chỉ khách. Nhận provinceId HOẶC districtId
   (tự tra ngược). Trả { fee, note } — dùng chung cho /api/shipping/fee
   và /api/orders/create để hai nơi không bao giờ lệch số. */
export function computeShipFee(rawCfg, { provinceId, districtId, subtotal = 0 }) {
  const cfg = { ...DEFAULT_FEE_CONFIG, ...(rawCfg || {}) }
  const zones = { ...DEFAULT_FEE_CONFIG.zones, ...(cfg.zones || {}) }

  const freeOver = Number(cfg.freeOver) || 0
  if (freeOver > 0 && subtotal >= freeOver) {
    return { fee: 0, note: `Miễn phí vận chuyển cho đơn từ ${freeOver.toLocaleString('vi-VN')}đ` }
  }

  if (cfg.mode !== 'zone') {
    const fee = Number.isFinite(Number(cfg.fee)) && Number(cfg.fee) >= 0
      ? Number(cfg.fee) : DEFAULT_FEE_CONFIG.fee
    return { fee, note: 'Đồng giá toàn quốc' }
  }

  const pid = provinceId || (districtId ? provinceOfDistrict(districtId) : null)
  if (!pid) {
    // Chưa đủ địa chỉ để xếp vùng → tạm lấy mức cao nhất, đặt xong sẽ đúng
    return { fee: Number(zones.farRegion) || DEFAULT_FEE_CONFIG.zones.farRegion, note: 'Tạm tính' }
  }
  const tier = shipTier(cfg.homeProvinceId || DEFAULT_FEE_CONFIG.homeProvinceId, pid)
  const fee = Number.isFinite(Number(zones[tier])) && Number(zones[tier]) >= 0
    ? Number(zones[tier]) : DEFAULT_FEE_CONFIG.zones[tier]
  return { fee, note: `Phí theo vùng (${TIER_LABEL[tier]})` }
}
