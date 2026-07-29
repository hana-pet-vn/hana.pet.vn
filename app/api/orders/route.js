// app/api/orders/create/route.js
// ─────────────────────────────────────────────────────────────────────────────
// Tạo đơn phía server.
// - Giá lấy lại từ CSDL, không tin giá client gửi
// - Kiểm mã giảm giá phía server
// - v22: GỘP các dòng trùng SKU rồi trừ kho MỘT LẦN qua hàm hp_place_order()
//        → kiểm kho + trừ kho + ghi đơn nằm trong một giao dịch, được ăn cả
//        ngã về không. Sửa lỗi "mua 2 mùi chỉ trừ 1 mùi" và bán quá kho khi
//        hai khách bấm cùng lúc.
// - v22: CHẶN đơn có món giá 0đ (quên điền giá = bán không công)
// - Gửi email xác nhận qua Resend (tuỳ chọn)
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js'
import { calcShippingFee } from '../../../../lib/shipping'

// ── Chặn spam — tối đa 6 lần đặt đơn / IP / 10 phút ──
// LƯU Ý: bộ nhớ này nằm trong từng tiến trình. Trên Vercel mỗi tiến trình một
// bản riêng nên tác dụng hạn chế. Muốn chặn thật phải dùng Upstash/Redis.
const ipLog = new Map()
const RATE_LIMIT = 6
const WINDOW_MS  = 600_000

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

