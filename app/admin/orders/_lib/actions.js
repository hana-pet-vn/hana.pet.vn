'use client'
// app/admin/orders/_lib/actions.js
// ─────────────────────────────────────────────────────────────────────
// Các thao tác GHI của tab Đơn hàng, gom một chỗ để page.js gọn.
// Mỗi hàm nhận { toast, setOrders } từ trang — không giữ state riêng.
// ─────────────────────────────────────────────────────────────────────
import { updateOrderDB, restockOrder } from '../../../../lib/supabase'

const stamp = () => {
  const d = new Date(); const p = n => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`
}

const patchLocal = (setOrders, id, patch) =>
  setOrders(prev => (prev || []).map(o => o.id === id ? { ...o, ...patch } : o))

/* ── F6: Huỷ đơn + hoàn kho ───────────────────────────────────────────
   Thứ tự đã chốt: restockOrder TRƯỚC → đổi trạng thái SAU.
   Hoàn kho lỗi → đơn VẪN huỷ + cảnh báo kiểm kho tay (hành vi v20.1:
   thà lệch kho có cảnh báo còn hơn đơn huỷ hụt).
   Caller phải đảm bảo order.status !== 'Cancelled' (guard chống cộng đôi). */
export async function doCancelOrder({ order, reason, toast, setOrders }) {
  if (order.status === 'Cancelled') { toast.warn(`${order.code} đã huỷ rồi`); return }

  let restockFailed = false
  try { await restockOrder(order) }
  catch (e) {
    restockFailed = true
    toast.err(`⚠ Hoàn kho lỗi ở ${order.code}: ${e?.message || e} — đơn vẫn huỷ, KIỂM KHO TAY giúp.`, 9000)
  }

  const extra = [
    `[Huỷ ${stamp()}]`,
    reason ? reason : '',
    restockFailed ? '(hoàn kho LỖI — đã kiểm tay chưa?)' : '',
  ].filter(Boolean).join(' ')
  const note = ((order.note ? order.note + '\n' : '') + extra).slice(0, 500)

  try {
    await updateOrderDB(order.id, { status: 'Cancelled', note })
    patchLocal(setOrders, order.id, { status: 'Cancelled', note })
    toast.ok(`↩ ${order.code} đã huỷ${restockFailed ? '' : ' — kho đã cộng trả'}`)
    if (order.bigsellerExportedAt) {
      toast.warn(`⚠ ${order.code} ĐÃ xuất BigSeller — nhớ huỷ cả bên BS, nếu không BS vẫn in đơn này.`, 9000)
    }
  } catch (e) {
    toast.err(`✕ Không huỷ được ${order.code}: ${e?.message || e}` +
      (restockFailed ? '' : ' — LƯU Ý: kho ĐÃ cộng trả, kiểm lại tồn trước khi thử lại.'), 9000)
  }
}

/* ── F7 menu "…": trả về Chờ xác nhận (đường lùi DUY NHẤT trên UI) ── */
export async function doRevertToPending({ order, toast, setOrders }) {
  try {
    await updateOrderDB(order.id, { status: 'Pending' })
    patchLocal(setOrders, order.id, { status: 'Pending' })
    toast.ok(`↺ ${order.code} — đã trả về Chờ xác nhận`)
  } catch (e) { toast.err(`✕ Không đổi được ${order.code}: ${e?.message || e}`) }
}

/* Nút "Tạo vận đơn GHN từ web" đã CẮT hẳn 05/08/2026 theo quyết định
   chủ shop — vận đơn là việc của BigSeller, web không book hãng nào. */
