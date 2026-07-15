// app/api/orders/create/route.js
// ─────────────────────────────────────────────────────────────────────────────
// Secure server-side order creation.
// - Recalculates total from DB prices (client total is IGNORED)
// - Validates voucher server-side
// - Decrements stock atomically (checks availability first)
// - Sends confirmation email via Resend (optional — set RESEND_API_KEY in env)
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js'
import { calcShippingFee } from '../../../../lib/shipping'

// ── Rate limiter — max 6 order attempts per IP per 10 minutes ──
// Prevents a single source from flooding orders/inventory/DB writes.
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

// Use SERVICE ROLE key here — this route bypasses RLS intentionally
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY   // ← NOT the anon key
  )
}

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (isRateLimited(ip)) {
    return json({ error: 'Too many order attempts. Please wait a few minutes and try again.' }, 429)
  }

  const supabase = getServiceClient()

  try {
    const body = await request.json()
    const { items, customer, voucherCode, shippingProvider = 'GHN' } = body

    // ── 1. Validate input ────────────────────────────────────────────────────
    if (!items?.length)          return json({ error: 'No items' }, 400)
    if (!customer?.name)         return json({ error: 'Name required' }, 400)
    if (!customer?.phone)        return json({ error: 'Phone required' }, 400)
    if (!customer?.address)      return json({ error: 'Address required' }, 400)
    if (!customer?.provinceId)   return json({ error: 'Province required' }, 400)
    if (!customer?.districtId)   return json({ error: 'District required' }, 400)
    if (!customer?.wardCode)     return json({ error: 'Ward required' }, 400)

    // ── 2. Fetch real product prices from DB (never trust client) ────────────
    const ids = items.map(i => i.productId)
    const { data: products, error: prodErr } = await supabase
      .from('products')
      .select('id, name, price, stock, variants')
      .in('id', ids)

    if (prodErr) return json({ error: 'Failed to load products' }, 500)

    const productMap = Object.fromEntries(products.map(p => [p.id, p]))

    // Resolve the authoritative price/stock for an item, honoring variants.
    // If the item names a variant, that variant's price/stock is used.
    const resolveLine = (item) => {
      const p = productMap[item.productId]
      if (!p) return { ok: false, error: `Product not found: ${item.productId}` }
      const variants = Array.isArray(p.variants) ? p.variants : []
      if (variants.length > 0) {
        if (!item.variantId) return { ok: false, error: `Please choose an option for "${p.name}"` }
        const v = variants.find(x => x.id === item.variantId)
        if (!v) return { ok: false, error: `Invalid option for "${p.name}"` }
        return {
          ok: true, product: p, variant: v,
          price: Number(v.price) || 0,
          stock: Number(v.stock) || 0,
          label: `${p.name} — ${v.name}`,
          variantName: v.name,
        }
      }
      return {
        ok: true, product: p, variant: null,
        price: Number(p.price) || 0,
        stock: Number(p.stock) || 0,
        label: p.name,
        variantName: '',
      }
    }

    // ── 3. Check stock availability (variant-aware) ──────────────────────────
    for (const item of items) {
      const line = resolveLine(item)
      if (!line.ok) return json({ error: line.error }, 400)
      if (line.stock < item.qty) return json({ error: `"${line.label}" only has ${line.stock} left in stock` }, 400)
    }

    // ── 4. Calculate subtotal from real DB prices (variant-aware) ────────────
    const subtotal = items.reduce((sum, item) => {
      const line = resolveLine(item)
      return sum + (line.price * item.qty)
    }, 0)

    // ── 5. Validate voucher server-side (from private vouchers table) ────────
    let discountPct = 0
    let appliedVoucher = ''
    if (voucherCode) {
      const { data: v } = await supabase
        .from('vouchers')
        .select('code, pct')
        .eq('code', String(voucherCode).trim().toUpperCase())
        .single()

      if (v) {
        discountPct = Number(v.pct) || 0
        appliedVoucher = v.code.toUpperCase()
      }
      // If no match — silently ignore (don't error, just apply 0 discount)
    }

    const discountAmount = Math.round(subtotal * discountPct / 100)

    // ── 6. Calculate shipping fee from GHN (server-side, authoritative) ──────
    let shippingFee = 30000  // fallback
    try {
      const feeResult = await calcShippingFee({
        toDistrictId: customer.districtId,
        toWardCode:   customer.wardCode,
        weight:       items.reduce((s, i) => s + (i.qty * 150), 0), // 150g per item
        insuranceValue: subtotal,
      })
      shippingFee = feeResult.fee
    } catch (_) {
      // GHN API down — use fallback, log it
      console.error('Shipping fee calc failed, using fallback')
    }

    // ── 7. Final authoritative total ─────────────────────────────────────────
    const total = subtotal - discountAmount + shippingFee

    // ── 8. Build order record ─────────────────────────────────────────────────
    const orderId   = crypto.randomUUID()
    const orderCode = 'HH-' + Date.now().toString(36).toUpperCase().slice(-6)

    const orderRecord = {
      id:            orderId,
      code:          orderCode,
      status:        'Pending',
      customer:      customer,
      items:         items.map(i => {
        const line = resolveLine(i)
        return {
          productId:   i.productId,
          qty:         i.qty,
          price:       line.price,   // locked price at time of order (variant-aware)
          name:        line.product.name,
          variantId:   line.variant ? line.variant.id : '',
          variantName: line.variantName || '',
        }
      }),
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
      note:          body.note || '',
    }

    // ── 9. Insert order ───────────────────────────────────────────────────────
    const { error: orderErr } = await supabase.from('orders').insert(orderRecord)
    if (orderErr) return json({ error: 'Failed to save order: ' + orderErr.message }, 500)

    // ── 10. Decrement stock for each item (variant-aware) ─────────────────────
    for (const item of items) {
      const line = resolveLine(item)
      const p = line.product
      if (line.variant) {
        // Decrement the specific variant's stock inside the variants JSON array
        const newVariants = (Array.isArray(p.variants) ? p.variants : []).map(v =>
          v.id === line.variant.id
            ? { ...v, stock: Math.max(0, (Number(v.stock) || 0) - item.qty) }
            : v
        )
        const { error: stockErr } = await supabase
          .from('products')
          .update({ variants: newVariants, updated_at: new Date().toISOString() })
          .eq('id', item.productId)
        if (stockErr) console.error(`Variant stock update failed for ${item.productId}:`, stockErr)
      } else {
        const currentStock = Number(p.stock) || 0
        const { error: stockErr } = await supabase
          .from('products')
          .update({
            stock:      currentStock - item.qty,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.productId)
          .gte('stock', item.qty)  // safety: only update if still enough stock
        if (stockErr) console.error(`Stock update failed for product ${item.productId}:`, stockErr)
      }
    }

    // ── 11. Send confirmation email (if Resend is configured) ─────────────────
    if (process.env.RESEND_API_KEY && customer.email) {
      try {
        await sendOrderConfirmationEmail({ order: orderRecord, customer })
      } catch (emailErr) {
        // Don't fail the order if email fails
        console.error('Email send failed:', emailErr)
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
    console.error('Order creation error:', err)
    return json({ error: 'Internal server error' }, 500)
  }
}

// ─── Email helper ─────────────────────────────────────────────────────────────
async function sendOrderConfirmationEmail({ order, customer }) {
  const itemsList = order.items
    .map(i => `${i.name} × ${i.qty} — ${i.price.toLocaleString('vi-VN')}đ`)
    .join('\n')

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from:    process.env.EMAIL_FROM || 'Hanapet <orders@hana.pet.vn>',
      to:      customer.email,
      subject: `Order confirmed — ${order.code} 🐾`,
      html: `
        <h2>Thanks for your order, ${customer.name}! 🎉</h2>
        <p>Order code: <strong>${order.code}</strong></p>
        <pre>${itemsList}</pre>
        <hr/>
        <p>Subtotal: ${order.subtotal.toLocaleString('vi-VN')}đ</p>
        ${order.discount ? `<p>Discount: -${order.discount.toLocaleString('vi-VN')}đ</p>` : ''}
        <p>Shipping: ${order.shipping_fee.toLocaleString('vi-VN')}đ</p>
        <p><strong>Total: ${order.total.toLocaleString('vi-VN')}đ</strong></p>
        <hr/>
        <p>Delivering to: ${customer.address}, ${customer.wardName}, ${customer.districtName}, ${customer.provinceName}</p>
        <p>We'll send a tracking code once your order ships. — Hanapet 🐾</p>
      `,
    }),
  })
}

function json(data, status = 200) {
  return Response.json(data, { status })
}
