// app/api/voucher/validate/route.js
// ─────────────────────────────────────────────────────────────────────────────
// Validates a single voucher code submitted by the storefront and returns ONLY
// the discount percent for that exact code. It never returns the list of codes,
// so visitors can't enumerate them. Uses the service-role key to read the
// (non-public) vouchers table. Rate-limited to blunt brute-forcing.
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js'

const attempts = new Map()
const WINDOW_MS = 10 * 60 * 1000
const MAX_ATTEMPTS = 30

function rateLimited(ip) {
  const now = Date.now()
  const recent = (attempts.get(ip) || []).filter(t => now - t < WINDOW_MS)
  if (recent.length >= MAX_ATTEMPTS) return true
  recent.push(now)
  attempts.set(ip, recent)
  if (attempts.size > 5000) attempts.clear()
  return false
}

const json = (body, status = 200) => Response.json(body, { status })

export async function POST(request) {
  try {
    const ip = (request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim()
    if (rateLimited(ip)) return json({ valid: false, error: 'Thử lại sau ít phút.' }, 429)

    const body = await request.json().catch(() => ({}))
    const code = String(body.code || '').trim().toUpperCase().slice(0, 40)
    if (!code) return json({ valid: false })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    const { data, error } = await supabase
      .from('vouchers')
      .select('pct')
      .eq('code', code)
      .single()

    if (error || !data) return json({ valid: false })
    return json({ valid: true, pct: Number(data.pct) || 0 })
  } catch (err) {
    console.error('Voucher validate error:', err)
    return json({ valid: false, error: 'Có lỗi xảy ra.' }, 500)
  }
}
