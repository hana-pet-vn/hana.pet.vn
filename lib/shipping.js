// ─────────────────────────────────────────────────────────────────────────────
// lib/shipping.js — GHN + GHTK API Integration (FIXED)
// Docs: https://api.ghn.vn/home/docs/detail  |  https://docs.ghtk.vn/
// ─────────────────────────────────────────────────────────────────────────────

// ── ENV KEYS (set in .env.local) ──────────────────────────────────────────────
// GHN_TOKEN=your_ghn_token
// GHN_SHOP_ID=your_ghn_shop_id
// GHN_FROM_DISTRICT_ID=your_shop_district_id   ← NEW: required for fee calc
// GHTK_TOKEN=your_ghtk_token
// SHIPPING_PROVIDER=GHN

const GHN_BASE  = "https://online-gateway.ghn.vn/shiip/public-api"
const GHTK_BASE = "https://services.giaohangtietkiem.vn"

// ─────────────────────────────────────────────────────────────────────────────
// GHN
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate GHN shipping fee.
 * Requires your shop's GHN district ID (GHN_FROM_DISTRICT_ID in env).
 *
 * How to find your shop's district ID:
 *   Call GET https://online-gateway.ghn.vn/shiip/public-api/master-data/district?province_id=YOUR_PROVINCE_ID
 *   with Token header = your GHN_TOKEN. Find your district in the list and copy DistrictID.
 *
 * @param {number} params.toDistrictId   - Customer's district ID (from GHN master data dropdown)
 * @param {string} params.toWardCode     - Customer's ward code (from GHN master data dropdown)
 * @param {number} params.weight         - Total weight in grams (default 200g)
 * @param {number} params.insuranceValue - Order value in VND (for insurance)
 */
export async function calcGHNFee({ toDistrictId, toWardCode, weight = 200, insuranceValue = 0 }) {
  if (!process.env.GHN_TOKEN || !process.env.GHN_SHOP_ID) {
    throw new Error("GHN_TOKEN or GHN_SHOP_ID not set in environment variables")
  }
  if (!toDistrictId || !toWardCode) {
    throw new Error("toDistrictId and toWardCode are required for GHN fee calculation")
  }

  // Accept either name — some setups use GHN_SHIPPING_DISTRICT_ID, others GHN_FROM_DISTRICT_ID
  const fromDistrictId = Number(process.env.GHN_FROM_DISTRICT_ID || process.env.GHN_SHIPPING_DISTRICT_ID)
  if (!fromDistrictId) {
    throw new Error("GHN district ID not set — add GHN_FROM_DISTRICT_ID (or GHN_SHIPPING_DISTRICT_ID) in Vercel env")
  }

  const res = await fetch(`${GHN_BASE}/v2/shipping-order/fee`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Token":  process.env.GHN_TOKEN,
      "ShopId": String(process.env.GHN_SHOP_ID),
    },
    body: JSON.stringify({
      service_type_id:  2,               // 2 = standard (< 20kg)
      from_district_id: fromDistrictId,  // your shop location
      to_district_id:   Number(toDistrictId),
      to_ward_code:     String(toWardCode),
      weight:           Math.max(1, Math.round(weight)),
      insurance_value:  Math.round(insuranceValue),
      coupon:           null,
    }),
  })

  const data = await res.json()

  if (data.code !== 200) {
    throw new Error(`GHN fee error (${data.code}): ${data.message}`)
  }

  const expectedDate = data.data.expected_delivery_time
  const estimatedDays = expectedDate
    ? Math.max(1, Math.ceil((new Date(expectedDate) - Date.now()) / 86_400_000))
    : 2

  return {
    fee:           data.data.total,
    estimatedDays,
    provider:      "GHN",
  }
}

/**
 * Create a GHN shipment (waybill).
 * Uses numeric IDs from the customer object for accuracy.
 */
