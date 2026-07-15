// app/api/subscribe/route.js
// ─────────────────────────────────────────────────────────────────────────────
// Popup newsletter signup. The voucher code is emailed server-side and is
// NEVER returned to the browser — previously the success message revealed
// the code to anyone who typed anything into the form.
//
// Env vars required for the email to actually send:
//   RESEND_API_KEY  — from https://resend.com (free tier: 100 emails/day)
//   RESEND_FROM     — verified sender, e.g. "Hanapet <hello@yourdomain.com>"
//                     (for testing you can use "Hanapet <onboarding@resend.dev>")
// If RESEND_API_KEY is missing, the subscriber is still saved and the API
// still returns success (we don't leak config state to visitors), but a
// warning is logged so you know emails aren't going out.
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js'

// ── Simple in-memory rate limit: 5 attempts / 10 min / IP ────────────────────
const attempts = new Map()
const WINDOW_MS = 10 * 60 * 1000
const MAX_ATTEMPTS = 5

function rateLimited(ip) {
  const now = Date.now()
  const rec = attempts.get(ip) || []
  const recent = rec.filter(t => now - t < WINDOW_MS)
  if (recent.length >= MAX_ATTEMPTS) return true
  recent.push(now)
  attempts.set(ip, recent)
  if (attempts.size > 5000) attempts.clear() // memory guard
  return false
}

const json = (body, status = 200) => Response.json(body, { status })

export async function POST(request) {
  try {
    const ip = (request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim()
    if (rateLimited(ip)) {
      return json({ error: 'Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút.' }, 429)
    }

    const body = await request.json().catch(() => ({}))
    const name  = String(body.name  || '').trim().slice(0, 100)
    const email = String(body.email || '').trim().toLowerCase().slice(0, 200)

    if (!name || name.length < 1) {
      return json({ error: 'Vui lòng nhập tên của bạn.' }, 400)
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return json({ error: 'Email không hợp lệ.' }, 400)
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // ── Save subscriber (ignore duplicate-email errors) ──────────────────────
    const { error: subErr } = await supabase.from('subscribers').insert({ name, email })
    if (subErr && subErr.code !== '23505') {
      console.error('Subscriber insert failed:', subErr)
      return json({ error: 'Đăng ký thất bại, vui lòng thử lại.' }, 500)
    }

    // ── Read the voucher code from popup config (server-side only) ──────────
    const { data: cfgRow } = await supabase
      .from('site_config')
      .select('value')
      .eq('key', 'popup')
      .single()
    const voucherCode = cfgRow?.value?.voucherCode || ''

    // ── Send the email via Resend REST API ──────────────────────────────────
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.warn('⚠️  RESEND_API_KEY not set — subscriber saved but voucher email NOT sent to', email)
    } else if (!voucherCode) {
      console.warn('⚠️  popup.voucherCode not set in admin — subscriber saved but no code to send')
    } else {
      const from = process.env.RESEND_FROM || 'Hanapet <onboarding@resend.dev>'
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [email],
          subject: `🎁 Mã giảm giá của bạn từ Hanapet`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px">
              <h2 style="color:#1b295b">🐾 Hanapet</h2>
              <p>Chào ${name.replace(/</g, '&lt;')},</p>
              <p>Cảm ơn bạn đã đăng ký! Đây là mã giảm giá của bạn:</p>
              <div style="background:#f2f5fb;border:2px dashed #1b295b;border-radius:12px;padding:18px;text-align:center;font-size:24px;font-weight:bold;color:#1b295b;letter-spacing:2px">${voucherCode}</div>
              <p>Nhập mã này ở bước thanh toán để được giảm giá.</p>
              <p style="color:#5f6c8f;font-size:12px;margin-top:24px">Hanapet — Hà Nội · In 3D thủ công 🐾</p>
            </div>
          `,
        }),
      })
      if (!emailRes.ok) {
        const errText = await emailRes.text().catch(() => '')
        console.error('Resend send failed:', emailRes.status, errText)
        // Don't fail the whole request — subscriber is saved; admin can follow up.
      }
    }

    // Success is returned regardless of email-config state — the code itself
    // is never included in this response.
    return json({ success: true })
  } catch (err) {
    console.error('Subscribe error:', err)
    return json({ error: 'Có lỗi xảy ra, vui lòng thử lại.' }, 500)
  }
}
