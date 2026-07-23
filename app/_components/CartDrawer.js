'use client';
// Drawer giỏ hàng + toast "đã thêm". Đây chính là hiệu ứng bị thiếu:
// trước đây nút "Thêm vào giỏ" là <a href="#"> nên chỉ nhảy về đầu trang.
import { useCart, vnd } from '../../lib/cart';
import { useEffect, useState } from 'react';
import { fetchConfig } from '../../lib/catalog';

// Chữ mặc định — bị ghi đè bởi site_config key='home' (luật: không hard-code)
const T = {
  navCart: 'Giỏ hàng',
  txtCartEmpty: 'Giỏ hàng đang trống',
  txtAddedToCart: 'Đã thêm vào giỏ',
  txtSubtotal: 'Tạm tính',
  txtCheckout: 'Thanh toán',
  txtViewCart: 'Xem giỏ hàng',
  txtShipNote: 'Phí ship tính ở bước thanh toán theo địa chỉ của ngài.',
  txtSeeProducts: 'Xem sản phẩm →',
};

export default function CartDrawer() {
  const { lines, setQty, remove, subtotal, count, drawer, closeDrawer, flash, hydrated } = useCart();
  const [S, setS] = useState(T);

  useEffect(() => {
    let alive = true;
    fetchConfig('home').then(c => { if (alive && c) setS(x => ({ ...x, ...c })); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  // Khóa scroll nền khi drawer mở
  useEffect(() => {
    if (!drawer) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = e => e.key === 'Escape' && closeDrawer();
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [drawer, closeDrawer]);

  if (!hydrated) return null;

  return (
    <>
      {/* Toast xác nhận — hiện ngay tại chỗ, không cuộn trang */}
      {flash && (
        <div className="hp-toast" role="status">
          <span className="hp-toast-ic">🐾</span>
          <div>
            <b>{S.txtAddedToCart}</b>
            <span>{flash.name}</span>
          </div>
        </div>
      )}

      <div className={'hp-scrim' + (drawer ? ' on' : '')} onClick={closeDrawer} aria-hidden={!drawer} />

      <aside className={'hp-drawer' + (drawer ? ' on' : '')} aria-label="Giỏ hàng" aria-hidden={!drawer}>
        <header>
          <b>{S.navCart} {count > 0 && <em>({count})</em>}</b>
          <button onClick={closeDrawer} aria-label="Đóng giỏ hàng">✕</button>
        </header>

        {lines.length === 0 ? (
          <div className="hp-empty">
            <span>🛒</span>
            <p>{S.txtCartEmpty}</p>
            <a href="/#sp" onClick={closeDrawer}>{S.txtSeeProducts}</a>
          </div>
        ) : (
          <>
            <div className="hp-lines">
              {lines.map(l => (
                <div className="hp-line" key={l.productId + '|' + (l.variantId || '')}>
                  <div className="hp-thumb">
                    {l.img ? <img src={l.img} alt="" /> : <span>🐾</span>}
                  </div>
                  <div className="hp-info">
                    <b>{l.name}</b>
                    {l.variantName && <span className="hp-var">{l.variantName}</span>}
                    <span className="hp-pr">{vnd(l.price)}</span>
                    <div className="hp-qty">
                      <button onClick={() => setQty(l.productId, l.variantId, l.qty - 1)} aria-label="Giảm">−</button>
                      <span>{l.qty}</span>
                      <button onClick={() => setQty(l.productId, l.variantId, l.qty + 1)} aria-label="Tăng">+</button>
                      <button className="hp-del" onClick={() => remove(l.productId, l.variantId)}>Xóa</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <footer>
              <div className="hp-sum">
                <span>{S.txtSubtotal}</span>
                <b>{vnd(subtotal)}</b>
              </div>
              <p className="hp-note">{S.txtShipNote}</p>
              <a className="hp-checkout" href="/thanh-toan" onClick={closeDrawer}>{S.txtCheckout}</a>
              <a className="hp-viewcart" href="/gio-hang" onClick={closeDrawer}>{S.txtViewCart}</a>
            </footer>
          </>
        )}
      </aside>

      <style jsx global>{`
/* Man mo NHAT va KHONG blur: khach van thay mascot nhay + the SP phia sau.
   Delay 760ms — mascot peek chay 1.15s, cho gan het roi drawer moi truot ra.
   Tung yeu cau tang them (truoc la 420ms). DUNG rut ngan lai. */
.hp-scrim{position:fixed;inset:0;background:rgba(12,20,40,.28);z-index:900;
  opacity:0;pointer-events:none;transition:opacity .5s ease .76s}
.hp-scrim.on{opacity:1;pointer-events:auto}
.hp-scrim:not(.on){transition:opacity .3s ease 0s}
.hp-drawer{position:fixed;top:0;right:0;bottom:0;width:min(420px,100vw);background:#fff;z-index:901;
  display:flex;flex-direction:column;transform:translateX(100%);transition:transform .62s cubic-bezier(.18,.72,.24,1) .76s;
  box-shadow:-10px 0 40px rgba(24,40,78,.2);font-family:var(--f-body)}
.hp-drawer.on{transform:translateX(0)}
.hp-drawer:not(.on){transition:transform .34s cubic-bezier(.4,0,.7,.5) 0s}
.hp-drawer header{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;
  border-bottom:1px solid rgba(24,40,78,.1)}
.hp-drawer header b{font-family:var(--f-display);font-weight:900;font-size:19px;color:#18284e}
.hp-drawer header em{font-style:normal;opacity:.55;font-weight:700}
.hp-drawer header button{width:36px;height:36px;border-radius:50%;border:none;background:rgba(24,40,78,.07);
  color:#18284e;font-size:15px;cursor:pointer}
.hp-lines{flex:1;overflow-y:auto;padding:8px 20px}
.hp-line{display:flex;gap:13px;padding:15px 0;border-bottom:1px solid rgba(24,40,78,.08)}
.hp-thumb{width:66px;height:80px;border-radius:11px;flex-shrink:0;overflow:hidden;
  background:linear-gradient(160deg,#2b3f70,#16244a);display:grid;place-items:center;font-size:22px}
.hp-thumb img{width:100%;height:100%;object-fit:contain}
.hp-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.hp-info b{font-family:var(--f-display);font-weight:800;font-size:14.5px;color:#18284e;line-height:1.3}
.hp-var{font-size:12.5px;color:rgba(27,36,64,.55);font-weight:600}
.hp-pr{font-family:var(--f-display);font-weight:900;font-size:16px;color:#18284e;margin-top:2px}
.hp-qty{display:flex;align-items:center;gap:6px;margin-top:7px}
.hp-qty button{width:29px;height:29px;border-radius:8px;border:1.5px solid rgba(24,40,78,.18);background:#fff;
  color:#18284e;font-size:15px;font-weight:700;cursor:pointer;line-height:1}
.hp-qty button:hover{border-color:#18284e}
.hp-qty span{min-width:26px;text-align:center;font-weight:800;font-size:14px;color:#18284e}
.hp-del{width:auto!important;padding:0 10px;font-size:12px!important;font-weight:700!important;
  border:none!important;color:rgba(27,36,64,.45)!important;margin-left:4px}
.hp-del:hover{color:#d64545!important}
.hp-drawer footer{padding:16px 20px 20px;border-top:1px solid rgba(24,40,78,.1);background:#fafbfd}
.hp-sum{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px}
.hp-sum span{font-size:14px;color:rgba(27,36,64,.65);font-weight:600}
.hp-sum b{font-family:var(--f-display);font-weight:900;font-size:23px;color:#18284e}
.hp-note{font-size:12px;color:rgba(27,36,64,.5);margin:0 0 13px;line-height:1.5}
.hp-checkout{display:block;text-align:center;background:#18284e;color:#fff;padding:15px;border-radius:999px;
  font-weight:800;font-size:15px;text-decoration:none;transition:.2s}
.hp-checkout:hover{background:#101c38}
.hp-viewcart{display:block;text-align:center;color:#18284e;padding:11px;font-weight:700;font-size:13.5px;
  text-decoration:none;opacity:.7}
.hp-viewcart:hover{opacity:1}
.hp-empty{flex:1;display:grid;place-content:center;text-align:center;gap:9px;padding:40px 20px}
.hp-empty span{font-size:40px}
.hp-empty p{color:rgba(27,36,64,.6);font-weight:600;margin:0}
.hp-empty a{color:#18284e;font-weight:800;text-decoration:none;font-size:14.5px}

.hp-toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:950;background:#18284e;color:#fff;
  padding:13px 20px;border-radius:16px;display:flex;align-items:center;gap:12px;
  box-shadow:0 14px 40px rgba(12,20,40,.35);animation:hptoast .3s cubic-bezier(.2,.8,.3,1);max-width:calc(100vw - 32px)}
.hp-toast-ic{font-size:22px}
.hp-toast div{display:flex;flex-direction:column;gap:2px;min-width:0}
.hp-toast b{font-family:var(--f-display);font-weight:900;font-size:14px}
.hp-toast span{font-size:12.5px;color:rgba(255,255,255,.7);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
@keyframes hptoast{from{opacity:0;transform:translateX(-50%) translateY(16px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
@media(prefers-reduced-motion:reduce){.hp-drawer,.hp-scrim,.hp-toast{transition:none;animation:none}}
      `}</style>
    </>
  );
}
