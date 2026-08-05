// app/admin/orders/page.js — CUTOVER 05/08/2026: trang Đơn hàng cũ
// nhường chỗ cho trang mới /admin2/orders.
import { redirect } from 'next/navigation'
export default function AdminOrdersRedirect() { redirect('/admin2/orders') }
