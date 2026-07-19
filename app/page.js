'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/* ============================================================
   DEFAULTS — chỉ dùng khi Supabase chưa có dữ liệu.
   Admin panel ghi vào site_config (key='home') sẽ ghi đè hết.
   ============================================================ */
const DEFAULTS = {
  brandName: 'Hanapet',
  logo: '/logo.png',
  navShop: 'Cửa hàng',
  navAbout: 'Về Hanapet',
  navCart: 'Giỏ hàng',

  heroEyebrow: 'Misty Fresh · Xịt khử mùi HOCl',
  heroTitle1: 'Khử mùi,',
  heroTitle2: 'khử lo âu.',
  heroSupport: 'Sạch mùi sau 30 giây!',
  heroBenefits: [
    'An toàn kể cả khi bé liếm phải',
    'Xịt xong là xong — không cần lau, không cần tắm lại',
    'Diệt vi khuẩn gây mùi, không phủ mùi',
  ],
  heroBtn1: 'Mua Misty Fresh — 245.000₫',
  heroBtn1Link: '#sp',
  heroMicro: 'Giao Hà Nội trong 24h · Đổi trả 7 ngày · Có lõi refill 180.000₫',
  heroImage: '',
  heroMascot: '',
  heroSkuName: 'Misty Fresh',
  heroSkuPrice: '245.000₫',
  heroVideo: '',
  heroShowVideo: false,

  spKicker: 'Cửa hàng',
  spTitle: 'Chọn loại phù hợp với bé',
  spSub: 'Giá đổi theo lựa chọn — không cần mở thêm trang.',

  mfBadge: 'Bán chạy nhất',
  mfName: 'Misty Fresh — Xịt khử mùi HOCl',
  mfDesc: 'HOCl là chất cơ thể tự tạo ra để diệt khuẩn. Xịt lên lông, 30 giây sau hết mùi, bé liếm phải vẫn an toàn.',
  mfOptLabel: 'Chọn loại',
  mfStock: 'Còn hàng · giao trong 24h',
  mfImage: '',
  mfVariants: [
    { name: 'Chai xịt 250ml', price: '245.000₫', was: '290.000₫', save: 'Rẻ hơn 15%' },
    { name: 'Lõi refill', price: '180.000₫', was: '245.000₫', save: 'Rẻ hơn 27%' },
  ],

  inviteText: 'Muốn cún thơm như vừa đi spa về?',
  inviteMascot: '',

  wbsBadge: '5 mùi',
  wbsName: 'Waterless Bubble Shampoo',
  wbsDesc: 'Tắm khô dạng bọt, không cần nước — sạch thơm mà không stress. Đầu cọ massage silicone dịu da.',
  wbsOptLabel: 'Chọn mùi hương',
  wbsStock: 'Còn hàng · giao trong 24h',
  wbsPrice: '165.000₫',
  wbsWas: '185.000₫',
  wbsSave: 'Rẻ hơn 11%',
  wbsScents: [
    { name: 'Baby Powder',  c1: '#dbe4f4', c2: '#b3c4e2', dot: '#a9bfe0', icon: '', image: '' },
    { name: 'Lavender',     c1: '#ded4f2', c2: '#b9a8e2', dot: '#b49fe0', icon: '', image: '' },
    { name: 'Peach Yogurt', c1: '#f7d3bd', c2: '#eba884', dot: '#eda683', icon: '', image: '' },
    { name: 'Quince',       c1: '#f5e3ad', c2: '#e7ca70', dot: '#e8c96d', icon: '', image: '' },
    { name: 'Cotton Candy', c1: '#f6cadd', c2: '#eb9ec2', dot: '#ec9cc1', icon: '', image: '' },
  ],

  tmKicker: 'Ba mẹ pet nói gì',
  tmTitle: 'Hàng nghìn ba mẹ pet đã tin dùng Hanapet',
  testimonials: [
    { who: '@minhchau.pet',   pet: 'Sen của Miu — mèo Anh lông ngắn', quote: 'Xịt xong nằm ngủ luôn, không né như mọi lần.', embed: '', thumb: '' },
    { who: '@nhatlinh_corgi', pet: 'Sen của Bơ — Corgi 2 tuổi',       quote: 'Mùa mưa không tắm được, cứu tinh thật sự.',    embed: '', thumb: '' },
    { who: '@thuytrang.home', pet: 'Sen của Nút — Poodle nhỏ',        quote: 'Bé liếm phải mà mình không lo nữa.',           embed: '', thumb: '' },
    { who: '@dogdad.hn',      pet: 'Sen của Bear — Golden 4 tuổi',    quote: 'Chó to lông dày, xịt vẫn ăn mùi.',             embed: '', thumb: '' },
    { who: '@catlover.vn',    pet: 'Sen của Sữa — mèo ta',            quote: 'Mèo ghét nước nên cái này hợp lắm.',           embed: '', thumb: '' },
  ],
  tmStats: [
    { n: '5.000+', l: 'chai đã bán' },
    { n: '4.9/5',  l: 'đánh giá Shopee' },
    { n: '92%',    l: 'khách mua lại' },
  ],

  cbKicker: 'Tiết kiệm hơn',
  cbTitle: 'Mua theo gói, rẻ hơn mua lẻ',
  cbSub: 'Ba gói cho ba kiểu dùng. Gói giữa được chọn nhiều nhất.',
  cbBtn: 'Chọn gói này',
  comboTiers: [
    { flag: '', best: false, name: 'Gói Thử', price: '245.000₫', was: '290.000₫', save: 'Rẻ hơn 15%', image: '',
      items: ['1 chai Misty Fresh 250ml', 'Dùng khoảng 1 tháng', 'Hợp bé mới thử lần đầu'] },
    { flag: 'Được chọn nhiều nhất', best: true, name: 'Gói Quen Thuộc', price: '395.000₫', was: '535.000₫', save: 'Rẻ hơn 26%', image: '',
      items: ['1 chai Misty Fresh 250ml', '1 lõi refill 250ml', 'Dùng khoảng 3 tháng', 'Tặng khăn lau Hanapet'] },
    { flag: '', best: false, name: 'Gói Cả Nhà', price: '690.000₫', was: '1.025.000₫', save: 'Rẻ hơn 33%', image: '',
      items: ['1 chai Misty Fresh 250ml', '3 lõi refill 250ml', 'Dùng khoảng 8 tháng', 'Hợp nhà nuôi 2 bé trở lên'] },
  ],

  labelCart: 'Thêm vào giỏ',
  labelDetail: 'Chi tiết',

  abKicker: 'Về Hanapet',
  abTitle: 'Chúng tớ chỉ làm hai thứ — và làm cho tới.',
  abBody1: 'Hanapet bắt đầu từ một câu hỏi đơn giản: vì sao chăm bé cưng lại phiền đến vậy? Bé sợ nước, nhà không có chỗ, mùa đông thì lạnh.',
  abBody2: 'Thay vì bày ra ba mươi món, chúng tớ chọn hai. Công thức thử đi thử lại trên chính những bé cưng ở nhà trước khi bán cho ai.',
  abBtn: 'Xem sản phẩm →',
  abImage: '',
  facts: [
    { t: 'HOCl',           s: 'Chất cơ thể tự tạo để diệt khuẩn. Không cồn, không paraben.' },
    { t: 'Thử tại nhà',    s: 'Mỗi công thức dùng thật ít nhất 8 tuần trước khi lên kệ.' },
    { t: 'Đổi trả 7 ngày', s: 'Bé không hợp? Nhắn tớ, đổi hoặc hoàn tiền.' },
  ],

  cartPets: [],
  cartCheers: ['Thơm rồi nè!', 'Hoan hô!', 'Yêu quá đi!', 'Ngoan lắm!'],

  buybarName: 'Misty Fresh — Chai xịt 250ml',
  buybarBtn: 'Thêm giỏ',
  buybarImage: '',

  footerText: '© 2026 Hanapet · hana.pet.vn · Hà Nội',
};

