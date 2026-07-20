'use client';
// app/gio-hang/page.js
// Trang giỏ hàng đầy đủ. Nav trên trang chủ trỏ tới /gio-hang nhưng route này
// chưa từng tồn tại — bấm vào là 404. Giờ đã có.
import { useState, useEffect } from 'react';
import { useCart, vnd } from '../../lib/cart';
import { fetchConfig } from '../../lib/catalog';

const T = {
  brandName: 'Hanapet', navCart: 'Giỏ hàng',
  txtCartEmpty: 'Giỏ hàng đang trống', txtCheckout: 'Thanh toán',
  txtSubtotal: 'Tạm tính', txtShipFee: 'Phí vận chuyển',
  ctKeepShopping: 'Tiếp tục mua →', ctEmptyBody: 'Chưa có sản phẩm nào. Ghé cửa hàng xem có gì hợp với bé nhé.',
  ctSeeProducts: 'Xem sản phẩm', ctLater: 'Tính ở bước sau', ctVoucherLater: 'Nhập ở bước sau',
  ctSummary: 'Tóm tắt đơn', ctVoucher: 'Mã giảm giá', ctGrand: 'Tổng tạm tính',
  ctClear: 'Xóa toàn bộ giỏ hàng', ctRemove: 'Xóa', ctPerItem: '/ sản phẩm',
  trustPoints: ['Thanh toán khi nhận hàng (COD)', 'Đổi trả trong 7 ngày', 'Giao Hà Nội trong 24h'],
};

