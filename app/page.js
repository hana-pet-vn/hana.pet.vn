'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useCart, vnd } from '../lib/cart';
import { fetchProducts, matchProduct } from '../lib/catalog';
import ProductModal from './_components/ProductModal';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);


/* ============================================================
   NOI KEY CU  ->  KEY TRANG CHU
   Admin dang ghi vao nhieu key rieng (brand, about, footer,
   trustBar, socials...) tu thoi trang chu CU. Trang chu moi doc
   key 'home'. Ham nay DICH cac key cu sang ten truong trang chu
   dung, de moi tab admin cu VAN chay, khong phai viet lai admin.

   Thu tu uu tien:  DEFAULTS  <  key cu  <  key 'home'
   -> Sua o tab "Trang chu" luon thang the, khong bao gio bi key cu de len.
   ============================================================ */
function bridgeLegacy(cfg) {
  const out = {};
  const put = (k, v) => { if (v !== undefined && v !== null && v !== '') out[k] = v; };

  const brand = cfg.brand || {};
  put('brandName', brand.name);
  put('logo',      brand.logoImg);

  /* Tab Hero cu: heroTitle 1 dong -> trang chu tach 2 dong.
     Co dau phay thi cat sau dau phay, khong thi de ca cum o dong 1. */
  put('heroEyebrow', brand.heroEyebrow);
  if (brand.heroTitle) {
    const i = String(brand.heroTitle).indexOf(',');
    if (i > 0) {
      put('heroTitle1', brand.heroTitle.slice(0, i + 1).trim());
      put('heroTitle2', brand.heroTitle.slice(i + 1).trim());
    } else {
      put('heroTitle1', brand.heroTitle);
      put('heroTitle2', '');
    }
  }
  put('heroSupport',     brand.heroSub);
  put('heroBtn1',        brand.heroBtn1);
  put('heroImage',       brand.heroImg1);
  put('heroRefillImage', brand.heroImg2);
  put('heroVideo',       brand.heroVideo);
  put('labelCart',       brand.labelAddCart);
  put('labelDetail',     brand.labelDetail);
  put('mfBadge',         brand.labelMisty);
  put('wbsBadge',        brand.labelWbs);

  const about = cfg.about || {};
  put('abTitle', about.heading);
  put('abBody1', about.body);
  put('abImage', about.img);

  const footer = cfg.footer || {};
  put('footerText', footer.tagline2);

  /* Trust bar cu la [{title, sub, icon}] -> thanh tin cay [{icon, t}] */
  const tb = cfg.trustBar ?? cfg.trustbar;
  if (Array.isArray(tb) && tb.length) {
    out.heroTrust = tb.map(x => ({ icon: x.icon || 'check', t: x.title || x.sub || '' }))
                      .filter(x => x.t);
  }
  return out;
}

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
  // Nút CTA hero: chữ ghép với giá thật lấy từ bảng products.
  // {gia} sẽ được thay bằng giá rẻ nhất của sản phẩm chủ lực.
  heroBtn1: 'Mua Misty Fresh — {gia}',
  heroBtn1Link: '#sp',
  heroMicro: 'Giao Hà Nội trong 24h · Đổi trả 7 ngày',
  heroImage: '',
  heroSkuName: 'Misty Fresh',
  heroVideo: '',
  heroShowVideo: false,
  // Ảnh nền cả khối hero. Bỏ trống = nền navy trơn như cũ.
  pmFullPage: 'Xem trang đầy đủ',
  heroBg: '',
  // Độ đậm lớp phủ navy trên ảnh nền (0-1). Cao hơn = chữ dễ đọc hơn.
  heroBgDim: 0.72,
  // Ảnh lõi refill nép sau chai chính trong hero. Bỏ trống = ẩn.
  heroRefillImage: '',
  // Bố cục kéo-thả từ admin: {main:{l,w}, refill:{l,w}} theo %.
  heroLayout: null,
  // Thanh tin cậy dưới hero. icon dùng tên Tabler (ti-truck...), bỏ trống = ẩn cả thanh.
  heroTrust: [
    { icon: 'truck',         t: 'Giao Hà Nội 24h' },
    { icon: 'shield-check',  t: 'Không cồn, không paraben' },
    { icon: 'refresh',       t: 'Đổi trả 7 ngày' },
    { icon: 'star',          t: '4.9/5 trên Shopee' },
  ],

  spKicker: 'Cửa hàng',
  spTitle: 'Chọn loại phù hợp với bé',
  spSub: 'Giá đổi theo lựa chọn — không cần mở thêm trang.',

  // mfKey: khớp với sản phẩm trong bảng products (theo tên hoặc mã SP).
  // Giá, giá gốc, tồn kho, danh sách phân loại → LẤY TỪ ADMIN, không ghi ở đây.
  mfKey: 'misty',
  mfBadge: 'Bán chạy nhất',
  mfName: 'Misty Fresh — Xịt khử mùi HOCl',
  mfDesc: 'HOCl là chất cơ thể tự tạo ra để diệt khuẩn. Xịt lên lông, 30 giây sau hết mùi, bé liếm phải vẫn an toàn.',
  mfOptLabel: 'Chọn loại',
  mfImage: '',

  inviteText: 'Muốn cún thơm như vừa đi spa về?',
  inviteMascot: '/mascots/pet-09.png',

  // wbsKey: khớp với sản phẩm trong bảng products. Giá + tồn kho lấy từ admin.
  // wbsScents chỉ giữ MÀU và ẢNH của từng mùi — tên mùi khớp với phân loại
  // (variant) mà ngài tạo trong tab Sản phẩm.
  wbsKey: 'bubble',
  wbsBadge: '5 mùi',
  wbsName: 'Waterless Bubble Shampoo',
  wbsDesc: 'Tắm khô dạng bọt, không cần nước — sạch thơm mà không stress. Đầu cọ massage silicone dịu da.',
  wbsOptLabel: 'Chọn mùi hương',
  wbsScents: [
    { name: 'Baby Powder',  c1: '#dbe4f4', c2: '#b3c4e2', dot: '#a9bfe0', icon: '', image: '' },
    { name: 'Lavender',     c1: '#ded4f2', c2: '#b9a8e2', dot: '#b49fe0', icon: '', image: '' },
    { name: 'Peach Yogurt', c1: '#f7d3bd', c2: '#eba884', dot: '#eda683', icon: '', image: '' },
    { name: 'Quince',       c1: '#f5e3ad', c2: '#e7ca70', dot: '#e8c96d', icon: '', image: '' },
    { name: 'Cotton Candy', c1: '#f6cadd', c2: '#eb9ec2', dot: '#ec9cc1', icon: '', image: '' },
  ],

  tmKicker: 'Ba mẹ pet nói gì',
  tmTitle: 'Ba mẹ nói gì về xịt khử mùi top sàn TMĐT?',
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
  // Mỗi gói combo là 1 SẢN PHẨM trong bảng products (ngài tạo trong tab
  // Sản phẩm, đặt tên "Gói Thử"... rồi điền giá + kho). Ở đây chỉ khai báo
  // gói nào khớp sản phẩm nào, gói nào nổi bật, và dòng mô tả gạch đầu dòng.
  comboTiers: [
    { key: 'gói thử', flag: '', best: false, image: '',
      items: ['1 chai Misty Fresh 250ml', 'Dùng khoảng 1 tháng', 'Hợp bé mới thử lần đầu'] },
    { key: 'quen thuộc', flag: 'Được chọn nhiều nhất', best: true, image: '',
      items: ['1 chai Misty Fresh 250ml', '1 lõi refill 250ml', 'Dùng khoảng 3 tháng', 'Tặng khăn lau Hanapet'] },
    { key: 'cả nhà', flag: '', best: false, image: '',
      items: ['1 chai Misty Fresh 250ml', '3 lõi refill 250ml', 'Dùng khoảng 8 tháng', 'Hợp nhà nuôi 2 bé trở lên'] },
  ],

  labelCart: 'Thêm vào giỏ',
  labelDetail: 'Chi tiết',

  abKicker: 'Về Hanapet',
  abTitle: 'Chúng mình chỉ làm hai thứ — và làm cho tới.',
  abBody1: 'Hanapet bắt đầu từ một câu hỏi đơn giản: vì sao chăm bé cưng lại phiền đến vậy? Bé sợ nước, nhà không có chỗ, mùa đông thì lạnh.',
  abBody2: 'Thay vì bày ra ba mươi món, chúng mình chọn hai. Công thức thử đi thử lại trên chính những bé cưng ở nhà trước khi bán cho ai.',
  abBtn: 'Xem sản phẩm →',
  abImage: '',
  facts: [
    { t: 'HOCl',           s: 'Chất cơ thể tự tạo để diệt khuẩn. Không cồn, không paraben.' },
    { t: 'Thử tại nhà',    s: 'Mỗi công thức dùng thật ít nhất 8 tuần trước khi lên kệ.' },
    { t: 'Đổi trả 7 ngày', s: 'Bé không hợp? Nhắn shop, đổi hoặc hoàn tiền.' },
  ],

  /* Mascot hien trong bong bong khi bam mua. Sua + upload duoc trong admin.
     CHI DUNG MASCOT NAU TOI. Do tuong phan tren nen TRANG:
         pet-01 #47271d -> 13.33  ro
         pet-09 #251c12 -> 16.75  ro
         pet-04 #a7a08f ->  2.60  nhat nhoe   (da bo)
         pet-08 #b59472 ->  2.82  nhat nhoe   (da bo)
         pet-10 #b59472 ->  2.82  nhat nhoe   (da bo)
     Them mascot moi thi phai kiem mau: tuong phan tren trang >= 4.5. */
  cartPets: ['/mascots/pet-01.png','/mascots/pet-09.png'],
  /* Cau co vu hien cung mascot. Sua duoc trong admin (tab Hero).
     Nguyen tac: khen NGUOI MUA hoac reo vui trung tinh.
     Tranh khen con thu ("Ngoan lam!") vi luc bam nut la CHU dang bam. */
  cartCheers: ['Chọn khéo ghê!', 'Bé nhà mình sướng nha!', 'Cảm ơn bạn yêu!',
               'Thơm rồi nè!', 'Hoan hô!', 'Chủ tâm lý ghê!'],

  buybarBtn: 'Thêm giỏ',
  buybarImage: '',

  // ---- Chữ dùng chung cho giỏ hàng / chi tiết / thanh toán ----
  // (để đúng luật: không hard-code chữ trong JSX)
  txtOutOfStock: 'Tạm hết hàng',
  txtInStock: 'Còn hàng · giao trong 24h',
  txtAddedToCart: 'Đã thêm vào giỏ',
  txtCartEmpty: 'Giỏ hàng đang trống',
  txtCheckout: 'Thanh toán',
  txtViewCart: 'Xem giỏ hàng',
  txtSubtotal: 'Tạm tính',
  txtShipFee: 'Phí vận chuyển',
  txtTotal: 'Tổng cộng',
  txtPlaceOrder: 'Đặt hàng',
  txtCOD: 'Thanh toán khi nhận hàng (COD)',
  txtCODNote: 'Trả tiền mặt cho shipper khi nhận. Kiểm tra hàng trước khi thanh toán.',
  txtOrderOk: 'Đặt hàng thành công!',
  txtOrderOkBody: 'Cảm ơn bạn đã tin tưởng Hanapet. Tụi mình sẽ gọi xác nhận trong ít phút nữa.',
  trustPoints: [
    'Đổi trả trong 7 ngày',
    'Giao Hà Nội trong 24h',
    'An toàn cho bé, không cồn không paraben',
  ],

  footerText: '© 2026 Hanapet · hana.pet.vn · Hà Nội',

  /* Chân trang 3 cột: thương hiệu / điều khoản / Bộ Công Thương. */
  logoWhite: '/logo-white.png',
  footerDesc: 'Sạch thơm cho bé, an tâm cho cả nhà. Hai sản phẩm, làm cho tới.',
  footerLines: ['Hà Nội, Việt Nam', 'hana.pet.vn'],
  footerCol2Title: 'Điều khoản',
  footerLinks: [
    { t: 'Chính sách đổi trả', href: '#' },
    { t: 'Chính sách bảo mật', href: '#' },
    { t: 'Điều khoản sử dụng', href: '#' },
  ],
  footerCol3Title: 'Chứng nhận',
  footerBctImg: '',
  footerBctHref: 'http://online.gov.vn',
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
  const [products, setProducts] = useState([]);
  const [ready, setReady] = useState(false);
  const [mfSel, setMfSel] = useState(0);
  const [scent, setScent] = useState(0);
  const [modalSlug, setModalSlug] = useState(null);
  const [barOn, setBarOn] = useState(false);
  const railRef = useRef(null);
  const heroRef = useRef(null);
  const footRef = useRef(null);
  const { add, openDrawer, count } = useCart();

  /* nạp config từ Supabase */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        /* Lay HET site_config, khong chi key 'home' — de con doc duoc
           cac key cu ma admin dang ghi vao. */
        const [cfgRes, prods] = await Promise.all([
          supabase.from('site_config').select('key,value'),
          fetchProducts(),
        ]);
        if (!alive) return;
        const rows = cfgRes?.data || [];
        const cfg  = Object.fromEntries(rows.map(r => [r.key, r.value]));
        setS({ ...DEFAULTS, ...bridgeLegacy(cfg), ...(cfg.home || {}) });
        setProducts(prods);
      } catch (e) {
        console.warn('load:', e?.message);
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => { alive = false; };
  }, []);

  /* thanh mua (nav khong doi mau nua — luon navy) */
  useEffect(() => {
    const onScroll = () => {
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

    /* Bong bong P3: mascot + chu NAM CHUNG mot khoi navy vien trang.
       Vien trang om ca hai -> mascot thanh mot phan cua bo nhan dien,
       khong phai hinh dan them. Chu doc tu cartCheers (sua trong admin),
       mascot doc tu cartPets (cung sua trong admin).
       Moi lan hien: 1 cau + 1 mascot + 1 dang bo goc/nghieng (v1..v4). */
    const cheers = (S.cartCheers || []).filter(Boolean);
    /* Chiu duoc ca 2 dang: mang chuoi (DEFAULTS) va mang object {src}
       (dang HRows dung trong admin). Phong khi luu nham dang. */
    const pets = (S.cartPets || [])
      .map(x => (typeof x === 'string' ? x : x?.src))
      .filter(Boolean);
    const key = btn.dataset.peekid || (btn.dataset.peekid = Math.random().toString(36).slice(2));
    const first = !seen.current[key];
    seen.current[key] = true;

    const word = cheers.length
      ? cheers[Math.floor(Math.random() * cheers.length)]
      : 'Hoan hô!';

    const el = document.createElement('div');
    el.className = 'peek v' + (1 + Math.floor(Math.random() * 4)) + (first ? '' : ' small');
    if (pets.length) {
      const p = pets[Math.floor(Math.random() * pets.length)];
      const img = document.createElement('img');
      img.src = p; img.alt = '';
      el.appendChild(img);
    }
    const tx = document.createElement('span');
    tx.textContent = word;          /* textContent: khong dinh loi chen ma doc */
    el.appendChild(tx);

    host.appendChild(el);
    setTimeout(() => el.remove(), 1950);
  }, [S.cartCheers, S.cartPets]);

  useEffect(() => {
    const onClick = (e) => {
      const b = e.target.closest('.cta-buy');
      /* KHONG chay hieu ung o hero: nut hero chi cuon xuong, chua them gio. */
      if (b && !b.closest('header')) peek(b);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [peek]);

  /* ── Nối config với sản phẩm thật trong bảng products ────────────────────
     Giá, giá gốc, tồn kho, danh sách phân loại đều lấy từ admin.
     Nếu chưa nhập sản phẩm thì khối đó tự ẩn (không hiện giá ma). */
  const mfProd = useMemo(() => matchProduct(products, S.mfKey, S.mfName), [products, S.mfKey, S.mfName]);
  const wbsProd = useMemo(() => matchProduct(products, S.wbsKey, S.wbsName), [products, S.wbsKey, S.wbsName]);

  // Misty: phân loại lấy thẳng từ sản phẩm
  const mfVars = mfProd?.variants?.length ? mfProd.variants : (mfProd ? [null] : []);
  const mfV = mfVars[Math.min(mfSel, mfVars.length - 1)] ?? null;
  const mfPrice = mfV ? mfV.price : (mfProd?.price ?? 0);
  const mfWas   = mfV ? mfV.original : (mfProd?.original ?? 0);
  const mfStockN = mfV ? mfV.stock : (mfProd?.stock ?? 0);
  const mfSave  = mfWas > mfPrice ? Math.round((1 - mfPrice / mfWas) * 100) : 0;

  // WBS: mỗi mùi trong config ghép với phân loại cùng tên trong sản phẩm
  const scents = useMemo(() => {
    const list = S.wbsScents || [];
    if (!wbsProd) return [];
    return list.map(s => {
      const v = (wbsProd.variants || []).find(
        x => x.name.toLowerCase().trim() === String(s.name).toLowerCase().trim()
      );
      return { ...s, variant: v || null };
    });
  }, [S.wbsScents, wbsProd]);

  const sc = scents[Math.min(scent, Math.max(0, scents.length - 1))] || {};
  const scV = sc.variant;
  const wbsPrice = scV ? scV.price : (wbsProd?.price ?? 0);
  const wbsWas   = scV ? scV.original : (wbsProd?.original ?? 0);
  const wbsStockN = scV ? scV.stock : (wbsProd?.stock ?? 0);
  const wbsSave  = wbsWas > wbsPrice ? Math.round((1 - wbsPrice / wbsWas) * 100) : 0;

  // Gói combo: mỗi gói là 1 sản phẩm riêng trong bảng products
  const combos = useMemo(() => (S.comboTiers || [])
    .map(t => ({ ...t, prod: matchProduct(products, t.key, t.name) }))
    .filter(t => t.prod), [S.comboTiers, products]);

  /* Thêm vào giỏ — hiệu ứng mascot vẫn chạy nhờ class .cta-buy */
  const addToCart = (prod, variant, img) => {
    if (!prod) return;
    const stock = variant ? variant.stock : prod.stock;
    if (stock <= 0) return;
    add({
      productId: prod.id,
      variantId: variant ? variant.id : '',
      name: prod.name,
      variantName: variant ? variant.name : '',
      price: variant ? variant.price : prod.price,
      img: img || prod.img || '',
    }, 1);
    openDrawer();
  };

  const railStep = () => (railRef.current?.querySelector('.tcard')?.offsetWidth || 220) + 16;

  return (
    <>
      <Styles />

      <nav id="nav">
        <div className="nav-in">
        <div className="brand">
          {S.logo ? <img className="mark-img" src={S.logo} alt={S.brandName} />
                  : <span className="mark"><Ph text="LOGO" /></span>}
          <span>{S.brandName}</span>
        </div>
        <div className="navlinks">
          <a href="#sp">{S.navShop}</a>
          <a href="#about">{S.navAbout}</a>
          <button type="button" className="navcart" onClick={openDrawer}>
            {S.navCart}{count > 0 && <em>{count}</em>}
          </button>
        </div>
        </div>
      </nav>

      {/* ---------------- HERO ---------------- */}
      <header className="hero" ref={heroRef}>
        {S.heroBg && (
          <div className="hero-bg" aria-hidden="true">
            <img src={S.heroBg} alt="" />
            <div className="hero-bg-dim"
                 style={{ opacity: S.heroBgDim ?? 0.72 }} />
          </div>
        )}
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
            <a className="btn btn-primary cta-buy" href={S.heroBtn1Link || '#sp'}>
              {String(S.heroBtn1 || '').replace('{gia}', mfPrice ? vnd(mfPrice) : '')}
            </a>
          </div>
          <p className="microcopy rv d5">{S.heroMicro}</p>
        </div>

        <div className="shot">
          <div className="glow" />

          {/* Anh hero RIENG, khong muon anh san pham nua. De trong thi hien
              o net dut nhac upload trong admin. */}
          {/* Bố cục kéo-thả từ admin (heroLayout) đè lên vị trí mặc định. */}
          <div className="hero-main"
               style={S.heroLayout?.main ? { left: S.heroLayout.main.l + '%', width: S.heroLayout.main.w + '%' } : undefined}>
            <Img src={S.heroImage} alt={S.heroSkuName}
                 text="ẢNH HERO|tải lên trong admin" dark />
          </div>

          <div className="hero-refill"
               style={S.heroLayout?.refill ? { left: S.heroLayout.refill.l + '%', width: S.heroLayout.refill.w + '%' } : undefined}>
            <Img src={S.heroRefillImage} text="ẢNH REFILL|tải lên trong admin" dark />
          </div>

          {S.heroShowVideo && (
            <div className="tvc">
              <VideoEmbed url={S.heroVideo} label="TVC 9:16" />
            </div>
          )}
        </div>

        <div className="wave">
          <svg viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true">
            <path fill="#101c38" d="M0,64 C240,120 480,16 720,48 C960,80 1200,112 1440,56 L1440,120 L0,120 Z" />
          </svg>
        </div>
      </header>

      {(S.heroTrust || []).length > 0 && (
        <div className="trustbar-w">
          <div className="trustbar">
          {S.heroTrust.map((x, i) => (
            <span key={i}>
              <i className={'tb-ic tb-' + (x.icon || 'check')} aria-hidden="true" />
              {x.t}
            </span>
          ))}
          </div>
        </div>
      )}

      {/* ---------------- SẢN PHẨM ---------------- */}
      <section id="sp">
        <div className="shead">
          <div className="kicker">{S.spKicker}</div>
          <h2>{S.spTitle}</h2>
          <p>{S.spSub}</p>
        </div>

        <div className="grid">
          {/* MISTY */}
          {mfProd && (
          <article className="card star">
            <div className="cimg" style={{ background: 'linear-gradient(160deg,#26396a,#18284e)' }}>
              {S.mfBadge && <span className="badge">{S.mfBadge}</span>}
              <Img src={(mfV && mfV.img) || mfProd.img || S.mfImage} alt={mfProd.name}
                   text="ẢNH THẬT|chai Misty Fresh" dark />
            </div>
            <div className="cbody">
              <h3>{S.mfName || mfProd.name}</h3>
              <p className="cdesc">{S.mfDesc}</p>
              {mfProd.variants.length > 0 && (
                <>
                  <div className="optlabel">{S.mfOptLabel}</div>
                  <div className="variants">
                    {mfProd.variants.map((v, i) => (
                      <button key={v.id || i}
                              className={'chip' + (i === mfSel ? ' on' : '') + (v.stock <= 0 ? ' out' : '')}
                              onClick={() => setMfSel(i)}>{v.name}</button>
                    ))}
                  </div>
                </>
              )}
              <div className="cfoot">
                <div className="cfoot-l">
                  <div className="pricerow">
                    <span className="price">{vnd(mfPrice)}</span>
                    {mfWas > mfPrice && <span className="was">{vnd(mfWas)}</span>}
                    {mfSave > 0 && <span className="save">Rẻ hơn {mfSave}%</span>}
                  </div>
                  <div className={'stock' + (mfStockN <= 0 ? ' out' : '')}>
                    {mfStockN <= 0 ? S.txtOutOfStock : S.txtInStock}
                  </div>
                </div>
                <div className="cbtns">
                  <a className="btn b-more" href={`/san-pham/${mfProd.slug}`}
                     onClick={e => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
                                     e.preventDefault(); setModalSlug(mfProd.slug); }}>{S.labelDetail}</a>
                  <button type="button" className="btn b-buy cta-buy" disabled={mfStockN <= 0}
                          onClick={() => addToCart(mfProd, mfV, (mfV && mfV.img) || mfProd.img || S.mfImage)}>
                    {mfStockN <= 0 ? S.txtOutOfStock : S.labelCart}
                  </button>
                </div>
              </div>
            </div>
          </article>
          )}

          {/* DÒNG MỜI GỌI */}
          <div className="invite">
            <div className="msc">
              <Img src={S.inviteMascot} text="MASCOT|nhỏ" />
            </div>
            <p>{S.inviteText}</p>
            <div className="arrow" />
          </div>

          {/* WBS */}
          {wbsProd && (
          <article className="card">
            <div className="cimg light"
                 style={{ background: `linear-gradient(160deg,${sc.c1 || '#dbe4f4'},${sc.c2 || '#b3c4e2'})` }}>
              {S.wbsBadge && <span className="badge">{S.wbsBadge}</span>}
              <Img src={(scV && scV.img) || sc.image || wbsProd.img} alt={wbsProd.name}
                   text={`ẢNH THẬT|chai Waterless Bubble|(${sc.name || 'mùi'})`} />
            </div>
            <div className="cbody">
              <h3>{S.wbsName || wbsProd.name}</h3>
              <p className="cdesc">{S.wbsDesc}</p>
              {scents.length > 0 && (
                <>
                  <div className="optlabel">{S.wbsOptLabel}</div>
                  <div className="scents">
                    {scents.map((s, i) => (
                      <button key={i}
                              className={'scent' + (i === scent ? ' on' : '') +
                                         (s.variant && s.variant.stock <= 0 ? ' out' : '')}
                              onClick={() => setScent(i)}
                              title={s.name} aria-label={s.name}
                              aria-pressed={i === scent}>
                        {s.icon ? <img className="sic" src={s.icon} alt="" />
                                : <i style={{ background: s.dot }} />}
                        <b>{s.name}</b>
                      </button>
                    ))}
                  </div>
                </>
              )}
              <div className="cfoot">
                <div className="cfoot-l">
                  <div className="pricerow">
                    <span className="price">{vnd(wbsPrice)}</span>
                    {wbsWas > wbsPrice && <span className="was">{vnd(wbsWas)}</span>}
                    {wbsSave > 0 && <span className="save">Rẻ hơn {wbsSave}%</span>}
                  </div>
                  <div className={'stock' + (wbsStockN <= 0 ? ' out' : '')}>
                    {wbsStockN <= 0 ? S.txtOutOfStock : S.txtInStock}
                  </div>
                </div>
                <div className="cbtns">
                  <a className="btn b-more" href={`/san-pham/${wbsProd.slug}`}
                     onClick={e => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
                                     e.preventDefault(); setModalSlug(wbsProd.slug); }}>{S.labelDetail}</a>
                  <button type="button" className="btn b-buy cta-buy" disabled={wbsStockN <= 0}
                          onClick={() => addToCart(wbsProd, scV, (scV && scV.img) || sc.image || wbsProd.img)}>
                    {wbsStockN <= 0 ? S.txtOutOfStock : S.labelCart}
                  </button>
                </div>
              </div>
            </div>
          </article>
          )}
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
              <div className={'tcard' + (t.embed ? '' : ' tquote')} key={i}>
                {t.embed || t.thumb ? (
                  <div className="tvid">
                    <VideoEmbed url={t.embed} poster={t.thumb} label={`VIDEO|${t.who}`} />
                  </div>
                ) : (
                  /* Chưa có video → hiện câu nói cho tử tế, không để ô trống */
                  <div className="tsay"><p>{t.quote}</p></div>
                )}
                <div className="tmeta">
                  <span className="who">{t.who}</span>
                  <span className="pet">{t.pet}</span>
                  {t.embed && t.quote && <span className="quote">{t.quote}</span>}
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
      {combos.length > 0 && (
        <section className="combo" id="combo">
          <div className="combo-in">
            <div className="shead">
              <div className="kicker">{S.cbKicker}</div>
              <h2>{S.cbTitle}</h2>
              <p>{S.cbSub}</p>
            </div>
            <div className="tiers">
              {combos.map((t, i) => {
                const p = t.prod;
                const save = p.original > p.price ? Math.round((1 - p.price / p.original) * 100) : 0;
                return (
                  <div className={'tier' + (t.best ? ' best' : '')} key={p.id || i}>
                    {t.flag && <span className="tflag">{t.flag}</span>}
                    <div className="timg">
                      <Img src={t.image || p.img} alt={p.name} text={`ẢNH|${p.name}`} dark={!t.best} />
                    </div>
                    <h3>{p.name}</h3>
                    <div className="tprice">
                      {vnd(p.price)}{p.original > p.price && <s>{vnd(p.original)}</s>}
                    </div>
                    {save > 0 && <span className="tsave">Rẻ hơn {save}%</span>}
                    <ul className="tlist">
                      {(t.items || []).map((x, k) => <li key={k}>{x}</li>)}
                    </ul>
                    <button type="button" className="btn t-btn cta-buy" disabled={p.stock <= 0}
                            onClick={() => addToCart(p, null, t.image || p.img)}>
                      {p.stock <= 0 ? S.txtOutOfStock : S.cbBtn}
                    </button>
                  </div>
                );
              })}
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

      <ProductModal slug={modalSlug} S={S}
                    onClose={fromPop => {
                      setModalSlug(null);
                      if (!fromPop && typeof window !== 'undefined'
                          && window.history.state?.hpModal) window.history.back();
                    }} />

      <footer ref={footRef}>
        <div className="foot-in">
          <div>
            <div className="f-brand">
              {(S.logoWhite || S.logo) && <img src={S.logoWhite || S.logo} alt={S.brandName} />}
              <b>{S.brandName}</b>
            </div>
            <p className="f-desc">{S.footerDesc}</p>
            <div className="f-lines">
              {(S.footerLines || []).map((l, i) => <span key={i}>{l}</span>)}
            </div>
          </div>
          <div>
            <h4>{S.footerCol2Title}</h4>
            <ul className="f-links">
              {(S.footerLinks || []).map((l, i) => (
                <li key={i}><a href={l.href || '#'}>{l.t}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4>{S.footerCol3Title}</h4>
            <a className="f-bct" href={S.footerBctHref || '#'} target="_blank" rel="noreferrer">
              {S.footerBctImg
                ? <img src={S.footerBctImg} alt="Đã thông báo Bộ Công Thương" />
                : <span className="f-bct-ph">DẤU BỘ CÔNG THƯƠNG<br/>tải lên trong admin</span>}
            </a>
          </div>
        </div>
        <div className="f-bottom">{S.footerText}</div>
      </footer>

      {/* ---------------- THANH MUA ---------------- */}
      {mfProd && (
      <div className={'buybar' + (barOn ? ' show' : '')}>
        <div className="bb-img">
          <Img src={S.buybarImage || (mfV && mfV.img) || mfProd.img} text="ẢNH|chai" dark />
        </div>
        <div className="bb-txt">
          <span className="bb-name">
            {mfProd.name}{mfV ? ` — ${mfV.name}` : ''}
          </span>
          <span className="bb-price">
            <b>{vnd(mfPrice)}</b>{mfWas > mfPrice && <s>{vnd(mfWas)}</s>}
          </span>
        </div>
        <button type="button" className="btn b-buy cta-buy" disabled={mfStockN <= 0}
                onClick={() => addToCart(mfProd, mfV, (mfV && mfV.img) || mfProd.img || S.mfImage)}>
          {mfStockN <= 0 ? S.txtOutOfStock : S.buybarBtn}
        </button>
      </div>
      )}
    </>
  );
}

/* ============================================================
   STYLES
   ============================================================ */
function Styles() {
  return (
    <style jsx global>{`
:root{--navy:#18284e;--navy-deep:#101c38;--cream:#f6f4ef;--ink:#1b2440;--nav-h:78px}
*{box-sizing:border-box;margin:0;padding:0}
/* Nền mép: navy ở trên (dưới hero), kem ở dưới — không để lộ dải trắng
   khi màn hình rất rộng hoặc khi cuộn quá đà (overscroll). */
html{scroll-behavior:smooth;scroll-padding-top:var(--nav-h);background:var(--navy);overscroll-behavior-y:none}
body{font-family:'Nunito Sans',system-ui,sans-serif;color:var(--ink);background:var(--cream);-webkit-font-smoothing:antialiased;overflow-x:hidden}
h1,h2,h3{font-family:'Nunito',system-ui,sans-serif;font-weight:900;letter-spacing:-.02em}
img{display:block;max-width:100%}
button{font:inherit}

.ph{width:100%;height:100%;display:grid;place-content:center;align-content:center;text-align:center;
  font-size:10.5px;font-weight:800;letter-spacing:.1em;line-height:1.6;padding:10px;color:rgba(24,40,78,.45)}
.ph-dark{color:rgba(255,255,255,.52)}
.ph span{display:block}

/* Nav DONG CUNG mau navy, KHONG doi mau khi cuon nua (Tung yeu cau).
   Cao them cho logo + nut gio khong cham vien. */
nav{position:fixed;top:0;left:0;right:0;z-index:50;padding:0 5vw;height:var(--nav-h);
  background:var(--navy);border-bottom:1px solid rgba(255,255,255,.09)}
.nav-in{max-width:1180px;height:100%;margin:0 auto;display:flex;align-items:center;justify-content:space-between}
.brand{display:flex;align-items:center;gap:10px;color:#fff;font-family:'Nunito';font-weight:900;font-size:20px;
  text-decoration:none;transition:.2s}
.brand:hover{opacity:.85}
.brand .mark{width:34px;height:34px;border-radius:10px;background:#fff;overflow:hidden}
.brand .mark-img{width:34px;height:34px;object-fit:contain;background:#fff;border-radius:10px;padding:5px}
.navlinks{display:flex;gap:24px;font-size:14px;font-weight:700;align-items:center}
.navlinks a{color:rgba(255,255,255,.82);text-decoration:none;position:relative;transition:.2s}
.navlinks a:hover{color:#fff}
.navlinks a:not(.navcart)::after{content:"";position:absolute;left:0;right:0;bottom:-5px;height:2px;
  background:#fff;border-radius:2px;transform:scaleX(0);transition:transform .22s cubic-bezier(.2,.7,.3,1)}
.navlinks a:not(.navcart):hover::after{transform:scaleX(1)}
.navcart{background:#fff;color:var(--navy)!important;padding:8px 19px;border-radius:999px;font-weight:800;
  border:none;cursor:pointer;display:inline-flex;align-items:center;gap:7px;font-size:14px;transition:.2s}
.navcart:hover{transform:translateY(-1px);box-shadow:0 6px 16px rgba(0,0,0,.28)}
.navcart em{font-style:normal;background:var(--navy);color:#fff;border-radius:999px;min-width:20px;height:20px;
  display:grid;place-items:center;font-size:11.5px;font-weight:800;padding:0 5px}
@media(max-width:760px){.navlinks a:not(.navcart){display:none}}

/* Bỏ min-height:100svh cứng. Trước đây 100svh + padding 116/140 làm hero cao
   hơn màn hình trên máy rộng-thấp → nav che mất dòng eyebrow. */
/* Ảnh nền hero (heroBg). Lớp phủ navy đè lên để chữ trắng vẫn đọc được. */
.hero-bg{position:absolute;inset:0;z-index:0;pointer-events:none}
.hero-bg img{width:100%;height:100%;object-fit:cover;display:block}
.hero-bg-dim{position:absolute;inset:0;background:var(--navy)}
.hero{position:relative;background:var(--navy);color:#fff;overflow:hidden;
  display:grid;grid-template-columns:minmax(0,1fr) clamp(360px,46%,560px);align-items:center;gap:0;max-width:1180px;margin:0 auto;
  padding:calc(var(--nav-h) + clamp(24px,4vh,52px)) 5vw clamp(46px,5.4vw,80px)}
.hero::before{content:"";position:absolute;inset:0;background:radial-gradient(70% 90% at 74% 46%,rgba(255,255,255,.18),transparent 62%)}
.hero>*{position:relative;z-index:2}
.rv{opacity:0;transform:translateY(22px);animation:rise .85s cubic-bezier(.22,.68,.24,1) forwards}
@keyframes rise{to{opacity:1;transform:translateY(0)}}
.d1{animation-delay:.05s}.d2{animation-delay:.18s}.d3{animation-delay:.3s}.d4{animation-delay:.42s}.d5{animation-delay:.54s}
/* Eyebrow dạng viên thuốc — gọn hơn gạch ngang, giống nhãn trên chai. */
.eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:11.5px;font-weight:800;letter-spacing:.1em;
  text-transform:uppercase;color:rgba(255,255,255,.8);margin-bottom:clamp(12px,2vh,20px);
  background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.16);padding:6px 14px;border-radius:999px}
.eyebrow::before{content:"";width:6px;height:6px;border-radius:50%;background:#fff;flex-shrink:0}
h1{font-size:clamp(40px,min(6.6vw,9.4vh),94px);line-height:.97;margin-bottom:clamp(10px,1.7vh,16px);color:#fff}
h1 .l2{display:block}
.support{font-family:'Nunito';font-weight:700;font-size:clamp(16px,1.5vw,21px);color:rgba(255,255,255,.66);margin-bottom:clamp(16px,3vh,32px)}
.bens{list-style:none;display:flex;flex-direction:column;gap:clamp(7px,1.2vh,11px);margin:0 0 clamp(18px,3vh,32px)}
.bens li{display:flex;gap:11px;align-items:flex-start;font-size:15.5px;font-weight:600;color:rgba(255,255,255,.86);line-height:1.45;max-width:40ch}
.bens li::before{content:"";flex-shrink:0;width:19px;height:19px;border-radius:50%;margin-top:1px;background:#fff;
  -webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M20 6L9 17l-5-5' stroke='black' stroke-width='3.4' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/13px no-repeat;
  mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M20 6L9 17l-5-5' stroke='black' stroke-width='3.4' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/13px no-repeat}

.btn:disabled{opacity:.45;cursor:not-allowed}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:9px;padding:16px 30px;border-radius:999px;
  font-weight:800;font-size:15.5px;text-decoration:none;border:2px solid transparent;cursor:pointer;transition:.22s cubic-bezier(.2,.7,.3,1)}
.cta-row{display:flex;gap:13px;flex-wrap:wrap}
.btn-primary{background:#fff;color:var(--navy);box-shadow:0 8px 26px rgba(0,0,0,.25)}
.btn-primary:hover{transform:translateY(-2px);box-shadow:0 14px 34px rgba(0,0,0,.32)}
.btn-ghost{border-color:rgba(255,255,255,.34);color:#fff}
.btn-ghost:hover{border-color:#fff;background:rgba(255,255,255,.09);transform:translateY(-2px)}
.microcopy{font-size:13.5px;color:rgba(255,255,255,.55);margin-top:16px;font-weight:600;line-height:1.7}

/* Cột hình hero: chai KHÔNG nằm trong khung. Chai chính chạm đáy,
   lõi refill nhỏ hơn nép sau bên phải, mascot ngồi góc dưới-phải.
   Cả cụm lùi trái để không tạo khoảng trống giữa chữ và ảnh. */
.shot{position:relative;height:clamp(380px,min(56vw,72vh),580px);
  margin-left:clamp(-30px,-1.5vw,0px);margin-right:clamp(-30px,-2vw,0px)}
.glow{position:absolute;left:8%;bottom:7%;width:clamp(260px,30vw,370px);aspect-ratio:1;border-radius:50%;
  background:radial-gradient(circle,rgba(255,255,255,.16),transparent 66%);
  filter:blur(20px);opacity:0;animation:gin 2.2s ease-out .5s forwards;z-index:1}
@keyframes gin{to{opacity:1}}

.hero-main{position:absolute;left:-4%;bottom:0;z-index:3;
  width:58%;height:100%;
  display:grid;place-items:end center;align-content:end;
  opacity:0;transform:translateY(44px) scale(.95);
  animation:pin 1.7s cubic-bezier(.16,.7,.22,1) .55s forwards;transition:transform .35s}
@keyframes pin{to{opacity:1;transform:translateY(0) scale(1)}}
.hero-main:hover{transform:translateY(-10px)}
/* Ảnh trần: không khung, không nền. Chỉ đổ bóng cho nổi khỏi nền navy. */
.hero-main img{width:auto;height:auto;max-width:100%;max-height:100%;object-fit:contain;
  filter:drop-shadow(0 26px 46px rgba(0,0,0,.42))}

/* Refill ĐỨNG CẠNH chai chính, CÙNG khung cùng chân — chai nào ngắn hơn
   thì tự trông thấp hơn, không ép bằng CSS. */
.hero-refill{position:absolute;left:46%;bottom:0;z-index:2;
  width:58%;height:100%;
  display:grid;place-items:end center;align-content:end;
  opacity:0;transform:translateY(36px);animation:pin 1.6s cubic-bezier(.16,.7,.22,1) 1.0s forwards}
.hero-refill img{width:auto;height:auto;max-width:100%;max-height:100%;object-fit:contain;
  filter:drop-shadow(0 18px 32px rgba(0,0,0,.36))}


/* Thanh tin cậy bản navy đậm — nối liền hero (wave cũng đổ #101c38). */
.trustbar-w{background:var(--navy-deep);padding:0 5vw}
.trustbar{max-width:1180px;margin:0 auto;display:grid;grid-template-columns:repeat(4,1fr)}
.trustbar span{display:flex;align-items:center;justify-content:center;gap:9px;
  padding:18px 10px;font-size:13.5px;font-weight:800;color:rgba(255,255,255,.86);text-align:center;
  border-left:1px solid rgba(255,255,255,.14)}
.trustbar span:first-child{border-left:0}
.tb-ic{width:20px;height:20px;flex-shrink:0;background:#fff;opacity:.8;
  -webkit-mask-size:contain;mask-size:contain;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;
  -webkit-mask-position:center;mask-position:center}
.tb-truck{-webkit-mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='7' cy='17' r='2'/%3E%3Ccircle cx='17' cy='17' r='2'/%3E%3Cpath d='M5 17H3V6a1 1 0 0 1 1-1h9v12m-4 0h6m4 0h2v-6h-8m0-5h5l3 5'/%3E%3C/svg%3E");mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='7' cy='17' r='2'/%3E%3Ccircle cx='17' cy='17' r='2'/%3E%3Cpath d='M5 17H3V6a1 1 0 0 1 1-1h9v12m-4 0h6m4 0h2v-6h-8m0-5h5l3 5'/%3E%3C/svg%3E")}
.tb-shield-check{-webkit-mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M11.46 20.85a2 2 0 0 0 1.08 0C16.5 19.6 19 15.7 19 12V6.3a1 1 0 0 0-.7-.95l-6-1.9a1 1 0 0 0-.6 0l-6 1.9a1 1 0 0 0-.7.95V12c0 3.7 2.5 7.6 6.46 8.85'/%3E%3Cpath d='m9 12 2 2 4-4'/%3E%3C/svg%3E");mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M11.46 20.85a2 2 0 0 0 1.08 0C16.5 19.6 19 15.7 19 12V6.3a1 1 0 0 0-.7-.95l-6-1.9a1 1 0 0 0-.6 0l-6 1.9a1 1 0 0 0-.7.95V12c0 3.7 2.5 7.6 6.46 8.85'/%3E%3Cpath d='m9 12 2 2 4-4'/%3E%3C/svg%3E")}
.tb-refresh{-webkit-mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 11A8.1 8.1 0 0 0 4.5 9M4 5v4h4'/%3E%3Cpath d='M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4'/%3E%3C/svg%3E");mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 11A8.1 8.1 0 0 0 4.5 9M4 5v4h4'/%3E%3Cpath d='M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4'/%3E%3C/svg%3E")}
.tb-star{-webkit-mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 17.75 5.83 21l1.18-6.88-5-4.87 6.9-1L12 2l3.09 6.26 6.9 1-5 4.87L18.17 21z'/%3E%3C/svg%3E");mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 17.75 5.83 21l1.18-6.88-5-4.87 6.9-1L12 2l3.09 6.26 6.9 1-5 4.87L18.17 21z'/%3E%3C/svg%3E")}
.tb-check{-webkit-mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 6 9 17l-5-5'/%3E%3C/svg%3E");mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 6 9 17l-5-5'/%3E%3C/svg%3E")}
@media(max-width:900px){.trustbar{grid-template-columns:repeat(2,1fr)}
  .trustbar span{font-size:12.5px;padding:14px 8px}
  .trustbar span:nth-child(3){border-left:0}
  .trustbar span:nth-child(-n+2){border-bottom:1px solid rgba(255,255,255,.14)}}
@media(max-width:400px){.trustbar span{font-size:11.5px;gap:6px}.tb-ic{width:16px;height:16px}}
.tvc{position:relative;z-index:3;width:clamp(122px,14.5vw,192px);aspect-ratio:9/16;border-radius:18px;overflow:hidden;
  background:linear-gradient(165deg,#22345d,#141f3d);border:1px solid rgba(255,255,255,.2);box-shadow:0 26px 60px rgba(0,0,0,.42);
  opacity:0;transform:translateY(40px) scale(.95);animation:pin 1.05s cubic-bezier(.2,.72,.24,1) .62s forwards;transition:transform .35s}
.tvc:hover{transform:translateY(-9px)}
.tvc iframe,.tvc video,.tvc img{width:100%;height:100%;border:0;object-fit:cover}
.play{position:absolute;inset:0;margin:auto;width:52px;height:52px;border-radius:50%;border:none;
  background:rgba(255,255,255,.94);cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.3);z-index:2}
.play::after{content:"";position:absolute;inset:0;margin:auto;width:0;height:0;
  border-left:15px solid var(--navy);border-top:10px solid transparent;border-bottom:10px solid transparent;margin-left:20px}
.wave{position:absolute;bottom:-1px;left:0;width:100%;line-height:0;z-index:1;pointer-events:none}
.wave svg{width:100%;height:clamp(44px,5vw,78px);display:block}
@media(max-width:900px){.hero{grid-template-columns:1fr;padding:calc(var(--nav-h) + 30px) 6vw 52px}
  .shot{height:clamp(340px,86vw,460px);margin:24px 0 0}
  .hero-main{left:-3%;width:58%;height:100%}
  .hero-refill{left:45%;bottom:0;width:58%;height:100%}
  .glow{left:6%;bottom:7%;width:min(68vw,310px)}}

section{padding:clamp(48px,5.5vw,76px) 5vw}
.shead{max-width:640px;margin-bottom:clamp(24px,3vw,34px)}
.kicker{font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--navy);opacity:.55;margin-bottom:12px}
.shead h2{font-size:clamp(26px,3.2vw,40px);line-height:1.1;margin-bottom:10px;color:var(--navy)}
.shead p{color:rgba(27,36,64,.68);font-size:16px;line-height:1.65}

/* v18: Khu SẢN PHẨM đảo màu — nền XÁM NHẠT, thẻ navy ĐẶC (bỏ kính mờ).
   Kicker/shead dùng lại màu navy mặc định nên không cần override nữa. */
#sp{background:#f4f5f7}
/* v18.1: khu #sp bung theo khung 1180 (cùng cỡ .nav-in) — tiêu đề thẳng
   hàng với lưới thẻ, hết cảnh tiêu đề dính trái còn thẻ lọt giữa. */
#sp .shead{max-width:1180px;margin-left:auto;margin-right:auto}
#sp .shead p{max-width:640px}

/* v18.1: PC = 2 thẻ cạnh nhau lấp đầy khung 1180; màn hẹp tự về 1 cột.
   min(480px,100%) để không vỡ trên màn cực hẹp. */
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(480px,100%),1fr));
  gap:clamp(16px,1.8vw,24px);max-width:1180px;margin:0 auto}
/* v14: thẻ NẰM NGANG — ảnh dọc bên trái, chữ bên phải. Xếp chồng 1 cột. */
.card{background:var(--navy);border-radius:18px;overflow:hidden;border:none;
  transition:.28s cubic-bezier(.2,.7,.3,1);box-shadow:0 6px 18px rgba(24,40,78,.16);
  display:grid;grid-template-columns:200px minmax(0,1fr);align-items:stretch}
.card.star{box-shadow:0 8px 24px rgba(24,40,78,.22)}
.card:hover{transform:translateY(-6px);box-shadow:0 18px 40px rgba(24,40,78,.26)}
/* v18.1: BỎ aspect-ratio + max-height. Cặp này làm khung ảnh tự tính rộng
   hơn cột chứa nó rồi (vì position:relative) ĐÈ LÊN cột chữ — chính là lỗi
   chữ bị cắt cụt. Giờ: rộng = đúng cột lưới, cao = giãn theo thẻ, ảnh tự
   căn GIỮA DỌC (xong luôn việc treo "ảnh chai căn giữa"). */
.cimg{position:relative;overflow:hidden;transition:background .45s;
  display:grid;place-items:center;padding:20px;min-height:280px}
/* Ảnh LUÔN nằm gọn trong khung, không kéo giãn theo chiều cao cột chữ */
.cimg img{width:auto;height:auto;max-width:100%;max-height:100%;object-fit:contain;
  transition:transform .3s cubic-bezier(.2,.7,.3,1)}
.card:hover .cimg img{transform:translateY(-6px) scale(1.03)}
.badge{position:absolute;top:14px;left:14px;background:#fff;color:var(--navy);font-size:11px;font-weight:800;
  letter-spacing:.08em;text-transform:uppercase;padding:6px 12px;border-radius:999px;box-shadow:0 3px 10px rgba(0,0,0,.14);z-index:2}
.cbody{padding:20px 24px;display:flex;flex-direction:column;gap:8px;justify-content:center;min-width:0}
.cbody h3{font-size:19px;color:var(--navy);line-height:1.22}
.cdesc{font-size:13.5px;color:rgba(27,36,64,.66);line-height:1.55}
.optlabel{font-size:12.5px;font-weight:800;color:var(--navy);opacity:.6}
.variants{display:flex;gap:8px;flex-wrap:wrap}
.chip{padding:9px 15px;border-radius:999px;border:1.5px solid rgba(24,40,78,.18);font-size:13px;font-weight:700;
  cursor:pointer;transition:.2s;background:var(--cream);color:var(--navy)}
.chip:hover{border-color:var(--navy)}
.chip.on{background:var(--navy);color:#fff;border-color:var(--navy)}
.chip.out,.scent.out{opacity:.45}
/* Mui dang chon PHINH ra thanh vien thuoc co ten ben trong; cac mui khac
   van la cham tron. Van 1 hang, khong xuong dong -> khong lam the cao len. */
.scents{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.scent{display:inline-flex;align-items:center;gap:0;padding:5px;height:34px;border-radius:999px;
  background:transparent;border:1.5px solid rgba(24,40,78,.16);cursor:pointer;
  transition:.26s cubic-bezier(.2,.7,.3,1);font-size:13px;font-weight:800;color:var(--navy);white-space:nowrap}
.scent:hover{border-color:rgba(24,40,78,.4)}
.scent.on{background:#fff;border-color:var(--navy);gap:8px;padding-right:14px;
  box-shadow:0 2px 8px rgba(24,40,78,.12)}
.scent i{width:22px;height:22px;border-radius:50%;flex-shrink:0;display:block}
.scent .sic{width:22px;height:22px;border-radius:50%;flex-shrink:0;object-fit:cover}
.scent b{font-weight:800;max-width:0;overflow:hidden;opacity:0;
  transition:max-width .26s cubic-bezier(.2,.7,.3,1),opacity .2s}
.scent.on b{max-width:150px;opacity:1}
.pricerow{display:flex;align-items:baseline;gap:9px;flex-wrap:wrap;padding-top:4px}
.price{font-family:'Nunito';font-weight:900;font-size:25px;color:var(--navy);letter-spacing:-.02em}
.was{font-size:15px;color:rgba(27,36,64,.36);text-decoration:line-through}
.save{font-size:12px;font-weight:800;color:var(--navy);background:rgba(24,40,78,.09);padding:4px 9px;border-radius:6px}
.stock{font-size:12px;color:#2e7d4f;font-weight:700;display:flex;align-items:center;gap:6px}
.stock::before{content:"";width:7px;height:7px;border-radius:50%;background:#2e7d4f}
.stock.out{color:#c25050}
.stock.out::before{background:#c25050}
.cfoot{padding-top:12px;border-top:1px solid rgba(24,40,78,.11);
  display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap}
.cfoot-l{display:flex;flex-direction:column;gap:7px;min-width:0}
.cbtns{display:flex;gap:9px;flex-shrink:0}
.cbtns .btn{padding:11px 16px;font-size:13.5px;white-space:nowrap}
.cbtns .b-buy{padding-left:20px;padding-right:20px}
@media(max-width:620px){.cfoot{flex-direction:column;align-items:stretch;gap:13px}
  .cbtns .btn{flex:1;padding-left:14px;padding-right:14px}}
/* v18: màn hẹp — ảnh VẪN BÊN TRÁI (Tung chốt), chỉ thu cột ảnh.
   Chip/nút mobile nằm ở CUỐI khối .card bên dưới (phải đứng SAU override
   cùng tên, không thì bị đè — bài học điểm 9). */
@media(max-width:620px){
  .card{grid-template-columns:132px minmax(0,1fr)}
  .cimg{min-height:210px;padding:12px}
}
.b-buy{background:var(--navy);color:#fff}
.b-buy:hover:not(:disabled){background:var(--navy-deep);transform:translateY(-2px);box-shadow:0 10px 24px rgba(24,40,78,.28)}
.b-more{border:2px solid rgba(24,40,78,.18);color:var(--navy);background:var(--cream)}
.b-more:hover{border-color:var(--navy);background:#fff;transform:translateY(-2px)}

/* ── v18: Bên trong thẻ navy ĐẶC — navy nhiều tầng, hierarchy 3 tầng ──
   Tầng 1 SP (tên + giá) > Tầng 2 nút mua > Tầng 3 còn lại.
   Tầng navy: nền #18284e > chip #22355f > viền #3d5589.
   Chữ phụ dùng màu ĐẶC (#c3cde0, #9fb0d0, #8fa3c8), không dùng trắng-mờ. */
.card .cbody h3{color:#fff}
.card .cdesc{font-size:11.5px;color:#9fb0d0}
.card .optlabel{color:#8fa3c8;opacity:1;font-size:11.5px}
.card .chip{padding:4px 10px;font-size:11px;border:1px solid #3d5589;background:#22355f;color:#c3cde0}
.card .chip:hover{border-color:#fff}
.card .chip.on{background:#fff;color:var(--navy);border-color:#fff}
.card .scent{border-color:#3d5589;color:#fff}
.card .scent:hover{border-color:#fff;background:rgba(255,255,255,.08)}
.card .scent.on{background:#22355f;border-color:#fff;box-shadow:none}
.card .price{color:#fff;font-size:24px}
.card .was{color:#8fa3c8}
.card .save{color:#c3cde0;background:#22355f}
.card .stock{color:#8fa3c8;font-size:11px}
.card .stock::before{background:#7dd3a8}
.card .stock.out{color:#e5a3a3}
.card .stock.out::before{background:#e5a3a3}
.card .cfoot{border-top-color:#33487a;flex-direction:column;align-items:flex-start;gap:10px}
.card .cbtns{align-items:center}
.card .cbtns .b-buy{padding:12px 26px;font-size:14px;background:#fff;color:var(--navy);box-shadow:0 3px 10px rgba(0,0,0,.25)}
.card .cbtns .b-buy:hover:not(:disabled){background:#fff;box-shadow:0 8px 20px rgba(0,0,0,.35)}
.card .b-more{padding:9px 13px;font-size:12px;border:1px solid #33487a;color:#9fb0d0;background:transparent}
.card .b-more:hover{border-color:#9fb0d0;color:#fff;background:transparent}
/* Mobile: chip to lại cho ngón cái, nút mua giãn full. Khối này phải đứng
   SAU các override cùng tên ở trên (điểm 9). */
@media(max-width:620px){
  .card .chip{padding:7px 13px;font-size:12px}
  .card .cbtns{align-self:stretch}
  .card .cbtns .b-buy{flex:1;text-align:center}
}

/* v18: invite nằm trong #sp — nền khu giờ SÁNG nên đổi chữ trắng → navy */
.invite{display:flex;align-items:center;gap:16px;padding:2px;grid-column:1/-1}
.invite .msc{width:62px;height:62px;flex-shrink:0;overflow:visible;background:rgba(24,40,78,.06);border-radius:14px}
.invite .msc img{width:100%;height:100%;object-fit:contain}
.invite p{font-family:'Nunito';font-weight:800;font-size:clamp(16px,1.9vw,23px);color:var(--navy);line-height:1.35}
.invite .arrow{flex:1;height:1px;background:linear-gradient(90deg,rgba(24,40,78,.3),transparent);min-width:20px}
@media(max-width:720px){.invite .arrow{display:none}}

.tmo{background:var(--cream);padding-top:clamp(40px,4.5vw,58px);padding-bottom:clamp(44px,5vw,66px);overflow:hidden}
.tmo-head{max-width:1180px;margin:0 auto clamp(18px,2.2vw,26px);display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap}
.tmo-head h2{font-size:clamp(22px,2.6vw,32px);line-height:1.14;color:var(--navy)}
.tmo-head .kicker{margin-bottom:10px}
.tarrows{display:flex;gap:9px}
.tarrows button{width:44px;height:44px;border-radius:50%;border:1.5px solid rgba(24,40,78,.2);background:#fff;
  color:var(--navy);font-size:17px;cursor:pointer;transition:.2s;display:grid;place-items:center}
.tarrows button:hover{border-color:var(--navy);background:var(--navy);color:#fff}
.trail{max-width:1180px;margin:0 auto;display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;padding:6px 2px 16px;scrollbar-width:none}
.trail::-webkit-scrollbar{display:none}
.tcard{flex:0 0 clamp(180px,18vw,224px);scroll-snap-align:start;border-radius:20px;overflow:hidden;background:#fff;
  border:1px solid rgba(24,40,78,.1);box-shadow:0 3px 14px rgba(24,40,78,.07);transition:.26s cubic-bezier(.2,.7,.3,1);display:flex;flex-direction:column}
.tcard:hover{transform:translateY(-6px);box-shadow:0 18px 40px rgba(24,40,78,.17)}
.tvid{position:relative;aspect-ratio:3/4;overflow:hidden;background:linear-gradient(165deg,#22345d,#141f3d)}
/* Thẻ chỉ có chữ (chưa gắn video) — cao vừa phải, không giả làm video */
.tsay{background:var(--navy);color:#fff;padding:26px 20px 22px;display:flex;align-items:center;min-height:132px}
.tsay p{font-family:'Nunito';font-weight:800;font-size:15px;line-height:1.45;letter-spacing:-.01em}
.tsay::before{content:"\u201C";position:absolute;top:6px;left:16px;font-family:'Nunito';font-size:52px;
  font-weight:900;color:rgba(255,255,255,.16);line-height:1;pointer-events:none}
.tcard.tquote{position:relative}
.tvid iframe,.tvid video,.tvid img{width:100%;height:100%;border:0;object-fit:cover}
.tvid .play{width:48px;height:48px}
.tvid .play::after{border-left:14px solid var(--navy);border-top:9px solid transparent;border-bottom:9px solid transparent;margin-left:18px}
.tmeta{padding:13px 15px 15px;display:flex;flex-direction:column;gap:5px}
.tmeta .who{font-family:'Nunito';font-weight:900;font-size:14px;color:var(--navy)}
.tmeta .pet{font-size:12px;color:rgba(27,36,64,.55);font-weight:600}
.tmeta .quote{font-size:13px;color:rgba(27,36,64,.72);line-height:1.5;margin-top:3px}
.tstats{max-width:1180px;margin:clamp(20px,2.5vw,30px) auto 0;display:flex;gap:clamp(20px,4vw,54px);flex-wrap:wrap;
  padding-top:22px;border-top:1px solid rgba(24,40,78,.12);justify-content:center;text-align:center}
.tstat{transition:.2s}
.tstat b{display:block;font-family:'Nunito';font-weight:900;font-size:clamp(22px,2.6vw,30px);color:var(--navy)}
.tstat span{font-size:13px;color:rgba(27,36,64,.58);font-weight:600}

/* Bong bong thò lên khi bấm nút mua — bo cuc P3 (style L).
   Mascot + chu NAM CHUNG mot khoi navy, vien trang om ca hai.
   Vien lam bang box-shadow chu KHONG dung border: bo goc lech van muot.
   4 dang v1..v4 = 4 kieu bo goc + 4 goc nghieng, bam lien tiep khong trung. */
.peekwrap{position:relative}
.peek{position:absolute;left:50%;bottom:calc(100% + 8px);z-index:5;pointer-events:none;
  display:flex;align-items:center;gap:9px;
  background:var(--navy);padding:7px 16px 7px 9px;
  box-shadow:0 0 0 3px #fff,0 6px 18px rgba(0,0,0,.28);
  opacity:0;will-change:transform,opacity;
  animation:peekin 1.9s cubic-bezier(.3,1.5,.5,1) forwards}
/* Mascot nam trong O TRON TRANG. Bat buoc, khong phai trang tri:
   4/10 mascot la nau rat toi (#47271d, #251c12) — dat thang len navy
   thi tuong phan chi 1.09, gan nhu tang hinh. O trang keo len 13+.
   O trang cung noi lien mach voi vien trang bao ngoai -> mot khoi thong nhat. */
.peek img{display:block;width:34px;height:34px;flex:0 0 auto;border-radius:50%;
  background:#fff;object-fit:contain;padding:3px}
.peek span{font-family:'Nunito',system-ui,sans-serif;font-weight:900;font-size:14.5px;
  letter-spacing:.2px;color:#fff;text-transform:uppercase;white-space:nowrap}
/* Bo goc LECH: 3 goc tron, 1 goc gan vuong. Goc gan vuong doi cho moi dang. */
.peek.v1{border-radius:30px 30px 30px 11px;--rot:-3deg}
.peek.v2{border-radius:30px 30px 11px 30px;--rot:2deg}
.peek.v3{border-radius:28px 31px 29px 10px;--rot:-1.5deg}
.peek.v4{border-radius:31px 28px 10px 30px;--rot:2.5deg}
.peek.small{padding:6px 14px 6px 8px;gap:8px}
.peek.small img{width:28px;height:28px;padding:2.5px}
.peek.small span{font-size:13px}
/* Vao: nay len qua da roi roi ve. Ra: tut xuong o cuoi.
   var(--rot) giu goc nghieng rieng cua tung dang SUOT ca hieu ung. */
@keyframes peekin{
  0%{opacity:0;transform:translateX(-50%) translateY(120%) rotate(0) scale(.86)}
  14%{opacity:1;transform:translateX(-50%) translateY(-12%) rotate(var(--rot)) scale(1.06)}
  24%{transform:translateX(-50%) translateY(3%) rotate(var(--rot)) scale(.98)}
  32%,86%{opacity:1;transform:translateX(-50%) translateY(0) rotate(var(--rot)) scale(1)}
  100%{opacity:0;transform:translateX(-50%) translateY(26%) rotate(var(--rot)) scale(.94)}}

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
.buybar .btn:hover:not(:disabled){transform:translateY(-2px)}
@media(max-width:520px){.bb-img{display:none}.buybar .btn{padding:13px 18px}}

.combo{background:var(--navy);color:#fff;position:relative;overflow:hidden}
.combo::before{content:"";position:absolute;inset:0;background:radial-gradient(58% 76% at 50% 0%,rgba(255,255,255,.13),transparent 66%)}
.combo-in{position:relative;z-index:2;max-width:1180px;margin:0 auto}
.combo .shead{margin-bottom:clamp(22px,2.6vw,30px)}
.combo .kicker{color:rgba(255,255,255,.62);opacity:1}
.combo .shead h2{color:#fff}
.combo .shead p{color:rgba(255,255,255,.72)}
.tiers{display:grid;grid-template-columns:repeat(auto-fit,minmax(258px,1fr));gap:18px;align-items:stretch}
.tier{background:rgba(255,255,255,.07);border:1.5px solid rgba(255,255,255,.18);border-radius:22px;padding:22px 20px 20px;
  display:flex;flex-direction:column;gap:12px;transition:.26s cubic-bezier(.2,.7,.3,1);position:relative}
.tier:hover{background:rgba(255,255,255,.11);transform:translateY(-5px)}
.tier.best{background:#fff;color:var(--ink);border-color:#fff;transform:scale(1.045);z-index:2;box-shadow:0 26px 60px rgba(0,0,0,.34)}
.tier.best:hover{transform:scale(1.045) translateY(-5px)}
@media(max-width:820px){.tier.best{transform:none}.tier.best:hover{transform:translateY(-5px)}}
.tflag{position:absolute;top:-13px;left:50%;transform:translateX(-50%);background:var(--navy);color:#fff;font-size:10.5px;
  font-weight:800;letter-spacing:.12em;text-transform:uppercase;padding:6px 15px;border-radius:999px;border:2px solid #fff;white-space:nowrap}
.tier h3{font-size:19px;color:#fff}
.tier.best h3{color:var(--navy)}
.timg{aspect-ratio:16/10;border-radius:14px;overflow:hidden;background:rgba(255,255,255,.08);border:1px dashed rgba(255,255,255,.26)}
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
.about-img{aspect-ratio:16/10;border-radius:20px;overflow:hidden;background:rgba(255,255,255,.07);
  border:1px dashed rgba(255,255,255,.28);margin-bottom:22px}
.about-img img{width:100%;height:100%;object-fit:cover}
.about .btn{margin-top:12px}
.facts{display:grid;gap:18px}
.fact{border-left:3px solid rgba(255,255,255,.55);padding:4px 0 4px 18px}
.fact b{display:block;font-family:'Nunito';font-weight:900;font-size:clamp(22px,2.8vw,31px);margin-bottom:4px;color:#fff}
.fact span{font-size:14px;color:rgba(255,255,255,.64);line-height:1.5}
@media(max-width:820px){.about-in{grid-template-columns:1fr}}

/* Chân trang 3 cột: thương hiệu / điều khoản / dấu Bộ Công Thương. */
footer{background:var(--navy-deep);color:rgba(255,255,255,.55);padding:clamp(40px,5vw,60px) 5vw 96px;font-size:13.5px}
.foot-in{max-width:1180px;margin:0 auto;display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:clamp(24px,4vw,60px)}
.foot-in h4{font-family:'Nunito';font-weight:900;font-size:14.5px;color:#fff;margin-bottom:14px}
.f-brand{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.f-brand img{width:34px;height:34px;object-fit:contain}
.f-brand b{font-family:'Nunito';font-weight:900;font-size:19px;color:#fff}
.f-desc{line-height:1.7;max-width:38ch}
.f-lines{margin-top:12px;display:flex;flex-direction:column;gap:6px;line-height:1.6}
.f-links{list-style:none;display:flex;flex-direction:column;gap:9px}
.f-links a{color:rgba(255,255,255,.62);text-decoration:none;transition:.2s}
.f-links a:hover{color:#fff;padding-left:3px}
.f-bct{display:inline-block;margin-top:2px}
.f-bct img{width:150px;height:auto}
.f-bct-ph{width:150px;aspect-ratio:38/14;border:1px dashed rgba(255,255,255,.3);border-radius:8px;
  display:grid;place-items:center;font-size:10px;font-weight:800;color:rgba(255,255,255,.45);text-align:center;line-height:1.5}
.f-bottom{max-width:1180px;margin:26px auto 0;padding-top:18px;border-top:1px solid rgba(255,255,255,.12);
  text-align:center;font-size:12.5px;color:rgba(255,255,255,.42)}
@media(max-width:760px){.foot-in{grid-template-columns:1fr}}

@media(prefers-reduced-motion:reduce){
  *{animation:none!important;transition:none!important}
  .rv,.hero-main,.hero-refill,.tvc,.glow{opacity:1!important;transform:none!important;animation:none!important}
  .peek{display:none}
}
    `}</style>
  );
}
