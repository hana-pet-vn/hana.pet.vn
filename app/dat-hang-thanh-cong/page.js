'use client';
// app/dat-hang-thanh-cong/page.js — trang xác nhận sau khi đặt hàng thành công
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { fetchConfig } from '../../lib/catalog';

const T = {
  txtOrderOk: 'Đặt hàng thành công!',
  txtOrderOkBody: 'Cảm ơn ngài đã tin tưởng Hanapet. Tớ sẽ gọi xác nhận trong ít phút nữa.',
  okCode: 'Mã đơn hàng', okTotal: 'Tổng thanh toán (COD)',
  okKeep: 'Tiếp tục mua sắm', okHome: 'Về trang chủ',
  okNext: [
    'Tớ gọi xác nhận đơn trong 15–30 phút (giờ hành chính).',
    'Đơn nội thành Hà Nội giao trong 24h.',
    'Trả tiền mặt cho shipper, kiểm tra hàng trước khi thanh toán.',
  ],
};

function Success() {
  const sp = useSearchParams();
  const code = sp.get('code') || '';
  const total = Number(sp.get('total')) || 0;
  const [S, setS] = useState(T);
  useEffect(() => {
    let alive = true;
    fetchConfig('home').then(c => { if (alive && c) setS(x => ({ ...x, ...c })); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  return (
    <main className="ok-wrap">
      <div className="ok-card">
        <div className="ok-ic">🐾</div>
        <h1>{S.txtOrderOk}</h1>
        <p className="ok-lead">{S.txtOrderOkBody}</p>

        {code && (
          <div className="ok-box">
            <span>{S.okCode}</span>
            <b>{code}</b>
          </div>
        )}
        {total > 0 && (
          <div className="ok-box">
            <span>{S.okTotal}</span>
            <b>{total.toLocaleString('vi-VN')}₫</b>
          </div>
        )}

        <ul className="ok-next">
          {(S.okNext || []).map((t, i) => <li key={i}>{t}</li>)}
        </ul>

        <div className="ok-btns">
          <a className="ok-primary" href="/#sp">{S.okKeep}</a>
          <a className="ok-ghost" href="/">{S.okHome}</a>
        </div>
      </div>

      <style jsx global>{`
:root{--navy:#18284e;--navy-deep:#101c38;--cream:#f6f4ef;--ink:#1b2440}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--f-body);color:var(--ink);background:var(--cream)}
h1{font-family:var(--f-display);font-weight:900;letter-spacing:-.02em}
.ok-wrap{min-height:100vh;display:grid;place-items:center;padding:40px 5vw}
.ok-card{background:#fff;border-radius:26px;border:1px solid rgba(24,40,78,.1);padding:44px 36px;
  max-width:520px;width:100%;text-align:center;box-shadow:0 18px 50px rgba(24,40,78,.1)}
.ok-ic{font-size:56px;margin-bottom:14px}
.ok-card h1{font-size:29px;color:var(--navy);margin-bottom:11px}
.ok-lead{color:rgba(27,36,64,.66);line-height:1.65;margin-bottom:26px;font-size:15.5px}
.ok-box{display:flex;justify-content:space-between;align-items:baseline;background:rgba(24,40,78,.05);
  border-radius:13px;padding:14px 18px;margin-bottom:11px;text-align:left}
.ok-box span{font-size:13.5px;color:rgba(27,36,64,.62);font-weight:700}
.ok-box b{font-family:var(--f-display);font-weight:900;font-size:19px;color:var(--navy)}
.ok-next{list-style:none;text-align:left;display:flex;flex-direction:column;gap:10px;
  margin:24px 0;padding-top:22px;border-top:1px solid rgba(24,40,78,.1)}
.ok-next li{display:flex;gap:10px;font-size:14px;color:rgba(27,36,64,.7);font-weight:600;line-height:1.55}
.ok-next li::before{content:"✓";color:#2e7d4f;font-weight:900;flex-shrink:0}
.ok-btns{display:flex;gap:10px;flex-wrap:wrap}
.ok-primary,.ok-ghost{flex:1;min-width:150px;padding:15px;border-radius:999px;font-weight:800;
  font-size:14.5px;text-decoration:none;text-align:center;transition:.22s}
.ok-primary{background:var(--navy);color:#fff}
.ok-primary:hover{background:var(--navy-deep)}
.ok-ghost{border:2px solid rgba(24,40,78,.18);color:var(--navy)}
.ok-ghost:hover{border-color:var(--navy)}
      `}</style>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: '90px 5vw', textAlign: 'center' }}>Đang tải…</div>}>
      <Success />
    </Suspense>
  );
}