// Dùng SERVICE ROLE key — route này cố ý bỏ qua RLS
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY   // ← KHÔNG phải anon key
  )
}

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (isRateLimited(ip)) {
    return json({ error: 'Bạn thao tác hơi nhanh. Đợi vài phút rồi thử lại giúp shop nhé.' }, 429)
  }

  const supabase = getServiceClient()

  try {
    const body = await request.json()
    const { items, customer, voucherCode, shippingProvider = 'GHN' } = body

    // ── 1. Kiểm đầu vào ──────────────────────────────────────────────────────
    if (!items?.length)          return json({ error: 'Giỏ hàng đang trống' }, 400)
    if (!customer?.name)         return json({ error: 'Thiếu tên người nhận' }, 400)
    if (!customer?.phone)        return json({ error: 'Thiếu số điện thoại' }, 400)
    if (!customer?.address)      return json({ error: 'Thiếu địa chỉ' }, 400)
    if (!customer?.provinceId)   return json({ error: 'Thiếu tỉnh/thành' }, 400)
    if (!customer?.districtId)   return json({ error: 'Thiếu quận/huyện' }, 400)
    if (!customer?.wardCode)     return json({ error: 'Thiếu phường/xã' }, 400)

    for (const it of items) {
      const q = Number(it?.qty)
      if (!Number.isInteger(q) || q <= 0 || q > 999) {
        return json({ error: 'Số lượng không hợp lệ' }, 400)
      }
    }

    // ── 2. Lấy giá/kho THẬT từ CSDL (không bao giờ tin client) ───────────────
    const ids = [...new Set(items.map(i => i.productId))]
    const { data: products, error: prodErr } = await supabase
      .from('products')
      .select('id, name, price, stock, variants, combos')
      .in('id', ids)

    if (prodErr) return json({ error: 'Không tải được sản phẩm' }, 500)

    const productMap = Object.fromEntries((products || []).map(p => [p.id, p]))

    // Xác định giá/kho thật cho một dòng hàng, có tính tới phân loại và combo.
    // v20: variantId CÓ THỂ là id combo (combo đóng vai phân loại trong giỏ).
    // Khớp variants trước, không thấy thì khớp combos.
    const resolveLine = (item) => {
      const p = productMap[item.productId]
      if (!p) return { ok: false, error: `Không tìm thấy sản phẩm: ${item.productId}` }
      const variants = Array.isArray(p.variants) ? p.variants : []
      const combos   = Array.isArray(p.combos)   ? p.combos   : []

      if (item.variantId) {
        const v = variants.find(x => x.id === item.variantId)
        if (v) {
          return {
            ok: true, product: p, variant: v, combo: null,
            price: Number(v.price) || 0,
            stock: Number(v.stock) || 0,
            label: `${p.name} — ${v.name}`,
            variantName: v.name,
          }
        }
        const c = combos.find(x => x.id === item.variantId)
        if (c) {
          // variantName từ client CHỈ là chữ hiển thị (tên mùi khách chọn) —
          // giá/kho vẫn lấy từ CSDL. Cắt 120 ký tự cho an toàn.
          const cn = String(item.variantName || '').slice(0, 120) || c.name
          // v20.1 KHO MỘT NGUỒN: combo có BOM thì "còn bán được" TÍNH từ kho
          // món con ('' = SP gốc, '*scent*' = mùi khách chọn qua scentId,
          // còn lại = id phân loại). Không có BOM (kiểu cũ) → dùng c.stock.
          const bom = Array.isArray(c.bom) ? c.bom : []
          let stock
          if (bom.length) {
            stock = Infinity
            for (const row of bom) {
              let s
              if (row.variantId === '*scent*') {
                const sv = variants.find(x => x.id === item.scentId)
                s = sv ? Number(sv.stock) || 0 : 0
              } else if (row.variantId) {
                const rv = variants.find(x => x.id === row.variantId)
                s = rv ? Number(rv.stock) || 0 : 0
              } else s = Number(p.stock) || 0
              stock = Math.min(stock, Math.floor(s / (Number(row.qty) || 1)))
            }
            if (stock === Infinity) stock = 0
          } else {
            stock = Number(c.stock) || 0
          }
          return {
            ok: true, product: p, variant: null, combo: c,
            price: Number(c.price) || 0,
            stock,
            label: `${p.name} — ${cn}`,
            variantName: cn,
          }
        }
        return { ok: false, error: `Lựa chọn không hợp lệ cho "${p.name}"` }
      }

      if (variants.length > 0) return { ok: false, error: `Vui lòng chọn phân loại cho "${p.name}"` }
      return {
        ok: true, product: p, variant: null, combo: null,
        price: Number(p.price) || 0,
        stock: Number(p.stock) || 0,
        label: p.name,
        variantName: '',
      }
    }

    // Giải một lần, dùng lại nhiều nơi (bản cũ gọi resolveLine 4 lần mỗi dòng)
    const lines = []
    for (const item of items) {
      const line = resolveLine(item)
      if (!line.ok) return json({ error: line.error }, 400)
      lines.push({ item, line })
    }

    // ── 3. CHẶN ĐƠN 0Đ ───────────────────────────────────────────────────────
    // Web không bán món tặng kèm nào, nên giá 0 = quên điền giá trong admin.
    // Không chặn thì khách chỉ trả phí ship còn hàng thì đi không công.
    for (const { line } of lines) {
      if (!(line.price > 0)) {
        return json({ error: `"${line.label}" chưa có giá. Shop đang cập nhật, bạn nhắn shop giúp nhé.` }, 400)
      }
    }

    // ── 4. Gộp thành danh sách trừ kho phẳng ─────────────────────────────────
    // Bung BOM của combo, rồi GỘP theo khoá productId|variantId|comboId.
    // Đây là chỗ sửa hai lỗi cũ:
    //   · mua 2 mùi cùng một sản phẩm → bản cũ chỉ trừ mùi cuối
    //   · combo + món lẻ cùng ăn một kho → bản cũ kiểm riêng từng dòng, lọt
    const decMap = new Map()
    const addDec = ({ productId, variantId = '', comboId = '', qty }) => {
      if (!(qty > 0)) return
      const key = `${productId}|${variantId}|${comboId}`
      const cur = decMap.get(key)
      if (cur) cur.qty += qty
      else decMap.set(key, { productId, variantId, comboId, qty })
    }

    for (const { item, line } of lines) {
      const qty = Number(item.qty)
      const pid = item.productId

      if (line.variant) {
        addDec({ productId: pid, variantId: line.variant.id, qty })
      } else if (line.combo) {
        const bom = Array.isArray(line.combo.bom) ? line.combo.bom : []
        if (bom.length) {
          for (const row of bom) {
            const rq = (Number(row.qty) || 1) * qty
            if (row.variantId === '*scent*') {
              if (!item.scentId) {
                return json({ error: `Vui lòng chọn mùi cho "${line.label}"` }, 400)
              }
              addDec({ productId: pid, variantId: String(item.scentId), qty: rq })
            } else if (row.variantId) {
              addDec({ productId: pid, variantId: String(row.variantId), qty: rq })
            } else {
              addDec({ productId: pid, qty: rq })
            }
          }
        } else {
          // combo kiểu cũ: trừ kho của chính combo
          addDec({ productId: pid, comboId: line.combo.id, qty })
        }
      } else {
        addDec({ productId: pid, qty })
      }
    }
    const decrements = [...decMap.values()]

    // ── 5. Kiểm kho sơ bộ để báo lỗi cho dễ hiểu ─────────────────────────────
    // Hàm SQL vẫn kiểm lại lần nữa (đó mới là chốt thật). Ở đây chỉ để câu báo
    // lỗi nói rõ thiếu món nào, thay vì trả về lỗi CSDL thô.
    for (const d of decrements) {
      const p = productMap[d.productId]
      if (!p) return json({ error: 'Sản phẩm không còn tồn tại' }, 400)
      let have = 0
      let what = p.name
      if (d.variantId) {
        const v = (Array.isArray(p.variants) ? p.variants : []).find(x => x.id === d.variantId)
        have = v ? Number(v.stock) || 0 : 0
        what = v ? `${p.name} — ${v.name}` : p.name
      } else if (d.comboId) {
        const c = (Array.isArray(p.combos) ? p.combos : []).find(x => x.id === d.comboId)
        have = c ? Number(c.stock) || 0 : 0
        what = c ? `${p.name} — ${c.name}` : p.name
      } else {
        have = Number(p.stock) || 0
      }
      if (have < d.qty) {
        return json({ error: `"${what}" chỉ còn ${have} sản phẩm` }, 400)
      }
    }

    // ── 6. Tính tiền hàng từ giá thật trong CSDL ─────────────────────────────
    const subtotal = lines.reduce((sum, { item, line }) => sum + line.price * Number(item.qty), 0)
    if (!(subtotal > 0)) return json({ error: 'Đơn hàng không hợp lệ' }, 400)

    // ── 7. Kiểm mã giảm giá phía server ──────────────────────────────────────
    let discountPct = 0
    let appliedVoucher = ''
    if (voucherCode) {
      const { data: vs } = await supabase
        .from('vouchers')
        .select('code, pct')
        .eq('code', String(voucherCode).trim().toUpperCase())
        .limit(1)

      const v = Array.isArray(vs) ? vs[0] : null
      if (v) {
        discountPct = Number(v.pct) || 0
        appliedVoucher = String(v.code).toUpperCase()
      }
      // Không khớp → lặng lẽ bỏ qua, giảm 0
    }

    const discountAmount = Math.round(subtotal * discountPct / 100)

    // ── 8. Tính phí ship từ GHN (server tự gọi, đây mới là số thật) ──────────
    let shippingFee = 30000  // dự phòng khi GHN lỗi
    try {
      const feeResult = await calcShippingFee({
        toDistrictId: customer.districtId,
        toWardCode:   customer.wardCode,
        weight:       items.reduce((s, i) => s + (Number(i.qty) * 150), 0), // 150g/món
        insuranceValue: subtotal,
      })
      shippingFee = feeResult.fee
    } catch (_) {
      console.error('Tính phí ship lỗi, dùng phí dự phòng')
    }

    // ── 9. Tổng cuối cùng ────────────────────────────────────────────────────
    const total = subtotal - discountAmount + shippingFee

    // ── 10. Dựng bản ghi đơn ─────────────────────────────────────────────────
    const orderId   = crypto.randomUUID()
    // v22: tiền tố HP- (Hanapet). Bản cũ dùng HH- là mã của dự án khác.
    const orderCode = 'HP-' + Date.now().toString(36).toUpperCase().slice(-6)

    const orderRecord = {
      id:            orderId,
      code:          orderCode,
      status:        'Pending',
      customer:      customer,
      items:         lines.map(({ item, line }) => ({
        productId:   item.productId,
        qty:         Number(item.qty),
        price:       line.price,   // giá khoá tại thời điểm đặt
        name:        line.product.name,
        // v20.1: lưu cả id combo (trước đây combo bị ghi '' → huỷ đơn không
        // biết hoàn kho món nào) + scentId cho BOM '*scent*'
        variantId:   line.variant ? line.variant.id : (line.combo ? line.combo.id : ''),
        variantName: line.variantName || '',
        scentId:     String(item.scentId || ''),
      })),
      total,
      subtotal,
      discount:      discountAmount,
      disc_pct:      discountPct,
      voucher:       appliedVoucher,
      shipping:      shippingProvider,
      shipping_fee:  shippingFee,
      tracking_code: '',
      est_delivery:  '',
      source:        'website',
      note:          String(body.note || '').slice(0, 500),
    }

    // ── 11. TRỪ KHO + GHI ĐƠN trong MỘT giao dịch ────────────────────────────
    // Hàm hp_place_order khoá từng dòng products, kiểm đủ kho, trừ, rồi ghi
    // đơn. Sai bất kỳ bước nào → cuộn ngược sạch, không còn cảnh "đơn tạo
    // được nhưng kho không trừ" như bản cũ.
    const { error: rpcErr } = await supabase.rpc('hp_place_order', {
      p_order: orderRecord,
      p_dec:   decrements,
    })

    if (rpcErr) {
      const msg = String(rpcErr.message || '')
      if (msg.includes('HP_OUT_OF_STOCK')) {
        const m = msg.match(/HP_OUT_OF_STOCK:([^|]*)\|(\d+)/)
        return json({ error: m
          ? `"${m[1]}" chỉ còn ${m[2]} sản phẩm. Có người vừa đặt trước bạn.`
          : 'Một sản phẩm vừa hết hàng. Bạn kiểm lại giỏ giúp shop nhé.' }, 409)
      }
      if (msg.includes('HP_NO_PRODUCT') || msg.includes('HP_NO_VARIANT') || msg.includes('HP_NO_COMBO')) {
        return json({ error: 'Sản phẩm vừa được cập nhật. Bạn tải lại trang giúp shop nhé.' }, 409)
      }
      console.error('hp_place_order lỗi:', rpcErr)
      return json({ error: 'Không lưu được đơn. Bạn thử lại giúp shop nhé.' }, 500)
    }

    // ── 12. Gửi email xác nhận (nếu đã cấu hình Resend) ──────────────────────
    if (process.env.RESEND_API_KEY && customer.email) {
      try {
        await sendOrderConfirmationEmail({ order: orderRecord, customer })
      } catch (emailErr) {
        // Email lỗi thì đơn vẫn tính là thành công
        console.error('Gửi email lỗi:', emailErr)
      }
    }

    return json({
      success: true,
      orderId,
      orderCode,
      total,
      shippingFee,
      discountAmount,
    })

  } catch (err) {
    console.error('Lỗi tạo đơn:', err)
    return json({ error: 'Lỗi hệ thống' }, 500)
  }
}

