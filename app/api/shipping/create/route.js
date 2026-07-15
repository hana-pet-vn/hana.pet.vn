import { createShipment } from '../../../../lib/shipping'
import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { orderId } = await request.json()
    const { data: order, error } = await supabase
      .from('orders').select('*').eq('id', orderId).single()
    if (error || !order) return Response.json({ error: 'Order not found' }, { status: 404 })

    const shipment = await createShipment(order)

    await supabase.from('orders').update({
      tracking_code: shipment.trackingCode,
      status: 'Shipped',
      est_delivery: shipment.expectedDelivery || '',
      updated_at: new Date().toISOString(),
    }).eq('id', orderId)

    return Response.json({ success: true, shipment })
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 })
  }
}
