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

    const internalStatus = STATUS_MAP[String(status_id)] || status_text || 'In Transit'

    const supabase = getServiceClient()
    const { error } = await supabase
      .from('orders')
      .update({
        status:     internalStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('tracking_code', label_id)

    if (error) {
      console.error('GHTK webhook DB update error:', error)
      return Response.json({ success: false }, { status: 500 })
    }

    return Response.json({ success: true })

  } catch (err) {
    console.error('GHTK webhook parse error:', err)
    return Response.json({ success: false, error: 'Bad request' }, { status: 400 })
  }
}
