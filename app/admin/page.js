// app/admin/page.js — CUTOVER 05/08/2026: /admin giờ là admin MỚI.
// Link cũ ai lỡ lưu vẫn vào đúng chỗ. Bản cũ còn tạm ở /admin-cu
// (chỉ dùng cho các phần chưa chuyển: Kho / Marketing / Trang trí).
import { redirect } from 'next/navigation'
export default function AdminRedirect() { redirect('/admin2') }
