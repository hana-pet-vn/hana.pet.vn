// app/admin/login/page.js — CUTOVER 05/08/2026: đăng nhập dồn về một cửa.
import { redirect } from 'next/navigation'
export default function AdminLoginRedirect() { redirect('/admin2/login') }