export async function createGHNShipment(order) {
  const customer = order.customer || {}
  const items = (order.items || []).map(i => ({
    name:     i.name || i.product?.name || "Sản phẩm",
    quantity: i.qty,
    price:    i.price || i.product?.price || 0,
    weight:   150,
  }))

  const totalWeight = Math.max(1, items.reduce((s, i) => s + i.weight * i.quantity, 0))

  const body = {
    service_type_id:  2,
    to_name:          customer.name,
    to_phone:         customer.phone,
    to_address:       customer.address,
    to_ward_code:     customer.wardCode   || customer.ward     || "",
    to_district_id:   Number(customer.districtId)  || undefined,
    to_province_name: customer.provinceName || customer.province || "",
    // Fallback text names in case IDs are absent
    to_district_name: customer.districtName || customer.district || "",
    to_ward_name:     customer.wardName     || customer.ward     || "",
    weight:           totalWeight,
    cod_amount:       0,
    insurance_value:  order.total || 0,
    note:             order.note  || "",
    required_note:    "CHOXEMHANGKHONGTHU",
    items,
  }

  const res = await fetch(`${GHN_BASE}/v2/shipping-order/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Token":  process.env.GHN_TOKEN,
      "ShopId": String(process.env.GHN_SHOP_ID),
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  if (data.code !== 200) throw new Error(`GHN create error (${data.code}): ${data.message}`)

  return {
    trackingCode:     data.data.order_code,
    expectedDelivery: data.data.expected_delivery_time,
    fee:              data.data.total_fee,
    provider:         "GHN",
  }
}

// ── GHN Master Data ───────────────────────────────────────────────────────────

export async function getGHNProvinces() {
  const res = await fetch(`${GHN_BASE}/master-data/province`, {
    headers: { "Token": process.env.GHN_TOKEN },
  })
  const data = await res.json()
  return data.data || []
}

export async function getGHNDistricts(provinceId) {
  const res = await fetch(`${GHN_BASE}/master-data/district?province_id=${provinceId}`, {
    headers: { "Token": process.env.GHN_TOKEN },
  })
  const data = await res.json()
  return data.data || []
}

export async function getGHNWards(districtId) {
  const res = await fetch(`${GHN_BASE}/master-data/ward?district_id=${districtId}`, {
    headers: { "Token": process.env.GHN_TOKEN },
  })
  const data = await res.json()
  return data.data || []
}

// ─────────────────────────────────────────────────────────────────────────────
// GHTK
// ─────────────────────────────────────────────────────────────────────────────

export async function calcGHTKFee({ province, district, weight = 200, value = 0 }) {
  const params = new URLSearchParams({
    pick_province: "Hồ Chí Minh",  // ← your shop province
    pick_district: "Quận 7",       // ← your shop district
    province,
    district,
    weight:    String(weight),
    value:     String(value),
    transport: "road",
  })
  const res = await fetch(`${GHTK_BASE}/services/shipment/fee?${params}`, {
    headers: {
      "Token":          process.env.GHTK_TOKEN,
      "X-Client-Source": process.env.GHTK_TOKEN,
    },
  })
  const data = await res.json()
  if (!data.success) throw new Error(`GHTK fee error: ${data.message}`)
  return {
    fee:           data.fee.fee,
    estimatedDays: data.fee.delivery_time_to,
    provider:      "GHTK",
  }
}

export async function createGHTKShipment(order) {
  const customer = order.customer || {}
  const products = (order.items || []).map(i => ({
    name:         i.name || i.product?.name || "Sản phẩm",
    weight:       0.15,
    quantity:     i.qty,
    product_code: i.product?.sku || "",
  }))

  const res = await fetch(`${GHTK_BASE}/services/shipment/order`, {
    method: "POST",
    headers: {
      "Content-Type":    "application/json",
      "Token":           process.env.GHTK_TOKEN,
      "X-Client-Source": process.env.GHTK_TOKEN,
    },
    body: JSON.stringify({
      order: {
        id:            order.code,
        pick_name:     "Hanapet",
        pick_address:  "123 Đường ABC",   // ← your warehouse address
        pick_province: "Hồ Chí Minh",    // ← your province
        pick_district: "Quận 7",         // ← your district
        pick_tel:      "0901234567",      // ← your phone
        name:          customer.name,
        address:       customer.address,
        province:      customer.provinceName || customer.province || "",
        district:      customer.districtName || customer.district || "",
        tel:           customer.phone,
        note:          order.note || "",
        value:         order.total,
        pick_money:    0,
        transport:     "road",
        pick_option:   "cod",
      },
      products,
    }),
  })
  const data = await res.json()
  if (!data.success) throw new Error(`GHTK create error: ${data.message}`)
  return {
    trackingCode:      data.order?.label_id,
    estimatedPickup:   data.order?.estimated_pick_time,
    estimatedDelivery: data.order?.estimated_deliver_time,
    fee:               data.order?.fee,
    provider:          "GHTK",
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UNIFIED
// ─────────────────────────────────────────────────────────────────────────────

export async function createShipment(order) {
  const provider = process.env.SHIPPING_PROVIDER || "GHN"
  if (provider === "GHTK") return createGHTKShipment(order)
  return createGHNShipment(order)
}

export async function calcShippingFee(params) {
  const provider = process.env.SHIPPING_PROVIDER || "GHN"
  if (provider === "GHTK") return calcGHTKFee(params)
  return calcGHNFee(params)
}
