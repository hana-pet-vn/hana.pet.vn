'use client';
// app/_components/ProductModal.js
// ─────────────────────────────────────────────────────────────────────────────
// Popup xem nhanh sản phẩm. Bấm "Chi tiết" trên trang chủ → mở popup này,
// KHÔNG chuyển trang. URL vẫn đổi thành /san-pham/<slug> bằng history.pushState
// nên: dán link ra ngoài / Google bò vào → vẫn nhận TRANG THẬT đầy đủ HTML.
// Trang /san-pham/[slug]/page.js GIỮ NGUYÊN, không đụng vào.
//
// Đóng popup (nút X, phím Esc, bấm nền mờ, hoặc nút Back của trình duyệt)
// → URL quay lại chỗ cũ.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState, useCallback } from 'react';
import { fetchProductBySlug } from '../../lib/catalog';
import { useCart, vnd } from '../../lib/cart';

export default function ProductModal({ slug, onClose, S = {} }) {
  const { add, openDrawer } = useCart();
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [vi, setVi] = useState(0);
  const [imgIdx, setImgIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [on, setOn] = useState(false);

  const open = !!slug;

  /* ---- tải dữ liệu ---- */
  useEffect(() => {
    if (!slug) return;
    let alive = true;
    setLoading(true); setP(null); setVi(0); setImgIdx(0); setQty(1);
    (async () => {
      const prod = await fetchProductBySlug(slug);
      if (!alive) return;
      setP(prod); setLoading(false);
    })();
    return () => { alive = false; };
  }, [slug]);

  /* ---- URL: đẩy /san-pham/<slug> vào thanh địa chỉ ---- */
  useEffect(() => {
    if (!slug) return;
    const back = window.location.pathname + window.location.search;
    window.history.pushState({ hpModal: slug }, '', `/san-pham/${slug}`);
    const onPop = () => onClose && onClose(true); // true = đừng gọi history.back nữa
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      // nếu URL vẫn đang là trang SP mà popup đã đóng → trả URL về chỗ cũ
      if (window.location.pathname === `/san-pham/${slug}`) {
        window.history.replaceState({}, '', back);
      }
    };
  }, [slug, onClose]);

  /* ---- Esc + khoá cuộn nền ---- */
  useEffect(() => {
    if (!open) { setOn(false); return; }
    const t = setTimeout(() => setOn(true), 10);
    const onKey = e => { if (e.key === 'Escape') onClose && onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const addToCart = useCallback(() => {
    if (!p) return;
    const v = p.variants.length ? p.variants[vi] : null;
    const img = (v && v.img) || (p.images && p.images[imgIdx]) || p.img;
    for (let i = 0; i < qty; i++) add(p, v, img);
    onClose && onClose();
    openDrawer && openDrawer();
  }, [p, vi, imgIdx, qty, add, onClose, openDrawer]);

  if (!open) return null;

  const hasVar = p && p.variants.length > 0;
  const v = hasVar ? p.variants[vi] : null;
  const price = v ? v.price : (p ? p.price : 0);
  const was = v ? (v.was || 0) : (p ? (p.was || 0) : 0);
  const stock = v ? v.stock : (p ? p.stock : 0);
  const gallery = (p && p.images && p.images.length ? p.images : [p && p.img]).filter(Boolean);
  const save = was > price ? Math.round((1 - price / was) * 100) : 0;

  return (
    <>
      <div className={'pm-scrim' + (on ? ' on' : '')}
           onClick={() => onClose && onClose()} />

      <div className={'pm-box' + (on ? ' on' : '')}
           role="dialog" aria-modal="true"
           aria-label={p ? p.name : 'Chi tiết sản phẩm'}>

        <button type="button" className="pm-x" onClick={() => onClose && onClose()}
                aria-label="Đóng">✕</button>

        {loading && <div className="pm-load">Đang tải…</div>}

        {!loading && !p && (
          <div className="pm-load">
            <b>{S.pdNotFound || 'Không tìm thấy sản phẩm'}</b>
            <span>{S.pdNotFoundBody || ''}</span>
          </div>
        )}

        {!loading && p && (
          <div className="pm-grid">
            <div className="pm-left">
              <div className="pm-hero">
                {gallery[imgIdx]
                  ? <img src={(v && v.img) || gallery[imgIdx]} alt={p.name} />
                  : <span className="pm-ph">Chưa có ảnh</span>}
              </div>
              {gallery.length > 1 && (
                <div className="pm-thumbs">
                  {gallery.map((g, i) => (
                    <button key={i} className={'pm-th' + (i === imgIdx ? ' on' : '')}
                            onClick={() => setImgIdx(i)} aria-label={`Ảnh ${i + 1}`}>
                      <img src={g} alt="" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="pm-right">
              <h2>{p.name}</h2>
              {p.desc && <p className="pm-desc">{p.desc}</p>}

              {hasVar && (
                <>
                  <div className="pm-lbl">{S.wbsOptLabel || 'Chọn loại'}</div>
                  <div className="pm-vars">
                    {p.variants.map((x, i) => (
                      <button key={i}
                              className={'pm-chip' + (i === vi ? ' on' : '') + (x.stock <= 0 ? ' out' : '')}
                              onClick={() => setVi(i)}>{x.name}</button>
                    ))}
                  </div>
                </>
              )}

              <div className="pm-pricerow">
                <span className="pm-price">{vnd(price)}</span>
                {was > price && <span className="pm-was">{vnd(was)}</span>}
                {save > 0 && <span className="pm-save">Rẻ hơn {save}%</span>}
              </div>
              <div className={'pm-stock' + (stock <= 0 ? ' out' : '')}>
                {stock <= 0 ? (S.txtOutOfStock || 'Tạm hết hàng') : (S.txtInStock || 'Còn hàng')}
              </div>

              <div className="pm-buy">
                <div className="pm-qty">
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} aria-label="Bớt">−</button>
                  <span>{qty}</span>
                  <button onClick={() => setQty(q => Math.min(99, q + 1))} aria-label="Thêm">+</button>
                </div>
                <button type="button" className="pm-add cta-buy" disabled={stock <= 0}
                        onClick={addToCart}>
                  {stock <= 0 ? (S.txtOutOfStock || 'Tạm hết hàng') : (S.labelCart || 'Thêm vào giỏ')}
                </button>
              </div>

              {(S.trustPoints || []).length > 0 && (
                <ul className="pm-trust">
                  {S.trustPoints.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              )}

              {/* Link tới trang thật — cho khách muốn đọc kỹ, và cho Google lần ra */}
              <a className="pm-full" href={`/san-pham/${p.slug}`}>
                {S.pmFullPage || 'Xem trang đầy đủ'} →
              </a>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
.pm-scrim{position:fixed;inset:0;background:rgba(12,20,40,.42);z-index:960;
  opacity:0;transition:opacity .3s}
.pm-scrim.on{opacity:1}
.pm-box{position:fixed;left:50%;top:50%;z-index:961;width:min(920px,94vw);max-height:90vh;
  background:#fff;border-radius:20px;overflow:auto;font-family:'Nunito Sans',system-ui,sans-serif;
  box-shadow:0 30px 80px rgba(24,40,78,.3);
  transform:translate(-50%,-46%) scale(.97);opacity:0;
  transition:transform .38s cubic-bezier(.18,.8,.24,1),opacity .3s}
.pm-box.on{transform:translate(-50%,-50%) scale(1);opacity:1}
.pm-x{position:absolute;top:14px;right:14px;z-index:3;width:38px;height:38px;border:0;border-radius:50%;
  background:rgba(24,40,78,.08);color:#18284e;font-size:15px;cursor:pointer;transition:.2s}
.pm-x:hover{background:rgba(24,40,78,.16)}
.pm-load{padding:70px 24px;text-align:center;color:rgba(27,36,64,.6);display:flex;flex-direction:column;gap:8px}
.pm-load b{font-family:'Nunito';font-weight:900;font-size:19px;color:#18284e}

.pm-grid{display:grid;grid-template-columns:44% 1fr}
.pm-left{background:linear-gradient(168deg,#22345d,#16244a);padding:26px;display:flex;flex-direction:column;gap:12px}
.pm-hero{aspect-ratio:3/4;display:grid;place-items:center;border-radius:14px;overflow:hidden}
.pm-hero img{width:auto;height:auto;max-width:100%;max-height:100%;object-fit:contain;
  filter:drop-shadow(0 18px 34px rgba(0,0,0,.4))}
.pm-ph{font-size:12px;color:rgba(255,255,255,.4)}
.pm-thumbs{display:flex;gap:8px;flex-wrap:wrap}
.pm-th{width:52px;height:52px;border-radius:10px;overflow:hidden;padding:4px;cursor:pointer;
  background:rgba(255,255,255,.08);border:1.5px solid transparent;transition:.2s}
.pm-th.on{border-color:#fff}
.pm-th img{width:100%;height:100%;object-fit:contain}

.pm-right{padding:30px 32px;display:flex;flex-direction:column;gap:12px}
.pm-right h2{font-family:'Nunito';font-weight:900;font-size:24px;color:#18284e;line-height:1.24;
  margin:0;padding-right:40px}
.pm-desc{font-size:14.5px;color:rgba(27,36,64,.66);line-height:1.62;margin:0}
.pm-lbl{font-size:11.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:rgba(24,40,78,.55)}
.pm-vars{display:flex;gap:8px;flex-wrap:wrap}
.pm-chip{padding:9px 16px;border-radius:999px;border:1.5px solid rgba(24,40,78,.18);font-size:13px;
  font-weight:700;color:#18284e;background:#fff;cursor:pointer;transition:.2s;font-family:inherit}
.pm-chip.on{background:#18284e;color:#fff;border-color:#18284e}
.pm-chip.out{opacity:.45}

.pm-pricerow{display:flex;align-items:baseline;gap:9px;flex-wrap:wrap;margin-top:4px;
  padding-top:14px;border-top:1px solid rgba(24,40,78,.11)}
.pm-price{font-family:'Nunito';font-weight:900;font-size:30px;color:#18284e;letter-spacing:-.02em}
.pm-was{font-size:15px;color:rgba(27,36,64,.36);text-decoration:line-through}
.pm-save{font-size:11.5px;font-weight:800;color:#0f3b34;background:#d9f0eb;padding:4px 9px;border-radius:6px}
.pm-stock{font-size:12.5px;color:#2e7d4f;font-weight:700;display:flex;align-items:center;gap:6px}
.pm-stock::before{content:"";width:7px;height:7px;border-radius:50%;background:#2e7d4f}
.pm-stock.out{color:#c25050}
.pm-stock.out::before{background:#c25050}

.pm-buy{display:flex;gap:10px;margin-top:6px}
.pm-qty{display:flex;align-items:center;border:1.5px solid rgba(24,40,78,.18);border-radius:999px;
  overflow:hidden;flex-shrink:0}
.pm-qty button{width:40px;height:46px;border:0;background:none;font-size:17px;color:#18284e;cursor:pointer;
  font-family:inherit}
.pm-qty button:hover{background:rgba(24,40,78,.06)}
.pm-qty span{min-width:32px;text-align:center;font-weight:800;font-size:15px;color:#18284e}
.pm-add{flex:1;border:0;border-radius:999px;background:#18284e;color:#fff;font-family:'Nunito';
  font-weight:900;font-size:15px;padding:15px 20px;cursor:pointer;transition:.2s}
.pm-add:hover:not(:disabled){background:#0f1c3a}
.pm-add:disabled{opacity:.45;cursor:not-allowed}

.pm-trust{list-style:none;padding:0;margin:8px 0 0;display:flex;flex-direction:column;gap:7px}
.pm-trust li{font-size:13px;color:rgba(27,36,64,.66);display:flex;gap:9px;align-items:flex-start;line-height:1.5}
.pm-trust li::before{content:"✓";color:#2e7d4f;font-weight:900;flex-shrink:0}
.pm-full{margin-top:auto;padding-top:12px;font-size:13.5px;font-weight:800;color:#18284e;
  text-decoration:none;opacity:.7;transition:.2s}
.pm-full:hover{opacity:1}

@media(max-width:760px){
  .pm-box{width:100vw;height:100vh;max-height:100vh;border-radius:0;top:0;left:0;
    transform:translateY(24px);opacity:0}
  .pm-box.on{transform:translateY(0)}
  .pm-grid{grid-template-columns:1fr}
  .pm-left{padding:20px 20px 16px}
  .pm-hero{aspect-ratio:1;max-height:38vh}
  .pm-right{padding:22px 20px 30px}
  .pm-right h2{font-size:21px}
}
@media(prefers-reduced-motion:reduce){
  .pm-scrim,.pm-box{transition:none}
}
      `}</style>
    </>
  );
}
