// app/api/webhook/ghtk/route.js
// ─────────────────────────────────────────────────────────────────────────────
// Receives GHTK delivery status updates.
// Verifies the X-Checksum header before trusting the payload.
//
// Add to your .env.local:
//   GHTK_WEBHOOK_SECRET=your_ghtk_webhook_secret
//   (get this from your GHTK merchant dashboard under Webhook settings)
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { WEB_STATUS_ORDER } from '../../../../lib/bigseller'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY  // service role — bypass RLS
  )
}

// GHTK sends a checksum as HMAC-SHA256 of the raw body using your webhook secret
function verifyGHTKSignature(rawBody, signature) {
  const secret = process.env.GHTK_WEBHOOK_SECRET
  if (!secret) {
    // FAIL CLOSED: without a configured secret we cannot verify anything,
    // so reject all webhook calls. (Set GHTK_WEBHOOK_SECRET in Vercel env
    // when you enable GHTK webhooks — until then this endpoint stays shut.)
    console.warn('⚠️  GHTK_WEBHOOK_SECRET not set — rejecting webhook call')
    return false
  }
  if (!signature) return false

  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')

  // Use timingSafeEqual to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    )
  } catch {
    return false
  }
}

// Map GHTK status codes to your internal order statuses
const STATUS_MAP = {
  '-1':  'Cancelled',
  '1':   'Pending',
  '2':   'Confirmed',
  '3':   'Packing',
  '4':   'Handed to GHN',
  '5':   'In Transit',
  '6':   'Delivered',
  '7':   'In Transit',   // returning
  '8':   'Cancelled',    // return complete
  '9':   'In Transit',   // delivery attempted
  '10':  'In Transit',   // out for delivery
  '11':  'Delivered',
  '12':  'In Transit',   // delay
}

export async function POST(request) {
  // Read raw body for signature verification
  const rawBody = await request.text()
  const signature = request.headers.get('x-checksum') || request.headers.get('x-ghtk-signature')

  // ── Verify signature ──────────────────────────────────────────────────────
  if (!verifyGHTKSignature(rawBody, signature)) {
    console.error('GHTK webhook: invalid signature')
    return Response.json({ success: false, error: 'Invalid signature' }, { status: 401 })
  }

  try {
    const body = JSON.parse(rawBody)
    const { label_id, status_id, status_text } = body

    if (!label_id) {
      return Response.json({ success: false, error: 'Missing label_id' }, { status: 400 })
    }

    /* Phase 1 F8 — hai chỗ vá, giữ nguyên phần verify chữ ký ở trên:
       1. Trạng thái lạ → KHÔNG đoán, không ghi status_text thô vào DB nữa.
       2. Luật CHỈ-ĐẨY-TỚI như đối soát F5: webhook đến muộn/lặp không được
          kéo đơn đi lùi. Ngoại lệ duy nhất: 'Cancelled' luôn thắng. */
    const internalStatus = STATUS_MAP[String(status_id)]
    if (!internalStatus) {
      console.warn(`GHTK webhook: status_id lạ "${status_id}" (${status_text}) — bỏ qua, không đoán`)
      return Response.json({ success: true, skipped: 'unknown status' })
    }

    const supabase = getServiceClient()

    // Tìm đơn trước để so trạng thái hiện tại (thay vì update mù)
    const { data: found, error: findErr } = await supabase
      .from('orders')
      .select('id, status')
      .eq('tracking_code', label_id)
      .limit(1)

    if (findErr) {
      console.error('GHTK webhook DB find error:', findErr)
      return Response.json({ success: false }, { status: 500 })
    }
    if (!found?.length) {
      // Không có đơn nào mang mã vận đơn này (đơn kênh khác) — nhận rồi bỏ qua
      return Response.json({ success: true, skipped: 'no matching order' })
    }

    const cur = found[0].status || 'Pending'
    const allowed = (() => {
      if (internalStatus === cur) return false
      if (internalStatus === 'Cancelled') return cur !== 'Cancelled'   // Huỷ luôn thắng
      if (cur === 'Cancelled' || cur === 'Return Check') return false  // không kéo đơn đã chốt sổ
      const a = WEB_STATUS_ORDER.indexOf(cur)
      const c = WEB_STATUS_ORDER.indexOf(internalStatus)
      if (a >= 0 && c >= 0 && c <= a) return false                     // chỉ đẩy tới
      return true
    })()

    if (!allowed) {
      return Response.json({ success: true, skipped: `no-backward (${cur} → ${internalStatus})` })
    }

    const { error } = await supabase
      .from('orders')
      .update({
        status:     internalStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', found[0].id)

    if (error) {
      console.error('GHTK webhook DB update error:', error)
      return Response.json({ success: false }, { status: 500 })
    }

    // Đơn đổi trạng thái → Supabase realtime tự bắn về trang Đơn hàng (F1)
    return Response.json({ success: true })

  } catch (err) {
    console.error('GHTK webhook parse error:', err)
    return Response.json({ success: false, error: 'Bad request' }, { status: 400 })
  }
}