/* ---------- placeholder khi chưa có ảnh ---------- */
function Ph({ text, dark = false, style = {} }) {
  return (
    <div className={'ph' + (dark ? ' ph-dark' : '')} style={style}>
      {String(text).split('|').map((l, i) => <span key={i}>{l}</span>)}
    </div>
  );
}

function Img({ src, alt, text, dark, className = '', style = {} }) {
  if (src) return <img src={src} alt={alt || ''} className={className} style={style} loading="lazy" />;
  return <Ph text={text} dark={dark} style={style} />;
}

/* ---------- video đa nguồn ---------- */
function embedUrl(u = '') {
  if (!u) return '';
  if (u.includes('youtube.com') || u.includes('youtu.be')) {
    const id = u.includes('youtu.be') ? u.split('youtu.be/')[1]?.split(/[?&]/)[0]
             : new URL(u).searchParams.get('v');
    return id ? `https://www.youtube.com/embed/${id}` : '';
  }
  if (u.includes('tiktok.com')) {
    const id = u.match(/video\/(\d+)/)?.[1];
    return id ? `https://www.tiktok.com/embed/v2/${id}` : '';
  }
  if (u.includes('instagram.com')) {
    return u.replace(/\/?$/, '/') + 'embed';
  }
  return '';
}

function VideoEmbed({ url, poster, label }) {
  const [play, setPlay] = useState(false);
  const src = embedUrl(url);
  const isFile = url && url.match(/\.(mp4|webm|mov)$/i);

  if (!url) return (<><Ph text={label || 'VIDEO 9:16'} dark /><span className="play" /></>);

  if (!play) return (
    <>
      {poster ? <img src={poster} alt="" loading="lazy" /> : <Ph text={label || 'VIDEO 9:16'} dark />}
      <button className="play" onClick={() => setPlay(true)} aria-label="Phát video" />
    </>
  );

  if (isFile) return <video src={url} controls autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
  return <iframe src={src} allow="autoplay; encrypted-media; fullscreen" allowFullScreen title={label || 'video'} />;
}

/* ============================================================
   PAGE
   ============================================================ */