export default function CartPage() {
  const { lines, setQty, remove, subtotal, count, hydrated, clear } = useCart();
  const [S, setS] = useState(T);
  useEffect(() => {
    let alive = true;
    fetchConfig('home').then(c => { if (alive && c) setS(x => ({ ...x, ...c })); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  return (
    <>
      <header className="ct-nav">
        <a className="ct-brand" href="/">{S.brandName}</a>
        <a className="ct-shop" href="/#sp">{S.ctKeepShopping}</a>
      </header>

      <main className="ct-wrap">
        <h1>{S.navCart} {count > 0 && <em>({count})</em>}</h1>

        {!hydrated ? (
          <p className="ct-load">Đang tải…</p>
        ) : lines.length === 0 ? (
          <div className="ct-empty">
            <span>🛒</span>
            <h2>{S.txtCartEmpty}</h2>
            <p>{S.ctEmptyBody}</p>
            <a className="ct-cta" href="/#sp">{S.ctSeeProducts}</a>
          </div>
        ) : (
          <div className="ct-grid">
            <div className="ct-list">
              {lines.map(l => (
                <div className="ct-row" key={l.productId + '|' + (l.variantId || '')}>
                  <div className="ct-img">
                    {l.img ? <img src={l.img} alt="" /> : <span>🐾</span>}
                  </div>
                  <div className="ct-mid">
                    <b>{l.name}</b>
                    {l.variantName && <span className="ct-var">{l.variantName}</span>}
                    <span className="ct-unit">{vnd(l.price)} {S.ctPerItem}</span>
                    <div className="ct-ctl">
                      <div className="ct-qty">
                        <button onClick={() => setQty(l.productId, l.variantId, l.qty - 1)} aria-label="Giảm">−</button>
                        <span>{l.qty}</span>
                        <button onClick={() => setQty(l.productId, l.variantId, l.qty + 1)} aria-label="Tăng">+</button>
                      </div>
                      <button className="ct-rm" onClick={() => remove(l.productId, l.variantId)}>{S.ctRemove}</button>
                    </div>
                  </div>
                  <div className="ct-line">{vnd(l.price * l.qty)}</div>
                </div>
              ))}
              <button className="ct-clear" onClick={clear}>{S.ctClear}</button>
            </div>

            <aside className="ct-sum">
              <h2>{S.ctSummary}</h2>
              <div className="ct-srow"><span>{S.txtSubtotal}</span><b>{vnd(subtotal)}</b></div>
              <div className="ct-srow muted"><span>{S.txtShipFee}</span><b>{S.ctLater}</b></div>
              <div className="ct-srow muted"><span>{S.ctVoucher}</span><b>{S.ctVoucherLater}</b></div>
              <div className="ct-total"><span>{S.ctGrand}</span><b>{vnd(subtotal)}</b></div>
              <a className="ct-checkout" href="/thanh-toan">{S.txtCheckout}</a>
              <ul className="ct-trust">
                {(S.trustPoints || []).map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </aside>
          </div>
        )}
      </main>

      <style jsx global>{`
:root{--navy:#18284e;--navy-deep:#101c38;--cream:#f6f4ef;--ink:#1b2440}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Nunito Sans',system-ui,sans-serif;color:var(--ink);background:var(--cream)}
h1,h2{font-family:'Nunito',system-ui,sans-serif;font-weight:900;letter-spacing:-.02em}
img{display:block;max-width:100%}
button{font:inherit}

.ct-nav{display:flex;align-items:center;justify-content:space-between;padding:14px 5vw;background:var(--navy)}
.ct-brand{font-family:'Nunito';font-weight:900;font-size:20px;color:#fff;text-decoration:none}
.ct-shop{color:rgba(255,255,255,.82);text-decoration:none;font-weight:700;font-size:14px}
.ct-shop:hover{color:#fff}

.ct-wrap{max-width:1120px;margin:0 auto;padding:34px 5vw 90px}
.ct-wrap h1{font-size:clamp(26px,3.4vw,36px);color:var(--navy);margin-bottom:26px}
.ct-wrap h1 em{font-style:normal;font-size:.55em;font-weight:700;color:rgba(27,36,64,.5)}
.ct-load{color:rgba(27,36,64,.5);font-weight:600}

.ct-empty{text-align:center;padding:70px 20px;background:#fff;border-radius:22px;border:1px solid rgba(24,40,78,.1)}
.ct-empty span{font-size:52px;display:block;margin-bottom:14px}
.ct-empty h2{font-size:22px;color:var(--navy);margin-bottom:8px}
.ct-empty p{color:rgba(27,36,64,.6);margin-bottom:22px}
.ct-cta{display:inline-block;background:var(--navy);color:#fff;padding:14px 30px;border-radius:999px;
  font-weight:800;text-decoration:none}

.ct-grid{display:grid;grid-template-columns:1fr 340px;gap:26px;align-items:start}
@media(max-width:900px){.ct-grid{grid-template-columns:1fr}}

.ct-list{background:#fff;border-radius:20px;border:1px solid rgba(24,40,78,.1);padding:6px 22px 18px}
.ct-row{display:flex;gap:16px;padding:20px 0;border-bottom:1px solid rgba(24,40,78,.09);align-items:flex-start}
.ct-row:last-of-type{border-bottom:none}
.ct-img{width:86px;height:104px;border-radius:13px;flex-shrink:0;overflow:hidden;
  background:linear-gradient(160deg,#2b3f70,#16244a);display:grid;place-items:center;font-size:26px}
.ct-img img{width:100%;height:100%;object-fit:contain}
.ct-mid{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.ct-mid b{font-family:'Nunito';font-weight:800;font-size:16px;color:var(--navy);line-height:1.3}
.ct-var{font-size:13px;color:rgba(27,36,64,.55);font-weight:600}
.ct-unit{font-size:13px;color:rgba(27,36,64,.5);font-weight:600}
.ct-ctl{display:flex;align-items:center;gap:12px;margin-top:9px}
.ct-qty{display:flex;align-items:center;gap:3px;border:1.5px solid rgba(24,40,78,.16);border-radius:999px;padding:3px 5px}
.ct-qty button{width:31px;height:31px;border-radius:50%;border:none;background:transparent;color:var(--navy);
  font-size:17px;font-weight:700;cursor:pointer;line-height:1}
.ct-qty button:hover{background:rgba(24,40,78,.07)}
.ct-qty span{min-width:28px;text-align:center;font-weight:800;font-size:14px;color:var(--navy)}
.ct-rm{background:none;border:none;color:rgba(27,36,64,.45);font-size:13px;font-weight:700;cursor:pointer}
.ct-rm:hover{color:#d64545}
.ct-line{font-family:'Nunito';font-weight:900;font-size:18px;color:var(--navy);white-space:nowrap}
@media(max-width:560px){
  .ct-row{flex-wrap:wrap}
  .ct-line{width:100%;text-align:right}
}
.ct-clear{background:none;border:none;color:rgba(27,36,64,.42);font-size:13px;font-weight:700;
  cursor:pointer;margin-top:16px;padding:0}
.ct-clear:hover{color:#d64545}

.ct-sum{background:#fff;border-radius:20px;border:1px solid rgba(24,40,78,.1);padding:24px;position:sticky;top:22px}
.ct-sum h2{font-size:18px;color:var(--navy);margin-bottom:18px}
.ct-srow{display:flex;justify-content:space-between;align-items:baseline;padding:9px 0;font-size:14.5px}
.ct-srow span{color:rgba(27,36,64,.65);font-weight:600}
.ct-srow b{color:var(--navy);font-weight:800}
.ct-srow.muted b{color:rgba(27,36,64,.45);font-weight:700;font-size:13px}
.ct-total{display:flex;justify-content:space-between;align-items:baseline;padding:16px 0 18px;margin-top:6px;
  border-top:1px solid rgba(24,40,78,.12)}
.ct-total span{font-weight:700;color:var(--navy);font-size:15px}
.ct-total b{font-family:'Nunito';font-weight:900;font-size:25px;color:var(--navy)}
.ct-checkout{display:block;text-align:center;background:var(--navy);color:#fff;padding:16px;border-radius:999px;
  font-weight:800;font-size:15.5px;text-decoration:none;transition:.22s}
.ct-checkout:hover{background:var(--navy-deep)}
.ct-trust{list-style:none;display:flex;flex-direction:column;gap:8px;margin-top:18px}
.ct-trust li{display:flex;gap:9px;font-size:13px;color:rgba(27,36,64,.6);font-weight:600}
.ct-trust li::before{content:"✓";color:#2e7d4f;font-weight:900}
      `}</style>
    </>
  );
}
