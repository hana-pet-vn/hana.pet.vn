// app/api/reviews/route.js
// Verified-purchase reviews with multi-layer spam protection:
// 1. Must match a Delivered order containing the product (server-verified, not trusted from client)
// 2. One review per phone number per product (enforced by DB unique constraint)
// 3. Basic content filtering (links, repeated chars, length)
// 4. Per-IP rate limit on submission attempts

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ── Simple in-memory rate limiter (per IP) ──
const ipLog = new Map()
const RATE_LIMIT = 5      // max submission attempts
const WINDOW_MS  = 600_000 // per 10 minutes

function isRateLimited(ip) {
  const now  = Date.now()
  const hits = (ipLog.get(ip) || []).filter(t => now - t < WINDOW_MS)
  hits.push(now)
  ipLog.set(ip, hits)
  return hits.length > RATE_LIMIT
}

// ── Content spam checks ──
function looksLikeSpam(text) {
  const t = text.trim()
  if (t.length < 5 || t.length > 500) return 'Review must be 5–500 characters'
  if (/https?:\/\/|www\./i.test(t)) return 'Links are not allowed in reviews'
  if (/(.)\1{6,}/.test(t)) return 'Please write a real review'
  const linkish = (t.match(/[a-z0-9]+\.[a-z]{2,}/gi) || []).length
  if (linkish > 2) return 'Review looks like spam'
  return null
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const productId = searchParams.get('productId')
  if (!productId) return Response.json({ error: 'productId required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('reviews')
    .select('id, customer_name, rating, text, created_at')
    .eq('product_id', productId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ reviews: data })
}

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (isRateLimited(ip)) {
    return Response.json({ error: 'Too many attempts. Please wait a few minutes.' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const { productId, phone, rating, text } = body

    if (!productId || !phone || !rating || !text) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }
    const ratingNum = Number(rating)
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return Response.json({ error: 'Rating must be 1–5' }, { status: 400 })
    }

    const spamReason = looksLikeSpam(text)
    if (spamReason) {
      return Response.json({ error: spamReason }, { status: 400 })
    }

    // ── Verify purchase: find a Delivered order with this phone containing this product ──
    const { data: orders, error: ordErr } = await supabaseAdmin
      .from('orders')
      .select('id, items, customer, status')
      .eq('status', 'Delivered')

    if (ordErr) return Response.json({ error: 'Could not verify purchase' }, { status: 500 })

    const normalizedPhone = phone.replace(/\D/g, '')
    const matchingOrder = (orders || []).find(o => {
      const orderPhone = (o.customer?.phone || '').replace(/\D/g, '')
      if (orderPhone !== normalizedPhone || !orderPhone) return false
      const items = o.items || []
      return items.some(it => (it.product?.id || it.productId || it.id) === productId)
    })

    if (!matchingOrder) {
      return Response.json({
        error: 'We could not find a delivered order with this phone number for this product. Only verified buyers can leave a review.'
      }, { status: 403 })
    }

    const { error: insErr } = await supabaseAdmin.from('reviews').insert({
      product_id: productId,
      order_id: matchingOrder.id,
      customer_name: matchingOrder.customer?.name || 'Anonymous',
      customer_phone: normalizedPhone,
      rating: ratingNum,
      text: text.trim(),
    })

    if (insErr) {
      if (insErr.code === '23505') { // unique constraint violation
        return Response.json({ error: 'You have already reviewed this product' }, { status: 409 })
      }
      return Response.json({ error: insErr.message }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
