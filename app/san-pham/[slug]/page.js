'use client';
// app/san-pham/[slug]/page.js
// ─────────────────────────────────────────────────────────────────────────────
// Trang chi tiết sản phẩm. Trước đây route này KHÔNG tồn tại — nút "Chi tiết"
// trên trang chủ trỏ tới /san-pham/misty-fresh và trả về 404. Giờ trang này đọc
// thẳng từ bảng `products`, nên sửa gì trong admin là hiện ra ngay.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState, use } from 'react';
import { fetchProductBySlug, fetchProducts, fetchConfig } from '../../../lib/catalog';
import { useCart, vnd } from '../../../lib/cart';

export default function ProductPage({ params }) {
  const { slug } = use(params);
  const { add, openDrawer, count } = useCart();

  const [S, setS] = useState({
    brandName: 'Hanapet', navShop: 'Cửa hàng', navCart: 'Giỏ hàng',
    labelCart: 'Thêm vào giỏ', txtOutOfStock: 'Tạm hết hàng',
    pdStory: 'Về sản phẩm', pdReviews: 'Ba mẹ pet nói gì', pdMore: 'Sản phẩm khác',
    pdNotFound: 'Không tìm thấy sản phẩm',
    pdNotFoundBody: 'Sản phẩm này có thể đã được đổi tên hoặc gỡ khỏi cửa hàng.',
    trustPoints: ['Đổi trả trong 7 ngày', 'Thanh toán khi nhận hàng (COD)', 'An toàn cho bé, không cồn không paraben'],
    footerText: '© 2026 Hanapet · hana.pet.vn · Hà Nội',
  });
  const [p, setP] = useState(null);
  const [others, setOthers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vi, setVi] = useState(0);
  const [imgIdx, setImgIdx] = useState(0);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [prod, all, cfg] = await Promise.all([
        fetchProductBySlug(slug), fetchProducts(), fetchConfig('home'),
      ]);
      if (!alive) return;
      if (cfg) setS(x => ({ ...x, ...cfg }));
      setP(prod);
      setOthers(all.filter(x => x.slug !== slug).slice(0, 3));
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [slug]);

  if (loading) return <Shell><div className="pd-load">Đang tải…</div><Styles /></Shell>;
  if (!p) return (
    <Shell>
      <div className="pd-404">
        <h1>{S.pdNotFound}</h1>
        <p>{S.pdNotFoundBody}</p>
        <a className="pd-btn" href="/#sp">← Về cửa hàng</a>
      </div>
      <Styles />
    </Shell>
  );

  const hasVar = p.variants.length > 0;
  const v = hasVar ? p.variants[vi] : null;
  const price = hasVar ? v.price : p.price;
  const orig  = hasVar ? v.original : p.original;
  const stock = hasVar ? v.stock : p.stock;
  const savePct = orig > price ? Math.round((1 - price / orig) * 100) : 0;

  // Ảnh: ảnh phân loại (nếu có) đứng đầu, rồi ảnh chính, rồi gallery
  const gallery = [ (hasVar && v.img) || '', p.img, ...p.images ].filter(Boolean);
  const uniq = [...new Set(gallery)];
  const mainImg = uniq[Math.min(imgIdx, uniq.length - 1)] || '';

  const onAdd = () => {
    if (stock <= 0) return;
    add({
      productId: p.id,
      variantId: hasVar ? v.id : '',
      name: p.name,
      variantName: hasVar ? v.name : '',
      price,
      img: mainImg,
    }, qty);
    openDrawer();
  };

  return (
    <Shell S={S} count={count} onCart={openDrawer}>
      <div className="pd-wrap">
        <nav className="pd-crumb">
          <a href="/">Trang chủ</a> <span>/</span> <a href="/#sp">Cửa hàng</a> <span>/</span> <b>{p.name}</b>
        </nav>

        <div className="pd-grid">
          {/* ẢNH */}
          <div className="pd-media">
            <div className="pd-main">
              {mainImg ? <img src={mainImg} alt={p.name} /> : <div className="pd-ph">Chưa có ảnh</div>}
              {p.flashSale && <span className="pd-flag">Flash sale</span>}
            </div>
            {uniq.length > 1 && (
              <div className="pd-thumbs">
                {uniq.map((src, i) => (
                  <button key={i} className={'pd-th' + (i === imgIdx ? ' on' : '')}
                          onClick={() => setImgIdx(i)} aria-label={`Ảnh ${i + 1}`}>
                    <img src={src} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* THÔNG TIN */}
          <div className="pd-info">
            {p.category && <div className="pd-cat">{p.category}</div>}
            <h1>{p.name}</h1>
            {p.subtitle && <p className="pd-sub">{p.subtitle}</p>}

            {p.rating > 0 && (
              <div className="pd-rate">
                <span className="pd-stars" style={{ '--pct': `${(p.rating / 5) * 100}%` }}>★★★★★</span>
                <b>{p.rating.toFixed(1)}</b>
                {p.reviews.length > 0 && <em>· {p.reviews.length} đánh giá</em>}
              </div>
            )}

            <div className="pd-prices">
              <span className="pd-price">{vnd(price)}</span>
              {orig > price && <span className="pd-was">{vnd(orig)}</span>}
              {savePct > 0 && <span className="pd-save">Rẻ hơn {savePct}%</span>}
            </div>

            {hasVar && (
              <div className="pd-block">
                <div className="pd-label">{p.variantLabel}</div>
                <div className="pd-vars">
                  {p.variants.map((x, i) => (
                    <button key={x.id || i}
                            className={'pd-chip' + (i === vi ? ' on' : '') + (x.stock <= 0 ? ' out' : '')}
                            onClick={() => { setVi(i); setImgIdx(0); setQty(1); }}>
                      <span>{x.name}</span>
                      <em>{vnd(x.price)}</em>
                      {x.stock <= 0 && <i>Hết hàng</i>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className={'pd-stock' + (stock <= 0 ? ' out' : '')}>
              {stock <= 0 ? S.txtOutOfStock : `Còn ${stock} sản phẩm`}
            </div>

            <div className="pd-buy">
              <div className="pd-qty">
                <button onClick={() => setQty(q => Math.max(1, q - 1))} aria-label="Giảm">−</button>
                <span>{qty}</span>
                <button onClick={() => setQty(q => Math.min(stock || 1, q + 1))} aria-label="Tăng">+</button>
              </div>
              <button className="pd-add" onClick={onAdd} disabled={stock <= 0}>
                {stock <= 0 ? S.txtOutOfStock : `${S.labelCart} — ${vnd(price * qty)}`}
              </button>
            </div>

            <ul className="pd-trust">
              {(S.trustPoints || []).map((t, i) => <li key={i}>{t}</li>)}
            </ul>

            {p.story && (
              <div className="pd-story">
                <h2>{S.pdStory}</h2>
                {p.story.split('\n').filter(Boolean).map((para, i) => <p key={i}>{para}</p>)}
              </div>
            )}

            {p.sku && <div className="pd-sku">Mã SP: {p.sku}</div>}
          </div>
        </div>

        {/* ĐÁNH GIÁ */}
        {p.reviews.length > 0 && (
          <section className="pd-reviews">
            <h2>{S.pdReviews}</h2>
            <div className="pd-rlist">
              {p.reviews.map((r, i) => (
                <div className="pd-rcard" key={i}>
                  {r.rating > 0 && (
                    <span className="pd-stars sm" style={{ '--pct': `${(Number(r.rating) / 5) * 100}%` }}>★★★★★</span>
                  )}
                  {r.text && <p>{r.text}</p>}
                  <b>{r.name || r.who || 'Khách hàng'}</b>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SẢN PHẨM KHÁC */}
        {others.length > 0 && (
          <section className="pd-more">
            <h2>{S.pdMore}</h2>
            <div className="pd-mgrid">
              {others.map(o => (
                <a className="pd-mcard" href={`/san-pham/${o.slug}`} key={o.id}>
                  <div className="pd-mimg">{o.img ? <img src={o.img} alt="" /> : <span>🐾</span>}</div>
                  <b>{o.name}</b>
                  <em>{vnd(o.variants.length ? Math.min(...o.variants.map(x => x.price)) : o.price)}</em>
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
      <Styles />
    </Shell>
  );
}

function Shell({ children, count = 0, onCart, S = {} }) {
  return (
    <>
      <header className="pd-nav">
        <a className="pd-brand" href="/">{S.brandName || 'Hanapet'}</a>
        <div className="pd-navr">
          <a href="/#sp">{S.navShop || 'Cửa hàng'}</a>
          <button onClick={onCart}>{S.navCart || 'Giỏ hàng'}{count > 0 && <em>{count}</em>}</button>
        </div>
      </header>
      <main>{children}</main>
      <footer className="pd-foot">{S.footerText || '© 2026 Hanapet'}</footer>
    </>
  );
}

function Styles() {
  return (
    <style jsx global>{`
:root{--navy:#18284e;--navy-deep:#101c38;--cream:#f6f4ef;--ink:#1b2440}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--f-body);color:var(--ink);background:var(--cream)}
h1,h2,h3{font-family:var(--f-display);font-weight:900;letter-spacing:-.02em}
img{display:block;max-width:100%}
button{font:inherit}

.pd-nav{position:sticky;top:0;z-index:60;display:flex;align-items:center;justify-content:space-between;
  padding:13px 5vw;background:var(--navy);color:#fff}
.pd-brand{font-family:var(--f-display);font-weight:900;font-size:20px;color:#fff;text-decoration:none}
.pd-navr{display:flex;align-items:center;gap:18px}
.pd-navr a{color:rgba(255,255,255,.82);text-decoration:none;font-weight:700;font-size:14px}
.pd-navr a:hover{color:#fff}
.pd-navr button{background:#fff;color:var(--navy);border:none;padding:9px 19px;border-radius:999px;
  font-weight:800;font-size:14px;cursor:pointer;display:inline-flex;align-items:center;gap:7px}
.pd-navr button em{font-style:normal;background:var(--navy);color:#fff;border-radius:999px;min-width:20px;
  height:20px;display:grid;place-items:center;font-size:11.5px;padding:0 5px}

.pd-wrap{max-width:1180px;margin:0 auto;padding:26px 5vw 80px}
.pd-load{padding:100px 5vw;text-align:center;color:rgba(27,36,64,.5);font-weight:600}
.pd-404{padding:90px 5vw;text-align:center;max-width:520px;margin:0 auto}
.pd-404 h1{font-size:29px;color:var(--navy);margin-bottom:12px}
.pd-404 p{color:rgba(27,36,64,.62);margin-bottom:24px;line-height:1.6}
.pd-btn{display:inline-block;background:var(--navy);color:#fff;padding:14px 28px;border-radius:999px;
  font-weight:800;text-decoration:none}

.pd-crumb{font-size:13px;color:rgba(27,36,64,.5);margin-bottom:24px;font-weight:600}
.pd-crumb a{color:rgba(27,36,64,.6);text-decoration:none}
.pd-crumb a:hover{color:var(--navy)}
.pd-crumb span{margin:0 7px;opacity:.5}
.pd-crumb b{color:var(--navy)}

.pd-grid{display:grid;grid-template-columns:1fr 1fr;gap:clamp(26px,4vw,56px);align-items:start}
@media(max-width:900px){.pd-grid{grid-template-columns:1fr}}

.pd-media{position:sticky;top:88px}
@media(max-width:900px){.pd-media{position:static}}
.pd-main{position:relative;aspect-ratio:1;border-radius:22px;overflow:hidden;
  background:linear-gradient(160deg,#26396a,#18284e);box-shadow:0 16px 44px rgba(24,40,78,.16)}
.pd-main img{width:100%;height:100%;object-fit:contain}
.pd-ph{width:100%;height:100%;display:grid;place-content:center;color:rgba(255,255,255,.45);
  font-size:13px;font-weight:700}
.pd-flag{position:absolute;top:16px;left:16px;background:#fff;color:var(--navy);font-size:11px;font-weight:800;
  letter-spacing:.08em;text-transform:uppercase;padding:6px 13px;border-radius:999px}
.pd-thumbs{display:flex;gap:10px;margin-top:12px;overflow-x:auto;padding-bottom:4px}
.pd-th{width:74px;height:74px;flex-shrink:0;border-radius:13px;overflow:hidden;border:2px solid transparent;
  background:linear-gradient(160deg,#26396a,#18284e);cursor:pointer;padding:0}
.pd-th.on{border-color:var(--navy)}
.pd-th img{width:100%;height:100%;object-fit:contain}

.pd-cat{font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;
  color:var(--navy);opacity:.5;margin-bottom:10px}
.pd-info h1{font-size:clamp(26px,3.2vw,38px);line-height:1.14;color:var(--navy);margin-bottom:12px}
.pd-sub{font-size:16px;color:rgba(27,36,64,.68);line-height:1.65;margin-bottom:16px}
.pd-rate{display:flex;align-items:center;gap:9px;margin-bottom:18px;font-size:14px}
.pd-stars{position:relative;display:inline-block;color:rgba(24,40,78,.16);font-size:17px;letter-spacing:2px}
.pd-stars::before{content:'★★★★★';position:absolute;left:0;top:0;width:var(--pct);overflow:hidden;
  color:#f0a831;white-space:nowrap}
.pd-stars.sm{font-size:14px}
.pd-rate b{color:var(--navy);font-weight:800}
.pd-rate em{font-style:normal;color:rgba(27,36,64,.5);font-size:13px}

.pd-prices{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:24px}
.pd-price{font-family:var(--f-display);font-weight:900;font-size:clamp(30px,3.6vw,40px);color:var(--navy)}
.pd-was{font-size:17px;color:rgba(27,36,64,.36);text-decoration:line-through}
.pd-save{font-size:12.5px;font-weight:800;color:var(--navy);background:rgba(24,40,78,.09);
  padding:5px 11px;border-radius:7px}

.pd-block{margin-bottom:20px}
.pd-label{font-size:12.5px;font-weight:800;color:var(--navy);opacity:.6;margin-bottom:10px}
.pd-vars{display:flex;gap:10px;flex-wrap:wrap}
.pd-chip{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:3px;
  padding:12px 18px;border-radius:14px;border:2px solid rgba(24,40,78,.16);background:#fff;
  cursor:pointer;transition:.2s;min-width:130px;text-align:left}
.pd-chip:hover{border-color:var(--navy)}
.pd-chip.on{border-color:var(--navy);background:var(--navy)}
.pd-chip span{font-weight:800;font-size:14px;color:var(--navy)}
.pd-chip em{font-style:normal;font-size:13px;font-weight:700;color:rgba(27,36,64,.6)}
.pd-chip.on span,.pd-chip.on em{color:#fff}
.pd-chip.on em{color:rgba(255,255,255,.75)}
.pd-chip.out{opacity:.5}
.pd-chip i{font-style:normal;font-size:10.5px;font-weight:800;color:#c25050;text-transform:uppercase}

.pd-stock{font-size:13px;font-weight:700;color:#2e7d4f;display:flex;align-items:center;gap:7px;margin-bottom:20px}
.pd-stock::before{content:"";width:8px;height:8px;border-radius:50%;background:#2e7d4f}
.pd-stock.out{color:#c25050}.pd-stock.out::before{background:#c25050}

.pd-buy{display:flex;gap:11px;margin-bottom:22px;flex-wrap:wrap}
.pd-qty{display:flex;align-items:center;gap:4px;border:2px solid rgba(24,40,78,.16);border-radius:999px;padding:4px 6px}
.pd-qty button{width:36px;height:36px;border-radius:50%;border:none;background:transparent;color:var(--navy);
  font-size:19px;font-weight:700;cursor:pointer;line-height:1}
.pd-qty button:hover{background:rgba(24,40,78,.07)}
.pd-qty span{min-width:30px;text-align:center;font-weight:800;font-size:15px;color:var(--navy)}
.pd-add{flex:1;min-width:200px;background:var(--navy);color:#fff;border:none;border-radius:999px;
  padding:17px 26px;font-weight:800;font-size:15.5px;cursor:pointer;transition:.22s}
.pd-add:hover:not(:disabled){background:var(--navy-deep);transform:translateY(-2px)}
.pd-add:disabled{opacity:.45;cursor:not-allowed}

.pd-trust{list-style:none;display:flex;flex-direction:column;gap:9px;padding:20px 0;
  border-top:1px solid rgba(24,40,78,.11);border-bottom:1px solid rgba(24,40,78,.11);margin-bottom:22px}
.pd-trust li{display:flex;gap:10px;font-size:14px;font-weight:600;color:rgba(27,36,64,.72)}
.pd-trust li::before{content:"✓";color:#2e7d4f;font-weight:900}

.pd-story h2{font-size:19px;color:var(--navy);margin-bottom:12px}
.pd-story p{font-size:15px;line-height:1.75;color:rgba(27,36,64,.72);margin-bottom:12px}
.pd-sku{font-size:12px;color:rgba(27,36,64,.42);font-weight:600;margin-top:14px}

.pd-reviews{margin-top:70px}
.pd-reviews h2{font-size:clamp(22px,2.8vw,30px);color:var(--navy);margin-bottom:22px}
.pd-rlist{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
.pd-rcard{background:#fff;border:1px solid rgba(24,40,78,.1);border-radius:18px;padding:20px;
  display:flex;flex-direction:column;gap:9px}
.pd-rcard p{font-size:14.5px;line-height:1.6;color:rgba(27,36,64,.75)}
.pd-rcard b{font-size:13px;color:var(--navy)}

.pd-more{margin-top:70px}
.pd-more h2{font-size:clamp(22px,2.8vw,30px);color:var(--navy);margin-bottom:22px}
.pd-mgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:18px}
.pd-mcard{background:#fff;border:1px solid rgba(24,40,78,.1);border-radius:18px;padding:14px;
  text-decoration:none;display:flex;flex-direction:column;gap:8px;transition:.25s}
.pd-mcard:hover{transform:translateY(-5px);box-shadow:0 16px 36px rgba(24,40,78,.14)}
.pd-mimg{aspect-ratio:1;border-radius:13px;overflow:hidden;background:linear-gradient(160deg,#26396a,#18284e);
  display:grid;place-items:center;font-size:30px}
.pd-mimg img{width:100%;height:100%;object-fit:contain}
.pd-mcard b{font-family:var(--f-display);font-size:14.5px;color:var(--navy);line-height:1.3}
.pd-mcard em{font-style:normal;font-family:var(--f-display);font-weight:900;font-size:16px;color:var(--navy)}

.pd-foot{background:var(--navy-deep);color:rgba(255,255,255,.5);padding:30px 5vw;font-size:13px}
    `}</style>
  );
}