// ─── Email ────────────────────────────────────────────────────────────────────
async function sendOrderConfirmationEmail({ order, customer }) {
  const itemsList = order.items
    .map(i => `${i.name}${i.variantName ? ' — ' + i.variantName : ''} × ${i.qty} — ${i.price.toLocaleString('vi-VN')}đ`)
    .join('\n')

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      // v22: đọc cả hai tên biến để không phụ thuộc đặt tên nào trên Vercel
      from:    process.env.RESEND_FROM || process.env.EMAIL_FROM || 'Hanapet <orders@hana.pet.vn>',
      to:      customer.email,
      subject: `Hanapet đã nhận đơn của bạn — ${order.code} 🐾`,
      html: `
        <h2>Cảm ơn bạn ${customer.name} đã đặt hàng! 🎉</h2>
        <p>Mã đơn: <strong>${order.code}</strong></p>
        <pre>${itemsList}</pre>
        <hr/>
        <p>Tiền hàng: ${order.subtotal.toLocaleString('vi-VN')}đ</p>
        ${order.discount ? `<p>Giảm giá: -${order.discount.toLocaleString('vi-VN')}đ</p>` : ''}
        <p>Phí vận chuyển: ${order.shipping_fee.toLocaleString('vi-VN')}đ</p>
        <p><strong>Tổng cộng: ${order.total.toLocaleString('vi-VN')}đ</strong></p>
        <hr/>
        <p>Giao tới: ${customer.address}, ${customer.wardName}, ${customer.districtName}, ${customer.provinceName}</p>
        <p>Shop sẽ báo mã vận đơn ngay khi hàng được gửi đi. — Hanapet 🐾</p>
      `,
    }),
  })
}

function json(data, status = 200) {
  return Response.json(data, { status })
}