export default function Home() {
  const [S, setS] = useState(DEFAULTS);
  const [ready, setReady] = useState(false);
  const [mfSel, setMfSel] = useState(0);
  const [scent, setScent] = useState(0);
  const [barOn, setBarOn] = useState(false);
  const railRef = useRef(null);
  const heroRef = useRef(null);
  const footRef = useRef(null);

  /* nạp config từ Supabase */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await supabase
          .from('site_config').select('value').eq('key', 'home').maybeSingle();
        if (alive && data?.value) setS({ ...DEFAULTS, ...data.value });
      } catch (e) {
        console.warn('site_config:', e?.message);
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => { alive = false; };
  }, []);

  /* nav solid + thanh mua */
  useEffect(() => {
    const onScroll = () => {
      document.getElementById('nav')?.classList.toggle('solid', window.scrollY > 60);
      const hh = heroRef.current?.offsetHeight || 600;
      const ft = footRef.current?.getBoundingClientRect().top ?? 9999;
      setBarOn(window.scrollY > hh * 0.72 && ft > window.innerHeight);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [ready]);

  /* thú cưng thò đầu — gắn cho MỌI nút chốt đơn */
  const seen = useRef({});
  const peek = useCallback((btn) => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const host = btn.parentElement;
    if (!host) return;
    host.classList.add('peekwrap');
    host.querySelectorAll('.peek,.pop').forEach(n => n.remove());

    const pets = (S.cartPets || []).filter(Boolean);
    const key = btn.dataset.peekid || (btn.dataset.peekid = Math.random().toString(36).slice(2));
    const first = !seen.current[key];
    seen.current[key] = true;

    const el = document.createElement('div');
    el.className = 'peek' + (first ? '' : ' small');
    if (pets.length) {
      const p = pets[Math.floor(Math.random() * pets.length)];
      el.innerHTML = `<img src="${p}" alt="">`;
    } else {
      el.innerHTML = '<span>MASCOT<br>cún / mèo</span>';
      el.classList.add('peek-ph');
    }
    host.appendChild(el);
    setTimeout(() => el.remove(), 1250);

    if (first) {
      const cheers = S.cartCheers || [];
      if (cheers.length) {
        const c = document.createElement('div');
        c.className = 'pop';
        c.textContent = cheers[Math.floor(Math.random() * cheers.length)];
        host.appendChild(c);
        setTimeout(() => c.remove(), 1250);
      }
    }
  }, [S.cartPets, S.cartCheers]);

  useEffect(() => {
    const onClick = (e) => {
      const b = e.target.closest('.cta-buy');
      if (b) peek(b);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [peek]);

  const mf = S.mfVariants?.[mfSel] || {};
  const sc = S.wbsScents?.[scent] || {};
  const railStep = () => (railRef.current?.querySelector('.tcard')?.offsetWidth || 220) + 16;

  return (
    <>
      <Styles />

      <nav id="nav">
        <div className="brand">
          {S.logo ? <img className="mark-img" src={S.logo} alt={S.brandName} />
                  : <span className="mark"><Ph text="LOGO" /></span>}
          <span>{S.brandName}</span>
        </div>
        <div className="navlinks">
          <a href="#sp">{S.navShop}</a>
          <a href="#about">{S.navAbout}</a>
          <a href="/gio-hang" className="navcart">{S.navCart}</a>
        </div>
      </nav>

      {/* ---------------- HERO ---------------- */}
      <header className="hero" ref={heroRef}>
        <div>
          <span className="eyebrow rv d1">{S.heroEyebrow}</span>
          <h1 className="rv d1">
            <span>{S.heroTitle1}</span>
            <span className="l2">{S.heroTitle2}</span>
          </h1>
          <div className="support rv d2">{S.heroSupport}</div>

          <ul className="bens rv d3">
            {(S.heroBenefits || []).map((b, i) => <li key={i}>{b}</li>)}
          </ul>

          <div className="cta-row rv d4">
            <a className="btn btn-primary cta-buy" href={S.heroBtn1Link || '#sp'}>{S.heroBtn1}</a>
          </div>
          <p className="microcopy rv d5">{S.heroMicro}</p>
        </div>

        <div className="shot">
          <div className="glow" />
          <div className="mascot-hero">
            <Img src={S.heroMascot} text="MASCOT|cún H vẫy đuôi|PNG trong suốt" dark />
          </div>

          <div className="hero-main">
            <div className="mainimg">
              <Img src={S.heroImage} alt={S.heroSkuName}
                   text="ẢNH THẬT|chai Misty Fresh|+ pet AI-gen phía sau|PNG trong suốt" dark />
            </div>
            <div className="nm">{S.heroSkuName}</div>
            <div className="pr">{S.heroSkuPrice}</div>
          </div>

          {S.heroShowVideo && (
            <div className="tvc">
              <VideoEmbed url={S.heroVideo} label="TVC 9:16" />
            </div>
          )}
        </div>

        <div className="wave">
          <svg viewBox="0 0 1440 120" preserveAspectRatio="none">
            <path fill="#f6f4ef" d="M0,64 C240,120 480,16 720,48 C960,80 1200,112 1440,56 L1440,120 L0,120 Z" />
          </svg>
        </div>
      </header>

      {/* ---------------- SẢN PHẨM ---------------- */}
      <section id="sp">
        <div className="shead">
          <div className="kicker">{S.spKicker}</div>
          <h2>{S.spTitle}</h2>
          <p>{S.spSub}</p>
        </div>

        <div className="grid">
          {/* MISTY */}
          <article className="card star">
            <div className="cimg" style={{ background: 'linear-gradient(160deg,#26396a,#18284e)' }}>
              {S.mfBadge && <span className="badge">{S.mfBadge}</span>}
              <Img src={S.mfImage} alt={S.mfName} text="ẢNH THẬT|chai Misty Fresh" dark />
            </div>
            <div className="cbody">
              <h3>{S.mfName}</h3>
              <p className="cdesc">{S.mfDesc}</p>
              <div className="optlabel">{S.mfOptLabel}</div>
              <div className="variants">
                {(S.mfVariants || []).map((v, i) => (
                  <button key={i} className={'chip' + (i === mfSel ? ' on' : '')}
                          onClick={() => setMfSel(i)}>{v.name}</button>
                ))}
              </div>
              <div className="pricerow">
                <span className="price">{mf.price}</span>
                {mf.was && <span className="was">{mf.was}</span>}
                {mf.save && <span className="save">{mf.save}</span>}
              </div>
              {S.mfStock && <div className="stock">{S.mfStock}</div>}
              <div className="cbtns">
                <a className="btn b-buy cta-buy" href="#">{S.labelCart}</a>
                <a className="btn b-more" href="/san-pham/misty-fresh">{S.labelDetail}</a>
              </div>
            </div>
          </article>

          {/* DÒNG MỜI GỌI */}
          <div className="invite">
            <div className="msc">
              <Img src={S.inviteMascot} text="MASCOT|nhỏ" />
            </div>
            <p>{S.inviteText}</p>
            <div className="arrow" />
          </div>

          {/* WBS */}
          <article className="card">
            <div className="cimg light"
                 style={{ background: `linear-gradient(160deg,${sc.c1 || '#dbe4f4'},${sc.c2 || '#b3c4e2'})` }}>
              {S.wbsBadge && <span className="badge">{S.wbsBadge}</span>}
              <Img src={sc.image} alt={S.wbsName}
                   text={`ẢNH THẬT|chai Waterless Bubble|(${sc.name || 'mùi'})`} />
            </div>
            <div className="cbody">
              <h3>{S.wbsName}</h3>
              <p className="cdesc">{S.wbsDesc}</p>
              <div className="optlabel">{S.wbsOptLabel}</div>
              <div className="scents">
                {(S.wbsScents || []).map((s, i) => (
                  <button key={i} className={'scent' + (i === scent ? ' on' : '')}
                          onClick={() => setScent(i)}>
                    {s.icon ? <img className="sic" src={s.icon} alt="" />
                            : <i style={{ background: s.dot }} />}
                    {s.name}
                  </button>
                ))}
              </div>
              <div className="pricerow">
                <span className="price">{S.wbsPrice}</span>
                {S.wbsWas && <span className="was">{S.wbsWas}</span>}
                {S.wbsSave && <span className="save">{S.wbsSave}</span>}
              </div>
              {S.wbsStock && <div className="stock">{S.wbsStock}</div>}
              <div className="cbtns">
                <a className="btn b-buy cta-buy" href="#">{S.labelCart}</a>
                <a className="btn b-more" href="/san-pham/waterless-bubble-shampoo">{S.labelDetail}</a>
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* ---------------- ĐÁNH GIÁ ---------------- */}
      {(S.testimonials || []).length > 0 && (
        <section className="tmo">
          <div className="tmo-head">
            <div>
              <div className="kicker">{S.tmKicker}</div>
              <h2>{S.tmTitle}</h2>
            </div>
            <div className="tarrows">
              <button onClick={() => railRef.current?.scrollBy({ left: -railStep() * 2, behavior: 'smooth' })} aria-label="Xem trước">←</button>
              <button onClick={() => railRef.current?.scrollBy({ left:  railStep() * 2, behavior: 'smooth' })} aria-label="Xem tiếp">→</button>
            </div>
          </div>

          <div className="trail" ref={railRef}>
            {S.testimonials.map((t, i) => (
              <div className="tcard" key={i}>
                <div className="tvid">
                  <VideoEmbed url={t.embed} poster={t.thumb} label={`EMBED TIKTOK 9:16|${t.who}`} />
                </div>
                <div className="tmeta">
                  <span className="who">{t.who}</span>
                  <span className="pet">{t.pet}</span>
                  {t.quote && <span className="quote">{t.quote}</span>}
                </div>
              </div>
            ))}
          </div>

          {(S.tmStats || []).length > 0 && (
            <div className="tstats">
              {S.tmStats.map((s, i) => (
                <div className="tstat" key={i}><b>{s.n}</b><span>{s.l}</span></div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ---------------- COMBO ---------------- */}
      {(S.comboTiers || []).length > 0 && (
        <section className="combo" id="combo">
          <div className="combo-in">
            <div className="shead">
              <div className="kicker">{S.cbKicker}</div>
              <h2>{S.cbTitle}</h2>
              <p>{S.cbSub}</p>
            </div>
            <div className="tiers">
              {S.comboTiers.map((t, i) => (
                <div className={'tier' + (t.best ? ' best' : '')} key={i}>
                  {t.flag && <span className="tflag">{t.flag}</span>}
                  <div className="timg">
                    <Img src={t.image} alt={t.name} text={`ẢNH|${t.name}`} dark={!t.best} />
                  </div>
                  <h3>{t.name}</h3>
                  <div className="tprice">{t.price}{t.was && <s>{t.was}</s>}</div>
                  {t.save && <span className="tsave">{t.save}</span>}
                  <ul className="tlist">
                    {(t.items || []).map((x, k) => <li key={k}>{x}</li>)}
                  </ul>
                  <a className="btn t-btn cta-buy" href="#">{S.cbBtn}</a>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------------- GIỚI THIỆU ---------------- */}
      <section className="about" id="about">
        <div className="about-in">
          <div>
            <div className="kicker">{S.abKicker}</div>
            <h2>{S.abTitle}</h2>
            <div className="about-img">
              <Img src={S.abImage} text="ẢNH THẬT|pet AI-gen được ôm / vuốt ve|tông ấm" dark />
            </div>
            <p>{S.abBody1}</p>
            <p>{S.abBody2}</p>
            <a className="btn btn-ghost" href="#sp">{S.abBtn}</a>
          </div>
          <div className="facts">
            {(S.facts || []).map((f, i) => (
              <div className="fact" key={i}><b>{f.t}</b><span>{f.s}</span></div>
            ))}
          </div>
        </div>
      </section>

      <footer ref={footRef}>{S.footerText}</footer>

      {/* ---------------- THANH MUA ---------------- */}
      <div className={'buybar' + (barOn ? ' show' : '')}>
        <div className="bb-img">
          <Img src={S.buybarImage || S.mfImage} text="ẢNH|chai" dark />
        </div>
        <div className="bb-txt">
          <span className="bb-name">{S.buybarName}</span>
          <span className="bb-price">
            <b>{mf.price}</b>{mf.was && <s>{mf.was}</s>}
          </span>
        </div>
        <a className="btn b-buy cta-buy" href="#sp">{S.buybarBtn}</a>
      </div>
    </>
  );
}

/* ============================================================
   STYLES
   ============================================================ */
function Styles() {
  return (
    <style jsx global>{`
:root{--navy:#18284e;--navy-deep:#101c38;--cream:#f6f4ef;--ink:#1b2440}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:'Nunito Sans',system-ui,sans-serif;color:var(--ink);background:var(--cream);-webkit-font-smoothing:antialiased}
h1,h2,h3{font-family:'Nunito',system-ui,sans-serif;font-weight:900;letter-spacing:-.02em}
img{display:block;max-width:100%}
button{font:inherit}

.ph{width:100%;height:100%;display:grid;place-content:center;align-content:center;text-align:center;
  font-size:10.5px;font-weight:800;letter-spacing:.1em;line-height:1.6;padding:10px;color:rgba(24,40,78,.45)}
.ph-dark{color:rgba(255,255,255,.52)}
.ph span{display:block}

nav{position:fixed;top:0;left:0;right:0;z-index:50;display:flex;align-items:center;justify-content:space-between;padding:14px 5vw;transition:.3s}
nav.solid{background:rgba(16,28,56,.95);backdrop-filter:blur(10px)}
.brand{display:flex;align-items:center;gap:10px;color:#fff;font-family:'Nunito';font-weight:900;font-size:20px}
.brand .mark{width:36px;height:36px;border-radius:11px;background:#fff;overflow:hidden}
.brand .mark-img{width:38px;height:38px;object-fit:contain}
.navlinks{display:flex;gap:24px;font-size:14px;font-weight:700;align-items:center}
.navlinks a{color:rgba(255,255,255,.82);text-decoration:none}
.navlinks a:hover{color:#fff}
.navcart{background:#fff;color:var(--navy)!important;padding:9px 20px;border-radius:999px;font-weight:800}
@media(max-width:760px){.navlinks a:not(.navcart){display:none}}

.hero{position:relative;min-height:100svh;background:var(--navy);color:#fff;overflow:hidden;
  display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:clamp(20px,3vw,50px);padding:116px 5vw 140px}
.hero::before{content:"";position:absolute;inset:0;background:radial-gradient(70% 90% at 74% 46%,rgba(255,255,255,.18),transparent 62%)}
.hero>*{position:relative;z-index:2}
.rv{opacity:0;transform:translateY(22px);animation:rise .85s cubic-bezier(.22,.68,.24,1) forwards}
@keyframes rise{to{opacity:1;transform:translateY(0)}}
.d1{animation-delay:.05s}.d2{animation-delay:.18s}.d3{animation-delay:.3s}.d4{animation-delay:.42s}.d5{animation-delay:.54s}
.eyebrow{display:inline-flex;align-items:center;gap:9px;font-size:12px;font-weight:800;letter-spacing:.16em;
  text-transform:uppercase;color:rgba(255,255,255,.7);margin-bottom:20px}
.eyebrow::before{content:"";width:26px;height:2px;background:#fff}
h1{font-size:clamp(46px,6.8vw,94px);line-height:.95;margin-bottom:16px;color:#fff}
h1 .l2{display:block}
.support{font-family:'Nunito';font-weight:700;font-size:clamp(16px,1.5vw,21px);color:rgba(255,255,255,.66);margin-bottom:32px}
.bens{list-style:none;display:flex;flex-direction:column;gap:11px;margin:0 0 32px}
.bens li{display:flex;gap:11px;align-items:flex-start;font-size:15.5px;font-weight:600;color:rgba(255,255,255,.86);line-height:1.45;max-width:40ch}
.bens li::before{content:"";flex-shrink:0;width:19px;height:19px;border-radius:50%;margin-top:1px;background:#fff;
  -webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M20 6L9 17l-5-5' stroke='black' stroke-width='3.4' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/13px no-repeat;
  mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M20 6L9 17l-5-5' stroke='black' stroke-width='3.4' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/13px no-repeat}

.btn{display:inline-flex;align-items:center;justify-content:center;gap:9px;padding:16px 30px;border-radius:999px;
  font-weight:800;font-size:15.5px;text-decoration:none;border:2px solid transparent;cursor:pointer;transition:.22s cubic-bezier(.2,.7,.3,1)}
.cta-row{display:flex;gap:13px;flex-wrap:wrap}
.btn-primary{background:#fff;color:var(--navy);box-shadow:0 8px 26px rgba(0,0,0,.25)}
.btn-primary:hover{transform:translateY(-2px);box-shadow:0 14px 34px rgba(0,0,0,.32)}
.btn-ghost{border-color:rgba(255,255,255,.34);color:#fff}
.btn-ghost:hover{border-color:#fff;background:rgba(255,255,255,.09);transform:translateY(-2px)}
.microcopy{font-size:13.5px;color:rgba(255,255,255,.55);margin-top:16px;font-weight:600;line-height:1.7}

.shot{position:relative;height:clamp(360px,54vw,570px);display:flex;align-items:center;justify-content:center;gap:clamp(14px,2.6vw,34px)}
.glow{position:absolute;width:80%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.3),transparent 65%);
  filter:blur(34px);opacity:0;animation:gin 1.5s ease-out .35s forwards}
@keyframes gin{to{opacity:1}}
.hero-main{position:relative;z-index:3;width:clamp(190px,25vw,296px);text-align:center;
  opacity:0;transform:translateY(44px) scale(.95);animation:pin 1.05s cubic-bezier(.2,.72,.24,1) .4s forwards;transition:transform .35s}
@keyframes pin{to{opacity:1;transform:translateY(0) scale(1)}}
.hero-main:hover{transform:translateY(-10px)}
.mainimg{aspect-ratio:3/4;border-radius:20px;overflow:hidden;background:linear-gradient(160deg,#2b3f70,#16244a);
  border:1px solid rgba(255,255,255,.2);margin-bottom:15px;box-shadow:0 30px 70px rgba(0,0,0,.4)}
.mainimg img{width:100%;height:100%;object-fit:contain}
.hero-main .nm{font-family:'Nunito';font-weight:900;font-size:clamp(18px,1.9vw,24px);color:#fff;margin-bottom:5px}
.hero-main .pr{font-size:15px;font-weight:800;color:rgba(255,255,255,.78)}
.mascot-hero{position:absolute;left:0;bottom:12%;z-index:3;width:clamp(72px,8vw,116px);aspect-ratio:1;overflow:hidden;
  border-radius:16px;background:rgba(255,255,255,.08);border:1px dashed rgba(255,255,255,.3);
  opacity:0;animation:rise .9s ease-out .95s forwards}
.mascot-hero img{width:100%;height:100%;object-fit:contain}
@media(max-width:900px){.mascot-hero{display:none}}
.tvc{position:relative;z-index:3;width:clamp(122px,14.5vw,192px);aspect-ratio:9/16;border-radius:18px;overflow:hidden;
  background:linear-gradient(165deg,#22345d,#141f3d);border:1px solid rgba(255,255,255,.2);box-shadow:0 26px 60px rgba(0,0,0,.42);
  opacity:0;transform:translateY(40px) scale(.95);animation:pin 1.05s cubic-bezier(.2,.72,.24,1) .62s forwards;transition:transform .35s}
.tvc:hover{transform:translateY(-9px)}
.tvc iframe,.tvc video,.tvc img{width:100%;height:100%;border:0;object-fit:cover}
.play{position:absolute;inset:0;margin:auto;width:52px;height:52px;border-radius:50%;border:none;
  background:rgba(255,255,255,.94);cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.3);z-index:2}
.play::after{content:"";position:absolute;inset:0;margin:auto;width:0;height:0;
  border-left:15px solid var(--navy);border-top:10px solid transparent;border-bottom:10px solid transparent;margin-left:20px}
.wave{position:absolute;bottom:-1px;left:0;width:100%;line-height:0;z-index:4}
.wave svg{width:100%;height:clamp(60px,7vw,110px);display:block}
@media(max-width:900px){.hero{grid-template-columns:1fr;padding:104px 6vw 112px}.shot{height:auto;margin-top:26px}}

section{padding:clamp(66px,8vw,110px) 5vw}
.shead{max-width:640px;margin-bottom:42px}
.kicker{font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--navy);opacity:.55;margin-bottom:12px}
.shead h2{font-size:clamp(28px,3.6vw,46px);line-height:1.1;margin-bottom:14px;color:var(--navy)}
.shead p{color:rgba(27,36,64,.68);font-size:16px;line-height:1.65}

.grid{display:grid;grid-template-columns:1fr;gap:26px;max-width:1180px}
.card{background:#fff;border-radius:24px;overflow:hidden;border:1px solid rgba(24,40,78,.1);
  box-shadow:0 2px 10px rgba(24,40,78,.05);transition:.28s cubic-bezier(.2,.7,.3,1);display:flex;flex-direction:column}
.card.star{border:2px solid var(--navy)}
.card:hover{transform:translateY(-6px);box-shadow:0 20px 46px rgba(24,40,78,.16)}
.cimg{position:relative;aspect-ratio:3/4;overflow:hidden;transition:background .45s}
.cimg img{width:100%;height:100%;object-fit:contain}
@media(min-width:1080px){
  .card{flex-direction:row;align-items:stretch}
  .card .cimg{flex:0 0 42%;aspect-ratio:auto}
  .card .cbody{flex:1;justify-content:center;padding:30px 28px}
}
.badge{position:absolute;top:14px;left:14px;background:#fff;color:var(--navy);font-size:11px;font-weight:800;
  letter-spacing:.08em;text-transform:uppercase;padding:6px 12px;border-radius:999px;box-shadow:0 3px 10px rgba(0,0,0,.14);z-index:2}
.cbody{padding:22px;display:flex;flex-direction:column;gap:12px;flex:1}
.cbody h3{font-size:20px;color:var(--navy);line-height:1.25}
.cdesc{font-size:14.5px;color:rgba(27,36,64,.66);line-height:1.6}
.optlabel{font-size:12.5px;font-weight:800;color:var(--navy);opacity:.6}
.variants{display:flex;gap:8px;flex-wrap:wrap}
.chip{padding:9px 15px;border-radius:999px;border:1.5px solid rgba(24,40,78,.18);font-size:13px;font-weight:700;
  cursor:pointer;transition:.2s;background:#fff;color:var(--navy)}
.chip:hover{border-color:var(--navy)}
.chip.on{background:var(--navy);color:#fff;border-color:var(--navy)}
.scents{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.scent{display:flex;align-items:center;gap:9px;padding:9px 13px;border-radius:999px;background:rgba(24,40,78,.05);
  border:1.5px solid transparent;cursor:pointer;transition:.2s;font-size:13.5px;font-weight:700;color:var(--navy);text-align:left}
.scent:hover{background:rgba(24,40,78,.09)}
.scent.on{background:#fff;border-color:var(--navy)}
.scent i{width:24px;height:24px;border-radius:50%;flex-shrink:0;display:block}
.scent .sic{width:24px;height:24px;flex-shrink:0;object-fit:contain}
.pricerow{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-top:auto;padding-top:4px}
.price{font-family:'Nunito';font-weight:900;font-size:27px;color:var(--navy)}
.was{font-size:15px;color:rgba(27,36,64,.36);text-decoration:line-through}
.save{font-size:12px;font-weight:800;color:var(--navy);background:rgba(24,40,78,.09);padding:4px 9px;border-radius:6px}
.stock{font-size:12px;color:#2e7d4f;font-weight:700;display:flex;align-items:center;gap:6px}
.stock::before{content:"";width:7px;height:7px;border-radius:50%;background:#2e7d4f}
.cbtns{display:flex;gap:9px}
.cbtns .btn{flex:1;padding:14px 16px;font-size:14px}
.b-buy{background:var(--navy);color:#fff}
.b-buy:hover{background:var(--navy-deep)}
.b-more{border:2px solid rgba(24,40,78,.18);color:var(--navy)}
.b-more:hover{border-color:var(--navy)}

.invite{display:flex;align-items:center;gap:16px;padding:6px 2px}
.invite .msc{width:54px;height:54px;border-radius:14px;flex-shrink:0;overflow:hidden;background:rgba(24,40,78,.06);border:1px dashed rgba(24,40,78,.24)}
.invite .msc img{width:100%;height:100%;object-fit:contain}
.invite p{font-family:'Nunito';font-weight:800;font-size:clamp(16px,1.9vw,23px);color:var(--navy);line-height:1.35}
.invite .arrow{flex:1;height:1px;background:linear-gradient(90deg,rgba(24,40,78,.22),transparent);min-width:20px}
@media(max-width:720px){.invite .arrow{display:none}}

.tmo{background:var(--cream);padding-top:clamp(50px,6vw,74px);padding-bottom:clamp(60px,7vw,92px);overflow:hidden}
.tmo-head{max-width:1180px;margin:0 auto clamp(24px,3vw,34px);display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap}
.tmo-head h2{font-size:clamp(24px,3vw,38px);line-height:1.14;color:var(--navy)}
.tmo-head .kicker{margin-bottom:10px}
.tarrows{display:flex;gap:9px}
.tarrows button{width:44px;height:44px;border-radius:50%;border:1.5px solid rgba(24,40,78,.2);background:#fff;
  color:var(--navy);font-size:17px;cursor:pointer;transition:.2s;display:grid;place-items:center}
.tarrows button:hover{border-color:var(--navy);background:var(--navy);color:#fff}
.trail{max-width:1180px;margin:0 auto;display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;padding:6px 2px 16px;scrollbar-width:none}
.trail::-webkit-scrollbar{display:none}
.tcard{flex:0 0 clamp(196px,23vw,252px);scroll-snap-align:start;border-radius:20px;overflow:hidden;background:#fff;
  border:1px solid rgba(24,40,78,.1);box-shadow:0 3px 14px rgba(24,40,78,.07);transition:.26s cubic-bezier(.2,.7,.3,1);display:flex;flex-direction:column}
.tcard:hover{transform:translateY(-6px);box-shadow:0 18px 40px rgba(24,40,78,.17)}
.tvid{position:relative;aspect-ratio:9/16;overflow:hidden;background:linear-gradient(165deg,#22345d,#141f3d)}
.tvid iframe,.tvid video,.tvid img{width:100%;height:100%;border:0;object-fit:cover}
.tvid .play{width:48px;height:48px}
.tvid .play::after{border-left:14px solid var(--navy);border-top:9px solid transparent;border-bottom:9px solid transparent;margin-left:18px}
.tmeta{padding:13px 15px 15px;display:flex;flex-direction:column;gap:5px}
.tmeta .who{font-family:'Nunito';font-weight:900;font-size:14px;color:var(--navy)}
.tmeta .pet{font-size:12px;color:rgba(27,36,64,.55);font-weight:600}
.tmeta .quote{font-size:13px;color:rgba(27,36,64,.72);line-height:1.5;margin-top:3px}
.tstats{max-width:1180px;margin:clamp(20px,2.5vw,30px) auto 0;display:flex;gap:clamp(20px,4vw,54px);flex-wrap:wrap;
  padding-top:22px;border-top:1px solid rgba(24,40,78,.12)}
.tstat b{display:block;font-family:'Nunito';font-weight:900;font-size:clamp(22px,2.6vw,30px);color:var(--navy)}
.tstat span{font-size:13px;color:rgba(27,36,64,.58);font-weight:600}

.peekwrap{position:relative}
.peek{position:absolute;left:50%;bottom:calc(100% - 12px);width:62px;height:62px;pointer-events:none;z-index:5;
  transform:translateX(-50%) translateY(16px);opacity:0;animation:peekup 1.15s cubic-bezier(.24,.86,.3,1) forwards}
.peek img{width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 6px 14px rgba(24,40,78,.28))}
.peek.peek-ph{border-radius:14px 14px 8px 8px;background:rgba(255,255,255,.96);border:1px dashed rgba(24,40,78,.3);
  display:grid;place-items:center;text-align:center;font-size:8.5px;font-weight:800;line-height:1.45;
  color:rgba(24,40,78,.5);box-shadow:0 8px 22px rgba(24,40,78,.2)}
.peek.small{width:44px;height:44px;font-size:7.5px;animation-duration:.8s}
@keyframes peekup{
  0%{opacity:0;transform:translateX(-50%) translateY(20px) rotate(0)}
  22%{opacity:1;transform:translateX(-50%) translateY(-3px) rotate(-7deg)}
  40%{transform:translateX(-50%) translateY(0) rotate(6deg)}
  56%{transform:translateX(-50%) translateY(-2px) rotate(-5deg)}
  72%{opacity:1;transform:translateX(-50%) translateY(0) rotate(3deg)}
  100%{opacity:0;transform:translateX(-50%) translateY(20px) rotate(0)}}
.pop{position:absolute;left:50%;bottom:calc(100% + 6px);transform:translateX(-50%);background:var(--navy);color:#fff;
  font-size:11.5px;font-weight:800;padding:5px 12px;border-radius:999px;white-space:nowrap;pointer-events:none;z-index:6;
  opacity:0;animation:popup 1.15s cubic-bezier(.24,.86,.3,1) forwards}
@keyframes popup{
  0%{opacity:0;transform:translateX(-50%) translateY(8px) scale(.9)}
  20%{opacity:1;transform:translateX(-50%) translateY(-2px) scale(1)}
  75%{opacity:1;transform:translateX(-50%) translateY(-2px) scale(1)}
  100%{opacity:0;transform:translateX(-50%) translateY(-10px) scale(.96)}}

.buybar{position:fixed;left:0;right:0;bottom:0;z-index:80;overflow:visible;background:rgba(255,255,255,.97);
  backdrop-filter:blur(14px);border-top:1px solid rgba(24,40,78,.12);box-shadow:0 -6px 26px rgba(24,40,78,.12);
  padding:11px 5vw;display:flex;align-items:center;gap:13px;transform:translateY(110%);transition:transform .34s cubic-bezier(.2,.7,.3,1)}
.buybar.show{transform:translateY(0)}
.bb-img{width:46px;height:58px;border-radius:10px;flex-shrink:0;overflow:hidden;background:linear-gradient(160deg,#2b3f70,#16244a)}
.bb-img img{width:100%;height:100%;object-fit:contain}
.bb-img .ph{font-size:8px}
.bb-txt{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.bb-name{font-family:'Nunito';font-weight:900;font-size:14px;color:var(--navy);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bb-price{display:flex;align-items:baseline;gap:7px}
.bb-price b{font-family:'Nunito';font-weight:900;font-size:17px;color:var(--navy)}
.bb-price s{font-size:12.5px;color:rgba(27,36,64,.4)}
.buybar .btn{padding:13px 22px;font-size:14px;flex-shrink:0}
@media(max-width:520px){.bb-img{display:none}.buybar .btn{padding:13px 18px}}

.combo{background:var(--navy);color:#fff;position:relative;overflow:hidden}
.combo::before{content:"";position:absolute;inset:0;background:radial-gradient(58% 76% at 50% 0%,rgba(255,255,255,.13),transparent 66%)}
.combo-in{position:relative;z-index:2;max-width:1180px;margin:0 auto}
.combo .shead{margin-bottom:40px}
.combo .kicker{color:rgba(255,255,255,.62);opacity:1}
.combo .shead h2{color:#fff}
.combo .shead p{color:rgba(255,255,255,.72)}
.tiers{display:grid;grid-template-columns:repeat(auto-fit,minmax(258px,1fr));gap:18px;align-items:stretch}
.tier{background:rgba(255,255,255,.07);border:1.5px solid rgba(255,255,255,.18);border-radius:22px;padding:26px 22px 24px;
  display:flex;flex-direction:column;gap:12px;transition:.26s cubic-bezier(.2,.7,.3,1);position:relative}
.tier:hover{background:rgba(255,255,255,.11);transform:translateY(-5px)}
.tier.best{background:#fff;color:var(--ink);border-color:#fff;transform:scale(1.045);z-index:2;box-shadow:0 26px 60px rgba(0,0,0,.34)}
.tier.best:hover{transform:scale(1.045) translateY(-5px)}
@media(max-width:820px){.tier.best{transform:none}.tier.best:hover{transform:translateY(-5px)}}
.tflag{position:absolute;top:-13px;left:50%;transform:translateX(-50%);background:var(--navy);color:#fff;font-size:10.5px;
  font-weight:800;letter-spacing:.12em;text-transform:uppercase;padding:6px 15px;border-radius:999px;border:2px solid #fff;white-space:nowrap}
.tier h3{font-size:19px;color:#fff}
.tier.best h3{color:var(--navy)}
.timg{aspect-ratio:4/3;border-radius:14px;overflow:hidden;background:rgba(255,255,255,.08);border:1px dashed rgba(255,255,255,.26)}
.timg img{width:100%;height:100%;object-fit:contain}
.tier.best .timg{background:rgba(24,40,78,.05);border-color:rgba(24,40,78,.2)}
.tprice{font-family:'Nunito';font-weight:900;font-size:30px;color:#fff;display:flex;align-items:baseline;gap:9px;flex-wrap:wrap}
.tier.best .tprice{color:var(--navy)}
.tprice s{font-family:'Nunito Sans';font-size:15px;font-weight:600;opacity:.45}
.tsave{align-self:flex-start;font-size:11.5px;font-weight:800;padding:4px 10px;border-radius:6px;background:rgba(255,255,255,.15);color:#fff}
.tier.best .tsave{background:var(--navy);color:#fff}
.tlist{list-style:none;display:flex;flex-direction:column;gap:8px;font-size:13.5px;color:rgba(255,255,255,.8);line-height:1.45;flex:1}
.tier.best .tlist{color:rgba(27,36,64,.74)}
.tlist li{display:flex;gap:9px}
.tlist li::before{content:"·";font-weight:900;opacity:.6}
.tier .btn{width:100%;padding:14px;font-size:14.5px;margin-top:4px}
.t-btn{border:2px solid rgba(255,255,255,.36);color:#fff}
.t-btn:hover{border-color:#fff;background:rgba(255,255,255,.1)}
.tier.best .t-btn{background:var(--navy);color:#fff;border-color:var(--navy)}
.tier.best .t-btn:hover{background:var(--navy-deep)}

.about{background:var(--navy);color:#fff;position:relative;overflow:hidden}
.about::before{content:"";position:absolute;inset:0;background:radial-gradient(60% 80% at 88% 28%,rgba(255,255,255,.12),transparent 65%)}
.about-in{position:relative;z-index:2;max-width:1180px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;
  gap:clamp(30px,6vw,80px);align-items:start;text-align:left}
.about .kicker{color:rgba(255,255,255,.66);opacity:1}
.about h2{font-size:clamp(28px,3.6vw,46px);line-height:1.12;margin-bottom:20px;color:#fff}
.about p{color:rgba(255,255,255,.76);font-size:16.5px;line-height:1.75;margin-bottom:16px;max-width:52ch}
.about-img{aspect-ratio:4/3;border-radius:20px;overflow:hidden;background:rgba(255,255,255,.07);
  border:1px dashed rgba(255,255,255,.28);margin-bottom:22px}
.about-img img{width:100%;height:100%;object-fit:cover}
.about .btn{margin-top:12px}
.facts{display:grid;gap:18px}
.fact{border-left:3px solid rgba(255,255,255,.55);padding:4px 0 4px 18px}
.fact b{display:block;font-family:'Nunito';font-weight:900;font-size:clamp(22px,2.8vw,31px);margin-bottom:4px;color:#fff}
.fact span{font-size:14px;color:rgba(255,255,255,.64);line-height:1.5}
@media(max-width:820px){.about-in{grid-template-columns:1fr}}

footer{background:var(--navy-deep);color:rgba(255,255,255,.5);padding:32px 5vw 96px;font-size:13px}

@media(prefers-reduced-motion:reduce){
  *{animation:none!important;transition:none!important}
  .rv,.hero-main,.tvc,.glow,.mascot-hero{opacity:1!important;transform:none!important}
  .peek,.pop{display:none}
}
    `}</style>
  );
}
