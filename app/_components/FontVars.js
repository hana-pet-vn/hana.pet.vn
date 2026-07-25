'use client';
/* app/_components/FontVars.js — v22
   ============================================================
   MỘT NGUỒN DUY NHẤT CHO PHÔNG CHỮ TOÀN SITE.

   Vì sao có file này:
   Trước đây chỉ trang chủ tự nạp phông từ admin. Các trang phụ
   (chi tiết SP, giỏ hàng, thanh toán, đặt hàng thành công) đều
   dùng var(--f-display)/var(--f-body) nhưng KHÔNG ai gán giá trị
   → chúng luôn ăn giá trị ghi cứng trong layout.js, tức là đổi
   phông trong admin không có tác dụng ở những trang đó.

   File này đặt trong layout.js nên chạy cho MỌI trang: đọc phông
   từ site_config key 'home', gán vào biến CSS, và nạp file phông
   từ Google.

   Dùng `html:root` chứ không phải `:root` là CỐ Ý: layout.js có
   khối `:root` khai giá trị mặc định. Hai khối cùng cấp thì khối
   nào đứng sau thắng — mà thứ tự chèn của Next.js không chắc
   chắn. `html:root` có độ ưu tiên cao hơn nên LUÔN thắng, không
   phụ thuộc thứ tự.

   ĐỪNG khai lại --f-display / --f-body ở bất kỳ đâu khác. Đúng
   lỗi đó (một khối :root thứ hai ghi đè) đã làm phông không đổi
   được suốt từ V21.1 tới V22.
   ============================================================ */
import { useEffect, useState } from 'react';
import { fetchConfig } from '../../lib/catalog';

/* Phông mặc định — đã nạp sẵn trong layout.js nên không cần xin Google lại */
const CO_SAN = ['Nunito', 'Nunito Sans'];

export default function FontVars() {
  const [f, setF] = useState(null);

  /* nạp tên phông từ admin */
  useEffect(() => {
    let alive = true;
    fetchConfig('home')
      .then(c => {
        if (!alive || !c) return;
        setF({ d: (c.fontDisplay || '').trim(), b: (c.fontBody || '').trim() });
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  /* nạp file phông từ Google khi tên phông đổi */
  useEffect(() => {
    if (!f) return;
    const fams = [f.d, f.b].filter(x => x && !CO_SAN.includes(x));
    const cu = document.getElementById('hp-dyn-font');
    if (cu) cu.remove();
    if (!fams.length) return;

    /* Dùng API css BẢN CŨ, không dùng css2. css2 trả lỗi nếu xin một
       độ đậm mà phông không có (Quicksand tối đa 700, Baloo 2 tối đa
       800) → hỏng cả gói, không nạp được gì. Bản cũ bỏ qua độ đậm
       thiếu và vẫn trả về phần có. */
    const q = [...new Set(fams)]
      .map(x => 'family=' + x.replace(/\s+/g, '+') + ':400,600,700,800,900')
      .join('&');

    const link = document.createElement('link');
    link.id = 'hp-dyn-font';
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css?${q}&display=swap`;
    document.head.appendChild(link);
  }, [f]);

  if (!f) return null;

  return (
    <style>{`html:root{--f-display:'${f.d || 'Nunito'}',system-ui,sans-serif;--f-body:'${f.b || 'Nunito Sans'}',system-ui,sans-serif}`}</style>
  );
}
