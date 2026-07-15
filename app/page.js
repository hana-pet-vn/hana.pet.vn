'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useRef, useCallback } from "react";
import {
  supabase,
  adminSignIn, adminSignOut, getAdminSession,
  getProducts, upsertProduct, deleteProduct, updateProductStock,
  getOrders, createOrder, updateOrderDB,
  getAllConfigs, setConfig as setSupabaseConfig,
  getCategories,
} from "../lib/supabase";


// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const FONT_T = "'Nunito','Nunito Sans','Segoe UI',sans-serif";
const FONT_B = "'Nunito Sans','Nunito','Segoe UI',sans-serif";
// Admin auth is handled by Supabase (email + password)
const INV_PFX  = "HP";

// ─── ALL EDITABLE DEFAULTS ────────────────────────────────────────────────────
const DEFAULTS = {
  brand: {
    name: "Hanapet", tagline: "For the loved one.",
    primary: "#18284e", secondary: "#ffffff",
    logoText: "HP", logoImg: "",
    navLinks: [{ id:"n1", label:"🛍 Cửa hàng", page:"shop" }, { id:"n2", label:"🐾 Về chúng tôi", page:"about" }],
  },
  trustBar: [
    { id:"t1", icon:"🚀", title:"Giao hàng toàn quốc",      sub:"GHN & GHTK" },
    { id:"t2", icon:"🇻🇳", title:"Sản xuất tại Việt Nam",  sub:"Tự hào hàng Việt" },
    { id:"t3", icon:"🔄", title:"Đổi trả trong 7 ngày",      sub:"Không cần lý do" },
    { id:"t4", icon:"⭐", title:"Khách hàng yêu thích",     sub:"Đánh giá trung bình 4.8/5" },
  ],
  popup: {
    enabled: true,
    delayMs: 3500,
    img: "",
    imgMobile: "",
    title: "Giảm ngay 15%!",
    body: "Đăng ký để nhận mã giảm giá đầu tiên",
    btnLabel: "Nhận mã ngay 🎁",
    successTitle: "Hanapet!",
    successBody: "Dùng mã WELCOME15 khi thanh toán!",
    voucherCode: "WELCOME15",
  },
  about: {
    heading: "Vì thú cưng của bạn 🐾",
    body: "Hanapet — cửa hàng đồ dùng và phụ kiện thú cưng tại Việt Nam. Chúng tôi chọn lọc từng sản phẩm để các bé cưng của bạn luôn khoẻ mạnh và hạnh phúc.",
    socialHeading: "Kết nối với chúng tôi 📱",
  },
  footer: {
    city: "Hà Nội, Việt Nam",
    tagline2: "Đồ dùng thú cưng · Giao hàng toàn quốc ❤️",
    bg: "#0d142e",
    brandColor: "#ffffff",
    subtitleColor: "rgba(255,255,255,0.45)",
    logoImg: "",
    links: [],
  },
  flashBar: {
    title: "⚡ Flash Sale!",
    sub: "Nhanh tay trước khi hết giờ",
  },
  vouchers: [
    { id:"v1", code:"HANAPET10",   pct:10 },
    { id:"v2", code:"WELCOME15", pct:15 },
    { id:"v3", code:"PET20",  pct:20 },
  ],
  categories: ["Đồ ăn","Phụ kiện"],
  banners: [
    { id:"b1", title:"Hanapet", sub:"Vì thú cưng của bạn 🐾", cta:"Mua ngay", img:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=400&fit=crop", bg:"#1b295b" },
    { id:"b2", title:"Phụ kiện mới về", sub:"Đồ chơi, vòng cổ, bát ăn cho boss", cta:"Mua ngay", img:"https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=1200&h=400&fit=crop", bg:"#2e4390" },
    { id:"b3", title:"Flash Sale!",   sub:"Giảm đến 30% — Số lượng có hạn", cta:"Săn ngay ⚡", img:"https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&h=400&fit=crop", bg:"#FF3D00" },
  ],
  products: [
    { id:"misty-fresh", name:"Misty Fresh", price:245000, original:275000, category:"Khử mùi", rating:5.0, stock:50, flashSale:false, flashEnd:0,
      tags:"Chó, Mèo, Khử mùi", variantLabel:"Chọn loại",
      story:"Xịt khử mùi khử khuẩn cho thú cưng.\nHết mùi sau 30 giây · Diệt 99,99% vi khuẩn · An toàn khi liếm.",
      img:"/products/misty-spray.png",
      variants:[
        { id:"v1", name:"Chai xịt", price:245000, original:275000, stock:50, img:"" },
        { id:"v2", name:"Refill — Lõi thay thế", price:180000, original:200000, stock:50, img:"" },
      ], reviews:[] },
    { id:"wbs-mini", name:"Waterless Bubble Shampoo", price:165000, original:185000, category:"Tắm gội", rating:5.0, stock:50, flashSale:false, flashEnd:0,
      tags:"Chó, Mèo, Tắm khô", variantLabel:"Chọn mùi hương",
      story:"Tắm khô dạng bọt, không cần nước — sạch thơm mà không stress.\nĐầu cọ massage silicon · Dịu nhẹ cho da nhạy cảm.",
      img:"/products/wbs-baby-powder.png",
      variants:[
        { id:"v1", name:"Baby Powder",  price:165000, original:185000, stock:50, img:"" },
        { id:"v2", name:"Lavender",     price:165000, original:185000, stock:50, img:"" },
        { id:"v3", name:"Peach Yogurt", price:165000, original:185000, stock:50, img:"" },
        { id:"v4", name:"Quince",       price:165000, original:185000, stock:50, img:"" },
        { id:"v5", name:"Cotton Candy", price:165000, original:185000, stock:50, img:"" },
      ], reviews:[] },
  ],
  socials: [
    { id:"s1", name:"Facebook",  icon:"f",  color:"#1877f2", url:"https://facebook.com" },
    { id:"s2", name:"Zalo",      icon:"Z",  color:"#0068ff", url:"https://zalo.me" },
    { id:"s3", name:"Instagram", icon:"ig", color:"#e1306c", url:"https://instagram.com" },
    { id:"s4", name:"TikTok",    icon:"tt", color:"#010101", url:"https://tiktok.com" },
    { id:"s5", name:"YouTube",   icon:"yt", color:"#ff0000", url:"https://youtube.com" },
  ],
};

// ─── STORAGE — backed by Supabase ────────────────────────────────────────────
// usePersist still works for local-only UI state (categories, etc.)
// Main data (products, orders, configs) load from Supabase in App
function usePersist(key, def) {
  const [v, setV]   = useState(def);
  const [ok, setOk] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage?.get(key);
        if (r?.value) setV(JSON.parse(r.value));
      } catch(_) {}
      setOk(true);
    })();
  }, [key]);
  const save = useCallback(async (next) => {
    const val = typeof next === "function" ? next(v) : next;
    setV(val);
    try { await window.storage?.set(key, JSON.stringify(val)); } catch(_) {}
  }, [key, v]);
  return [v, save, ok];
}

// ─── UTILS ────────────────────────────────────────────────────────────────────
const fmt = n => n.toLocaleString("en-GB") + "đ";
const pct = (p,o) => Math.round((1-p/o)*100);
const uid = () => Math.random().toString(36).slice(2,8);

function useCountdown(end) {
  const [t,setT] = useState(Math.max(0,end-Date.now()));
  useEffect(()=>{ const iv=setInterval(()=>setT(Math.max(0,end-Date.now())),1000); return()=>clearInterval(iv); },[end]);
  return { h:String(Math.floor(t/3600000)).padStart(2,"0"), m:String(Math.floor((t%3600000)/60000)).padStart(2,"0"), s:String(Math.floor((t%60000)/1000)).padStart(2,"0") };
}

// ─── ATOMS ────────────────────────────────────────────────────────────────────
// Renders one <img> normally. If srcMobile is provided, renders TWO stacked
// <img> tags and lets CSS (.hh-img-desktop / .hh-img-mobile, see global style)
// pick the right one per viewport — no JS/hydration flicker.
function ResponsiveImg({ src, srcMobile, alt="", style, className="" }) {
  if (!src && !srcMobile) return null;
  if (!srcMobile) return <img src={src} alt={alt} style={style} className={className} />;
  return (
    <>
      <img src={src||srcMobile} alt={alt} style={style} className={`hh-img-desktop ${className}`} />
      <img src={srcMobile} alt={alt} style={style} className={`hh-img-mobile ${className}`} />
    </>
  );
}
function Tag({ text, color }) {
  return <span style={{ display:"inline-block", background:color+"18", color, border:`1px solid ${color}44`, borderRadius:20, padding:"2px 10px", fontSize:11, fontFamily:FONT_T, fontWeight:700 }}>{text}</span>;
}
function Stars({ rating, size=13 }) {
  return <span style={{ fontSize:size }}>{"⭐".repeat(Math.floor(rating))}<span style={{ fontFamily:FONT_B, fontSize:size-2, color:"#999", marginLeft:4 }}>{rating.toFixed(1)}</span></span>;
}
function FlashTimer({ end }) {
  const {h,m,s} = useCountdown(end);
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:3, background:"#0d142e", borderRadius:8, padding:"3px 8px" }}>
      <span style={{ fontSize:11 }}>⚡</span>
      {[h,m,s].map((v,i)=>(
        <span key={i} style={{ display:"flex", alignItems:"center", gap:2 }}>
          <span style={{ fontFamily:FONT_T, fontSize:12, color:"#ffffff", background:"#131c3d", borderRadius:4, padding:"1px 5px" }}>{v}</span>
          {i<2&&<span style={{ color:"#ffffff",fontSize:12 }}>:</span>}
        </span>
      ))}
    </span>
  );
}
function HHLogo({ primary="#1b295b", size=40 }) {
  return (
    <svg width={size*0.6} height={size} viewBox="0 0 60 100">
      <rect x="3" y="3" width="54" height="94" rx="13" fill={primary} stroke="white" strokeWidth="4"/>
      <rect x="11" y="11" width="10" height="28" rx="4" fill="white"/>
      <rect x="39" y="11" width="10" height="28" rx="4" fill="white"/>
      <rect x="19" y="22" width="22" height="8"  rx="3" fill="white"/>
      <rect x="11" y="52" width="10" height="28" rx="4" fill="white"/>
      <rect x="39" y="52" width="10" height="28" rx="4" fill="white"/>
      <rect x="19" y="63" width="22" height="8"  rx="3" fill="white"/>
    </svg>
  );
}

// ─── CURSOR ───────────────────────────────────────────────────────────────────
function CustomCursor({ primary }) {
  const dot  = useRef(); const ring = useRef();
  const pos  = useRef({x:0,y:0}); const rp = useRef({x:0,y:0}); const raf = useRef();
  const [hasMouse, setHasMouse] = useState(false);
  useEffect(()=>{
    // Only show the custom cursor on devices with a real mouse (not touch/mobile)
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(pointer: fine)");
    const apply = () => setHasMouse(mq.matches);
    apply();
    mq.addEventListener ? mq.addEventListener("change", apply) : mq.addListener(apply);
    return () => { mq.removeEventListener ? mq.removeEventListener("change", apply) : mq.removeListener(apply); };
  },[]);
  useEffect(()=>{
    if (!hasMouse) return;
    const mv = e => { pos.current={x:e.clientX,y:e.clientY}; };
    const lp = () => {
      rp.current.x += (pos.current.x-rp.current.x)*0.12;
      rp.current.y += (pos.current.y-rp.current.y)*0.12;
      if(dot.current)  dot.current.style.transform  = `translate(${pos.current.x-6}px,${pos.current.y-6}px)`;
      if(ring.current) ring.current.style.transform = `translate(${rp.current.x-18}px,${rp.current.y-18}px)`;
      raf.current = requestAnimationFrame(lp);
    };
    window.addEventListener("mousemove",mv);
    raf.current = requestAnimationFrame(lp);
    return()=>{ window.removeEventListener("mousemove",mv); cancelAnimationFrame(raf.current); };
  },[hasMouse]);
  // On touch / mobile devices: render nothing, keep the native cursor untouched
  if (!hasMouse) return null;
  return (
    <>
      <style>{`@media (pointer: fine){*{cursor:none!important}}`}</style>
      <div ref={dot}  style={{ position:"fixed",top:0,left:0,width:12,height:12,borderRadius:6,background:primary,zIndex:99999,pointerEvents:"none",boxShadow:`0 0 8px ${primary}88` }} />
      <div ref={ring} style={{ position:"fixed",top:0,left:0,width:36,height:36,borderRadius:18,border:`2px solid ${primary}88`,zIndex:99998,pointerEvents:"none" }} />
    </>
  );
}

// ─── IMAGE UPLOADER — Supabase Storage ───────────────────────────────────────
// Uploads file to Supabase Storage via /api/upload, returns a public URL.
// folder:   "products" | "banners" | "about"
// entityId: product ID or banner ID (used for organized folder paths)
function ImgUp({ current, onUpload, label="Ảnh", aspect="100%", folder="products", entityId="general" }) {
  const [drag,   setDrag]    = useState(false);
  const [loading,setLoading] = useState(false);
  const [error,  setError]   = useState("");
  const inp = useRef();

  const upload = async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setLoading(true); setError("");
    try {
      // Guard against Vercel's ~4.5MB request body limit — fail fast with a
      // clear message instead of letting the platform reject it with a raw
      // non-JSON "Request Entity Too Large" response.
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > 4) throw new Error(`Ảnh quá lớn (${sizeMB.toFixed(1)}MB). Vui lòng nén ảnh xuống dưới 4MB rồi thử lại.`);

      // Get current session token to authenticate the upload
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Chưa đăng nhập");

      const fd = new FormData();
      fd.append("file",     file);
      fd.append("folder",   folder);
      fd.append("entityId", entityId);
      fd.append("oldUrl",   current || "");   // will be archived server-side

      const res  = await fetch("/api/upload", {
        method:  "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body:    fd,
      });
      let data;
      try {
        data = await res.json();
      } catch {
        // Server/platform returned a non-JSON response (e.g. Vercel's own
        // "Request Entity Too Large" plain-text page) — show something useful.
        throw new Error(res.status === 413
          ? "Ảnh quá lớn để tải lên. Vui lòng nén ảnh xuống dưới 4MB rồi thử lại."
          : `Lỗi máy chủ (${res.status}). Vui lòng thử lại.`);
      }
      if (!data.success) throw new Error(data.error || "Tải ảnh thất bại");
      onUpload(data.url);
    } catch(e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {label && <div style={{ fontSize:12,fontFamily:FONT_T,color:"#888",marginBottom:6 }}>{label}</div>}
      <div
        onDragOver={e=>{e.preventDefault();setDrag(true);}}
        onDragLeave={()=>setDrag(false)}
        onDrop={e=>{e.preventDefault();setDrag(false);upload(e.dataTransfer.files[0]);}}
        onClick={()=>!loading&&inp.current.click()}
        style={{ position:"relative",paddingTop:aspect,borderRadius:10,overflow:"hidden",cursor:loading?"wait":"pointer",border:`2px dashed ${drag?"#1b295b":"#e0c8a0"}`,background:drag?"#f2f5fb":"#fafafa" }}
      >
        {loading && (
          <div style={{ position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6,background:"rgba(255,245,232,0.9)",zIndex:2 }}>
            <div style={{ fontSize:24 }}>⏳</div>
            <div style={{ fontFamily:FONT_T,fontSize:11,color:"#1b295b" }}>Đang tải lên...</div>
          </div>
        )}
        {current
          ? <img src={current} alt="" style={{ position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover" }} />
          : <div style={{ position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6 }}>
              <div style={{ fontSize:28 }}>📸</div>
              <div style={{ fontFamily:FONT_T,fontSize:11,color:"#aaa",textAlign:"center",padding:"0 8px" }}>Kéo thả hoặc bấm để tải ảnh lên</div>
              <div style={{ fontFamily:FONT_B,fontSize:10,color:"#ccc" }}>JPG, PNG, WEBP — tối đa 4MB</div>
            </div>
        }
        <input ref={inp} type="file" accept="image/*" style={{ display:"none" }} onChange={e=>upload(e.target.files[0])} />
      </div>
      {error && <div style={{ marginTop:4,fontFamily:FONT_B,fontSize:11,color:"#d64545",padding:"4px 8px",background:"#fdeeee",borderRadius:6 }}>❌ {error}</div>}
      {current && !loading && (
        <button onClick={e=>{e.stopPropagation();onUpload("");}} style={{ marginTop:5,background:"#fdeeee",color:"#d64545",border:"1px solid #f0c4c4",borderRadius:7,padding:"3px 10px",fontSize:11,fontFamily:FONT_T,cursor:"pointer",width:"100%" }}>✕ Xoá ảnh</button>
      )}
    </div>
  );
}

// ─── FIELD COMPONENTS ─────────────────────────────────────────────────────────
function Field({ label, value, onChange, type="text", rows, span }) {
  const style = { width:"100%",padding:"9px 12px",borderRadius:10,border:"2px solid #dbe2f1",fontFamily:FONT_B,fontSize:13,boxSizing:"border-box",background:"#fff" };
  return (
    <div style={{ gridColumn:span==="full"?"1/-1":"auto" }}>
      {label&&<div style={{ fontFamily:FONT_T,fontSize:11,color:"#5f6c8f",marginBottom:5 }}>{label}</div>}
      {rows
        ? <textarea value={value} onChange={e=>onChange(e.target.value)} rows={rows} style={{ ...style,resize:"vertical" }} />
        : type==="color"
          ? <div style={{ display:"flex",alignItems:"center",gap:8 }}><input type="color" value={value} onChange={e=>onChange(e.target.value)} style={{ width:44,height:38,border:"2px solid #dbe2f1",borderRadius:8,cursor:"pointer",padding:2 }} /><input type="text" value={value} onChange={e=>onChange(e.target.value)} style={{ ...style,flex:1 }} /></div>
          : <input type={type} value={value} onChange={e=>onChange(type==="number"?Number(e.target.value):e.target.value)} style={style} />
      }
    </div>
  );
}

function SectionHeader({ title, children }) {
  return (
    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18,paddingBottom:12,borderBottom:"2px solid #dbe2f1" }}>
      <div style={{ fontFamily:FONT_T,fontSize:15,color:"#0d142e",fontWeight:700 }}>{title}</div>
      {children}
    </div>
  );
}

function SaveBtn({ onSave, saved }) {
  return <button onClick={onSave} style={{ background:"#1b295b",color:"#fff",border:"none",borderRadius:10,padding:"10px 24px",fontFamily:FONT_T,fontSize:13,cursor:"pointer",marginTop:20 }}>{saved?"✅ Saved!":"💾 Save"}</button>;
}

// ─── BANNER CAROUSEL ──────────────────────────────────────────────────────────
function BannerCarousel({ banners, brand }) {
  const [i,setI]=useState(0);
  useEffect(()=>{ const t=setInterval(()=>setI(x=>(x+1)%banners.length),5000); return()=>clearInterval(t); },[banners.length]);
  if(!banners.length) return null;
  return (
    <div style={{ position:"relative",borderRadius:20,overflow:"hidden",marginBottom:28,boxShadow:`0 8px 40px rgba(27,41,91,0.25)`,aspectRatio:"16/9",width:"100%" }}>
      <style>{`
        .hh-banner-title{font-size:clamp(24px,5.5vw,40px) !important}
        .hh-banner-sub{font-size:clamp(12px,2.6vw,15px) !important}
        .hh-banner-pad{padding:clamp(18px,4vw,32px) clamp(18px,5vw,40px) !important}
        @media (max-width:480px){.hh-banner-cta{padding:9px 18px !important;font-size:12px !important}}
      `}</style>
      {banners.map((b,x)=>(
        <div key={x} style={{ position:"absolute",inset:0,opacity:x===i?1:0,transition:"opacity 0.6s ease-in-out",background:b.bg||brand.primary }}>
          {b.video
            ? <video src={b.video} autoPlay muted loop playsInline style={{ position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover" }} />
            : (b.img||b.imgMobile)&&<ResponsiveImg src={b.img} srcMobile={b.imgMobile} alt="" style={{ position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover" }} />}
          <div style={{ position:"absolute",inset:0,background:"linear-gradient(90deg,rgba(10,16,38,0.75) 0%,rgba(10,16,38,0.1) 65%,transparent 100%)" }} />
          <div className="hh-banner-pad" style={{ position:"absolute",bottom:0,left:0,right:0,boxSizing:"border-box" }}>
            <div className="hh-banner-title" style={{ fontFamily:FONT_T,fontWeight:700,color:"#fff",lineHeight:1.15,textShadow:"0 2px 12px rgba(0,0,0,0.5)",marginBottom:6,maxWidth:"90%" }}>{b.title}</div>
            <div className="hh-banner-sub" style={{ fontFamily:FONT_B,color:"rgba(255,255,255,0.85)",marginBottom:16,maxWidth:"85%" }}>{b.sub}</div>
            <button className="hh-banner-cta" onClick={()=>{
              const t=(b.ctaLink||"").trim();
              if(!t) { document.getElementById("sku-misty")?.scrollIntoView({behavior:"smooth"}); return; }
              if(t.startsWith("#")) { document.getElementById(t.slice(1))?.scrollIntoView({behavior:"smooth"}); return; }
              window.open(t, t.startsWith("http")?"_blank":"_self");
            }} style={{ background:brand.primary,color:"#fff",border:"none",borderRadius:12,padding:"11px 26px",fontFamily:FONT_T,fontSize:14,fontWeight:700,cursor:"pointer" }}>{b.cta||"Xem ngay"} →</button>
          </div>
        </div>
      ))}
      <div style={{ position:"absolute",bottom:14,right:18,display:"flex",gap:6,zIndex:2 }}>
        {banners.map((_,x)=><button key={x} onClick={()=>setI(x)} style={{ width:x===i?22:8,height:8,borderRadius:4,background:x===i?"#fff":"rgba(255,255,255,0.4)",border:"none",cursor:"pointer",transition:"all 0.3s",padding:0 }} />)}
      </div>
    </div>
  );
}

// ─── PRODUCT CARD ─────────────────────────────────────────────────────────────
function ProductCard({ product:p, brand, onClick, onAdd }) {
  const [hov,setHov]=useState(false);
  const d=pct(p.price,p.original);
  // Preview uses ONLY the first two images: show #1, fade to #2 on hover, revert on leave.
  const previewImgs=[p.img,...(p.images||[])].filter(Boolean).slice(0,2);
  const imgIdx = hov && previewImgs.length>1 ? 1 : 0;
  const onEnter=()=>setHov(true);
  const onLeave=()=>setHov(false);
  return (
    <div onClick={()=>onClick(p)} onMouseEnter={onEnter} onMouseLeave={onLeave}
      style={{ background:"#fff",borderRadius:20,overflow:"hidden",cursor:"pointer",border:`2px solid ${hov?brand.primary:"#dbe2f1"}`,boxShadow:hov?`0 16px 40px rgba(27,41,91,0.3)`:`0 4px 16px rgba(27,41,91,0.1)`,transform:hov?"translateY(-8px) scale(1.015)":"none",transition:"all 0.35s cubic-bezier(0.34,1.56,0.64,1)" }}>
      <div style={{ position:"relative",paddingTop:"100%",background:"#f2f5fb",overflow:"hidden" }}>
        {previewImgs.length>0
          ? previewImgs.map((src,i)=>{
              const imgStyle={ position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:i===imgIdx?1:0,transform:hov?"scale(1.08)":"scale(1)",transition:"opacity 0.45s ease-in-out, transform 0.5s cubic-bezier(0.25,0.46,0.45,0.94)" };
              return i===0 && p.imgMobile
                ? <ResponsiveImg key={i} src={src} srcMobile={p.imgMobile} alt="" style={imgStyle} />
                : <img key={i} src={src} alt="" style={imgStyle} />;
            })
          : <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:52 }}>📦</div>
        }
        {previewImgs.length>1&&<div style={{ position:"absolute",bottom:8,left:0,right:0,display:"flex",justifyContent:"center",gap:5,zIndex:2 }}>
          {previewImgs.map((_,i)=><div key={i} style={{ width:i===imgIdx?14:6,height:6,borderRadius:3,background:i===imgIdx?"#fff":"rgba(255,255,255,0.5)",transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)",boxShadow:"0 1px 4px rgba(0,0,0,0.2)" }}/>)}
        </div>}
        <div style={{ position:"absolute",inset:0,background:"linear-gradient(to top,rgba(27,41,91,0.12),transparent 50%)" }} />
        <div style={{ position:"absolute",top:10,left:10,display:"flex",flexDirection:"column",gap:4 }}>
          {p.flashSale&&<span style={{ background:"#0d142e",color:"#ffffff",fontSize:10,fontWeight:800,fontFamily:FONT_T,padding:"3px 10px",borderRadius:20 }}>⚡ FLASH</span>}
          {d>0&&<span style={{ background:brand.primary,color:"#fff",fontSize:10,fontWeight:800,fontFamily:FONT_T,padding:"3px 10px",borderRadius:20 }}>-{d}%</span>}
        </div>
        {p.stock<=7&&<div style={{ position:"absolute",top:10,right:10 }}><span style={{ background:"rgba(255,255,255,0.9)",color:brand.primary,fontSize:10,fontWeight:800,fontFamily:FONT_T,padding:"3px 10px",borderRadius:20 }}>Only {p.stock}</span></div>}
      </div>
      <div style={{ padding:"14px 16px 16px" }}>
        <Tag text={p.category} color={brand.primary} />
        <h3 style={{ margin:"8px 0 4px",fontFamily:FONT_T,fontSize:15,color:"#0d142e",lineHeight:1.3 }}>{p.name}</h3>
        <Stars rating={p.rating} />
        {p.flashSale&&<div style={{ marginTop:5 }}><FlashTimer end={p.flashEnd} /></div>}
        <div style={{ marginTop:10,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div>
            {(p.variants?.length>0)&&<span style={{ fontFamily:FONT_B,fontSize:10,color:"#5f6c8f",display:"block" }}>từ</span>}
            <span style={{ fontFamily:FONT_T,fontSize:19,fontWeight:700,color:brand.primary }}>{fmt(p.variants?.length>0 ? Math.min(...p.variants.map(v=>Number(v.price)||p.price)) : p.price)}</span>
            {d>0&&!(p.variants?.length>0)&&<span style={{ fontFamily:FONT_B,fontSize:12,color:"#5f6c8f",textDecoration:"line-through",marginLeft:6 }}>{fmt(p.original)}</span>}
          </div>
          <button onClick={e=>{e.stopPropagation(); if(p.variants?.length>0){onClick(p);} else {onAdd(p);}}} style={{ background:brand.primary,color:"#fff",border:"none",borderRadius:10,padding:"8px 14px",fontFamily:FONT_T,fontSize:13,cursor:"pointer" }}>{p.variants?.length>0?"Chọn":"+ Giỏ hàng"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── PRODUCT MODAL ────────────────────────────────────────────────────────────
function ReviewsSection({ productId, brand }) {
  const [reviews,setReviews]   = useState([]);
  const [loading,setLoading]   = useState(true);
  const [showForm,setShowForm] = useState(false);
  const [phone,setPhone]       = useState("");
  const [rating,setRating]     = useState(5);
  const [text,setText]         = useState("");
  const [submitting,setSubmitting] = useState(false);
  const [msg,setMsg]           = useState(null);

  useEffect(()=>{
    fetch(`/api/reviews?productId=${productId}`)
      .then(r=>r.json())
      .then(d=>setReviews(d.reviews||[]))
      .catch(()=>{})
      .finally(()=>setLoading(false));
  },[productId]);

  const submit = async () => {
    if (!phone.trim() || !text.trim()) { setMsg({type:"error",text:"Vui lòng điền đầy đủ thông tin"}); return; }
    setSubmitting(true); setMsg(null);
    try {
      const res = await fetch("/api/reviews", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ productId, phone, rating, text }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg({type:"error",text:data.error||"Không thể gửi đánh giá"}); return; }
      setMsg({type:"success",text:"Cảm ơn bạn! Đánh giá đã được đăng."});
      setReviews(r=>[{customer_name:"Bạn",rating,text,created_at:new Date().toISOString()},...r]);
      setText(""); setPhone(""); setRating(5);
      setTimeout(()=>setShowForm(false),1500);
    } catch(e) {
      setMsg({type:"error",text:"Lỗi mạng, vui lòng thử lại"});
    } finally { setSubmitting(false); }
  };

  if (loading) return <div style={{ fontFamily:FONT_B,fontSize:13,color:"#5f6c8f",padding:"16px 0" }}>Đang tải đánh giá...</div>;

  return (
    <div>
      {reviews.length===0 && !showForm && (
        <div style={{ fontFamily:FONT_B,fontSize:13,color:"#5f6c8f",padding:"16px 0",textAlign:"center" }}>Chưa có đánh giá nào. Hãy là người mua hàng đầu tiên để lại đánh giá!</div>
      )}
      {reviews.map((r,i)=>(
        <div key={r.id||i} style={{ padding:"12px 0",borderBottom:"1px solid #dbe2f1" }}>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}>
            <span style={{ fontFamily:FONT_T,fontSize:13,color:brand.primary }}>{r.customer_name}</span>
            <span style={{ fontSize:11,color:"#5f6c8f" }}>{new Date(r.created_at).toLocaleDateString("vi-VN")}</span>
          </div>
          <Stars rating={r.rating} size={12} />
          <p style={{ fontFamily:FONT_B,fontSize:13,color:"#131c3d",margin:"6px 0 0" }}>{r.text}</p>
        </div>
      ))}

      {!showForm ? (
        <button onClick={()=>setShowForm(true)} style={{ marginTop:14,background:"#f2f5fb",border:`2px dashed ${brand.primary}66`,borderRadius:12,padding:"10px 18px",fontFamily:FONT_T,fontSize:12,color:brand.primary,cursor:"pointer",width:"100%" }}>
          ✍️ Viết đánh giá (chỉ dành cho người đã mua)
        </button>
      ) : (
        <div style={{ marginTop:14,padding:16,background:"#f2f5fb",borderRadius:14,border:"2px solid #dbe2f1" }}>
          <div style={{ fontFamily:FONT_T,fontSize:12,color:"#5f6c8f",marginBottom:10 }}>Để lại đánh giá — chúng tôi sẽ kiểm tra với đơn hàng đã giao của bạn</div>
          <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Số điện thoại dùng khi đặt hàng" style={{ width:"100%",padding:"9px 12px",borderRadius:10,border:"2px solid #dbe2f1",fontFamily:FONT_B,fontSize:13,boxSizing:"border-box",marginBottom:10 }} />
          <div style={{ display:"flex",gap:4,marginBottom:10 }}>
            {[1,2,3,4,5].map(n=>(
              <button key={n} onClick={()=>setRating(n)} style={{ background:"none",border:"none",fontSize:22,cursor:"pointer",opacity:n<=rating?1:0.3 }}>⭐</button>
            ))}
          </div>
          <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..." rows={3} maxLength={500} style={{ width:"100%",padding:"9px 12px",borderRadius:10,border:"2px solid #dbe2f1",fontFamily:FONT_B,fontSize:13,boxSizing:"border-box",resize:"vertical" }} />
          {msg && <div style={{ marginTop:8,padding:"8px 12px",borderRadius:8,fontFamily:FONT_B,fontSize:12,background:msg.type==="success"?"#f0fdf4":"#fdeeee",color:msg.type==="success"?"#166534":"#d64545",border:`1px solid ${msg.type==="success"?"#86efac":"#f0c4c4"}` }}>{msg.text}</div>}
          <div style={{ display:"flex",gap:8,marginTop:10 }}>
            <button onClick={submit} disabled={submitting} style={{ flex:1,background:brand.primary,color:"#fff",border:"none",borderRadius:10,padding:"9px 0",fontFamily:FONT_T,fontSize:13,cursor:submitting?"not-allowed":"pointer",opacity:submitting?0.7:1 }}>{submitting?"Đang gửi...":"Gửi đánh giá"}</button>
            <button onClick={()=>setShowForm(false)} style={{ background:"#fff",color:"#5f6c8f",border:"2px solid #dbe2f1",borderRadius:10,padding:"9px 14px",fontFamily:FONT_T,fontSize:12,cursor:"pointer" }}>Huỷ</button>
          </div>
        </div>
      )}
    </div>
  );
}

function VideoEmbed({ url }) {
  const u = String(url||"").trim();
  if (!u) return null;
  const fallback = label => (
    <div style={{ fontFamily:FONT_B,fontSize:13,color:"#5f6c8f",padding:"16px",background:"#f2f5fb",borderRadius:12,textAlign:"center" }}>
      Không nhúng được video. <a href={u} target="_blank" rel="noreferrer" style={{ color:"#18284e",fontWeight:700 }}>Xem trên {label} →</a>
    </div>
  );
  const frame = (src, h=575, max=340) => (
    <div style={{ position:"relative",width:"100%",maxWidth:max,margin:"0 auto",borderRadius:12,overflow:"hidden",background:"#000" }}>
      <iframe src={src} style={{ width:"100%",height:h,border:"none",display:"block" }} allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen title="video" />
    </div>
  );
  // YouTube
  let m = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (m) return frame(`https://www.youtube.com/embed/${m[1]}`, 220, 480);
  // TikTok
  m = u.match(/tiktok\.com\/.*video\/(\d+)/) || u.match(/tiktok\.com\/.*\/(\d{6,})/);
  if (m) return frame(`https://www.tiktok.com/embed/v2/${m[1]}`);
  // Instagram (reel or post)
  m = u.match(/instagram\.com\/(?:reel|reels|p|tv)\/([\w-]+)/);
  if (m) return frame(`https://www.instagram.com/${u.includes("/p/")?"p":"reel"}/${m[1]}/embed`, 560, 400);
  // Direct mp4
  if (/\.mp4($|\?)/i.test(u)) return (
    <video src={u} controls playsInline style={{ width:"100%",maxWidth:400,margin:"0 auto",display:"block",borderRadius:12,background:"#000" }} />
  );
  return fallback("nguồn gốc");
}
function ProductModal({ product:p, brand, onClose, onAdd }) {
  const [qty,setQty]=useState(1); const [tab,setTab]=useState("story");
  const [galIdx,setGalIdx]=useState(0);
  const [zoomed,setZoomed]=useState(false);
  const variants = Array.isArray(p.variants) ? p.variants : [];
  const hasVariants = variants.length > 0;
  const [selVar,setSelVar] = useState(null);   // chosen variant object
  // Effective price/original/stock/img reflect the chosen variant when present
  const effPrice    = selVar ? (Number(selVar.price)||p.price)       : p.price;
  const effOriginal = selVar ? (Number(selVar.original)||p.original) : p.original;
  const effStock    = selVar ? (Number(selVar.stock)||0)             : p.stock;
  const d=pct(effPrice,effOriginal);
  const extraImgs = (p.images||[]).filter(Boolean);
  const baseImgs = extraImgs.length>0 ? extraImgs : [p.img,...extraImgs].filter(Boolean);
  const allImgs = selVar && selVar.img ? [selVar.img, ...baseImgs.filter(x=>x!==selVar.img)] : baseImgs;
  // Only swap in the product's mobile image when slot 0 is still the base product image
  // (not overridden by a selected variant's own photo).
  const slot0Mobile = (!selVar || !selVar.img) ? p.imgMobile : null;
  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(10,16,38,0.7)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(6px)" }}>
      <style>{`@media (max-width:680px){.hh-modal-grid{grid-template-columns:1fr !important}.hh-modal-imgcol{border-radius:22px !important}.hh-modal-img{min-height:280px !important}}
        .hh-modal-img:hover .hh-modal-mainimg{transform:scale(1.08) !important}
        .hh-modal-thumbs::-webkit-scrollbar{height:5px}.hh-modal-thumbs::-webkit-scrollbar-thumb{background:#dbe2f1;border-radius:3px}`}</style>
      <div onClick={e=>e.stopPropagation()} style={{ background:"linear-gradient(160deg, #eef1fa 0%, #f8fafd 55%)",borderRadius:28,maxWidth:860,width:"100%",maxHeight:"92vh",overflow:"auto",boxShadow:"0 30px 90px rgba(24,40,78,0.35)" }}>
        <div className="hh-modal-grid" style={{ display:"grid",gridTemplateColumns:"1fr 1fr",padding:14,gap:6 }}>
          <div className="hh-modal-imgcol" style={{ display:"flex",flexDirection:"column",background:"#fff",borderRadius:22,overflow:"hidden",boxShadow:"0 10px 30px rgba(24,40,78,0.1)" }}>
            <div className="hh-modal-img" onClick={()=>galIdx>=0&&allImgs.length>0&&setZoomed(true)} style={{ position:"relative",flex:1,minHeight:340,background:"radial-gradient(circle at 50% 40%, #f2f5fb 0%, #e9edf8 100%)",overflow:"hidden",cursor:allImgs.length>0?"zoom-in":"default" }}>
              {galIdx===-1 && (p.videoUrl||p.tiktokUrl)
                ? <div onClick={e=>e.stopPropagation()} style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",padding:8,background:"#000" }}><VideoEmbed url={p.videoUrl||p.tiktokUrl} /></div>
                : allImgs.length>0
                  ? allImgs.map((src,i)=>{
                      const imgStyle={ width:"100%",height:"100%",objectFit:"contain",position:"absolute",inset:0,opacity:i===galIdx?1:0,transition:"opacity 0.4s ease-in-out, transform 0.35s ease" };
                      return i===0 && slot0Mobile
                        ? <ResponsiveImg key={i} src={src} srcMobile={slot0Mobile} alt="" className="hh-modal-mainimg" style={imgStyle} />
                        : <img key={i} src={src} alt="" className="hh-modal-mainimg" style={imgStyle} />;
                    })
                  : <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:80 }}>📦</div>
              }
              {p.flashSale&&galIdx>=0&&<div style={{ position:"absolute",top:16,left:16,zIndex:2 }}><FlashTimer end={p.flashEnd} /></div>}
              {galIdx>=0&&allImgs.length>1&&<>
                <button onClick={e=>{e.stopPropagation();setGalIdx(i=>(i<=0?allImgs.length-1:i-1));}} style={{ position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",width:34,height:34,borderRadius:17,background:"rgba(255,255,255,0.85)",border:"none",cursor:"pointer",fontSize:16,color:"#0d142e",zIndex:2 }}>‹</button>
                <button onClick={e=>{e.stopPropagation();setGalIdx(i=>(i+1)%allImgs.length);}} style={{ position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",width:34,height:34,borderRadius:17,background:"rgba(255,255,255,0.85)",border:"none",cursor:"pointer",fontSize:16,color:"#0d142e",zIndex:2 }}>›</button>
              </>}
            </div>
            {(allImgs.length>1||p.videoUrl||p.tiktokUrl)&&(
              <div className="hh-modal-thumbs" style={{ display:"flex",gap:8,padding:"12px 14px",overflowX:"auto",background:"#fff" }}>
                {(p.videoUrl||p.tiktokUrl)&&(
                  <button onClick={()=>setGalIdx(-1)} style={{ position:"relative",width:60,height:60,borderRadius:10,overflow:"hidden",border:`2px solid ${galIdx===-1?brand.primary:"#dbe2f1"}`,background:"#0d142e",cursor:"pointer",padding:0,flexShrink:0 }}>
                    <span style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:20 }}>▶</span>
                  </button>
                )}
                {allImgs.map((src,i)=>(
                  <button key={i} onClick={()=>setGalIdx(i)} style={{ width:60,height:60,borderRadius:10,overflow:"hidden",border:`2px solid ${i===galIdx?brand.primary:"#dbe2f1"}`,background:"#f2f5fb",cursor:"pointer",padding:0,flexShrink:0,transition:"border-color .2s" }}>
                    <img src={src} alt="" style={{ width:"100%",height:"100%",objectFit:"contain" }} />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={{ padding:32 }}>
            <button onClick={onClose} style={{ float:"right",background:"#f2f5fb",border:"none",borderRadius:50,width:32,height:32,cursor:"pointer",color:"#5f6c8f",fontSize:16 }}>✕</button>
            <Tag text={p.category} color={brand.primary} />
            <h2 style={{ fontFamily:FONT_T,fontSize:26,color:"#0d142e",margin:"10px 0 4px" }}>{p.name}</h2>
            <Stars rating={p.rating} size={15} />
            <span style={{ fontFamily:FONT_B,fontSize:12,color:"#5f6c8f",marginLeft:6 }}>· còn {effStock} sản phẩm</span>
            <div style={{ display:"flex",margin:"20px 0 16px",border:"2px solid #dbe2f1",borderRadius:12,overflow:"hidden" }}>
              {[["story","📖 Câu chuyện"],["specs","⚙️ Chi tiết"],["reviews","💬 Đánh giá"]].map(([k,l])=>(
                <button key={k} onClick={()=>setTab(k)} style={{ flex:1,padding:"8px 4px",background:tab===k?brand.primary:"transparent",color:tab===k?"#fff":"#5f6c8f",border:"none",fontFamily:FONT_T,fontSize:12,cursor:"pointer",transition:"all 0.2s" }}>{l}</button>
              ))}
            </div>
            {tab==="story"&&<p style={{ fontFamily:FONT_B,fontSize:14,color:"#131c3d",lineHeight:1.8,whiteSpace:"pre-line",background:"#f2f5fb",borderLeft:`4px solid ${brand.primary}`,padding:"12px 16px",borderRadius:"0 10px 10px 0",margin:0 }}>{p.story||"Chưa có câu chuyện."}</p>}
            {tab==="specs"&&<div>{[["Tags",(p.tags||"—").split(",")[0]],["Kho hàng",`${p.stock} sản phẩm`],["Danh mục",p.category]].map(([k,v])=>(
              <div key={k} style={{ display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #dbe2f1",fontFamily:FONT_B,fontSize:13 }}><span style={{ color:"#5f6c8f" }}>{k}</span><span style={{ color:brand.primary,fontWeight:700 }}>{v}</span></div>
            ))}</div>}
            {tab==="reviews"&&<ReviewsSection productId={p.id} brand={brand} />}
            {hasVariants&&(
              <div style={{ marginTop:20 }}>
                <div style={{ fontFamily:FONT_T,fontSize:13,color:"#0d142e",marginBottom:8 }}>{p.variantLabel||"Phân loại"}</div>
                <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>
                  {variants.map(v=>{
                    const active=selVar?.id===v.id;
                    const out=(Number(v.stock)||0)<=0;
                    return (
                      <button key={v.id} disabled={out}
                        onClick={()=>{ setSelVar(v); setQty(1); setGalIdx(0); }}
                        style={{ padding:"8px 16px",borderRadius:12,border:`2px solid ${active?brand.primary:"#dbe2f1"}`,background:active?brand.primary:"#fff",color:out?"#ccc":active?"#fff":"#5f6c8f",fontFamily:FONT_T,fontSize:13,cursor:out?"not-allowed":"pointer",textDecoration:out?"line-through":"none" }}>
                        {v.name}{out?" (hết)":""}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div style={{ marginTop:24,padding:20,background:"#f2f5fb",borderRadius:16,border:"2px solid #dbe2f1" }}>
              <div style={{ display:"flex",alignItems:"baseline",gap:12,marginBottom:16 }}>
                <span style={{ fontFamily:FONT_T,fontSize:28,fontWeight:700,color:brand.primary }}>{fmt(effPrice*qty)}</span>
                {d>0&&<span style={{ fontFamily:FONT_B,fontSize:14,color:"#5f6c8f",textDecoration:"line-through" }}>{fmt(effOriginal*qty)}</span>}
              </div>
              <div style={{ display:"flex",gap:12 }}>
                <div style={{ display:"flex",alignItems:"center",border:"2px solid #dbe2f1",borderRadius:12,overflow:"hidden",background:"#fff" }}>
                  <button onClick={()=>setQty(q=>Math.max(1,q-1))} style={{ width:38,height:44,background:"none",border:"none",fontSize:20,cursor:"pointer",color:brand.primary,fontWeight:700 }}>−</button>
                  <span style={{ width:36,textAlign:"center",fontFamily:FONT_T,fontSize:16,fontWeight:700 }}>{qty}</span>
                  <button onClick={()=>setQty(q=>Math.min(effStock||1,q+1))} style={{ width:38,height:44,background:"none",border:"none",fontSize:20,cursor:"pointer",color:brand.primary,fontWeight:700 }}>+</button>
                </div>
                <button onClick={()=>{
                  if(hasVariants&&!selVar){ alert(`Vui lòng chọn ${(p.variantLabel||"phân loại").toLowerCase()}`); return; }
                  onAdd(p,qty,selVar); onClose();
                }} style={{ flex:1,background:brand.primary,color:"#fff",border:"none",borderRadius:12,fontFamily:FONT_T,fontWeight:700,fontSize:15,cursor:"pointer" }}>🛒 Thêm vào giỏ</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {zoomed&&galIdx>=0&&(
        <div onClick={e=>{e.stopPropagation();setZoomed(false);}} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:1200,display:"flex",alignItems:"center",justifyContent:"center",cursor:"zoom-out" }}>
          <img src={allImgs[galIdx]} alt="" style={{ maxWidth:"96vw",maxHeight:"92vh",objectFit:"contain",borderRadius:8 }} />
          <button onClick={e=>{e.stopPropagation();setZoomed(false);}} style={{ position:"fixed",top:18,right:18,width:40,height:40,borderRadius:20,background:"rgba(255,255,255,0.15)",border:"none",color:"#fff",fontSize:18,cursor:"pointer" }}>✕</button>
          {allImgs.length>1&&<>
            <button onClick={e=>{e.stopPropagation();setGalIdx(i=>(i-1+allImgs.length)%allImgs.length);}} style={{ position:"fixed",left:14,top:"50%",transform:"translateY(-50%)",width:44,height:44,borderRadius:22,background:"rgba(255,255,255,0.15)",border:"none",color:"#fff",fontSize:20,cursor:"pointer" }}>‹</button>
            <button onClick={e=>{e.stopPropagation();setGalIdx(i=>(i+1)%allImgs.length);}} style={{ position:"fixed",right:14,top:"50%",transform:"translateY(-50%)",width:44,height:44,borderRadius:22,background:"rgba(255,255,255,0.15)",border:"none",color:"#fff",fontSize:20,cursor:"pointer" }}>›</button>
          </>}
        </div>
      )}
    </div>
  );
}

// ─── INVOICE MODAL ────────────────────────────────────────────────────────────
function InvoiceModal({ order, brand, onClose }) {
  const print = () => {
    const w=window.open("","_blank","width=700,height=900");
    w.document.write(`<html><head><title>Hoá Đơn ${order.code}</title><style>body{font-family:'Segoe UI',sans-serif;padding:40px;color:#0d142e}table{width:100%;border-collapse:collapse;margin-top:20px}th{background:#f2f5fb;color:#5f6c8f;padding:10px 14px;text-align:left;font-size:12px}td{padding:10px 14px;border-bottom:1px solid #dbe2f1;font-size:14px}.tot td{font-weight:700;font-size:16px;color:#1b295b;border-top:3px solid #1b295b;border-bottom:none}</style></head><body>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;padding-bottom:16px;border-bottom:3px solid #1b295b">
      <div><h1 style="color:#1b295b;font-size:28px;margin:0">${brand.name}</h1><div style="color:#5f6c8f;font-size:13px">${brand.tagline}</div></div>
      <div style="text-align:right"><div style="font-size:22px;font-weight:900;color:#1b295b">${order.code}</div><div style="color:#5f6c8f;font-size:12px">${order.date}</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:20px">
      <div><b>KHÁCH HÀNG</b><br>${order.customer.name}<br>${order.customer.phone}<br>${order.customer.address}</div>
      <div><b>VẬN CHUYỂN</b><br>🚚 GHN / GHTK<br>Dự kiến giao 1–3 ngày${order.voucher?`<br>🎟 Mã: ${order.voucher}`:""}</div>
    </div>
    <table><thead><tr><th>#</th><th>SẢN PHẨM</th><th>SL</th><th>ĐƠN GIÁ</th><th>THÀNH TIỀN</th></tr></thead><tbody>
    ${order.items.map((it,i)=>`<tr><td>${i+1}</td><td>${it.product.name}</td><td>${it.qty}</td><td>${fmt(it.product.price)}</td><td>${fmt(it.product.price*it.qty)}</td></tr>`).join("")}
    ${order.discount>0?`<tr><td colspan="4" style="text-align:right;color:#27ae60">Giảm giá (${order.discPct}%)</td><td style="color:#27ae60">-${fmt(order.discount)}</td></tr>`:""}
    <tr class="tot"><td colspan="4" style="text-align:right">TỔNG CỘNG</td><td>${fmt(order.total)}</td></tr>
    </tbody></table>
    <div style="margin-top:32px;text-align:center;color:#5f6c8f;font-size:12px">Cảm ơn bạn đã mua sắm tại ${brand.name} 🐾 · ${brand.tagline}</div>
    </body></html>`);
    w.document.close(); w.print();
  };
  const sub=order.items.reduce((s,i)=>s+i.product.price*i.qty,0);
  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(10,16,38,0.75)",zIndex:2500,display:"flex",alignItems:"center",justifyContent:"center",padding:20,backdropFilter:"blur(8px)" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#fff",borderRadius:24,maxWidth:660,width:"100%",maxHeight:"90vh",overflow:"auto",boxShadow:"0 24px 80px rgba(27,41,91,0.3)" }}>
        <div style={{ background:"linear-gradient(135deg,#1b295b,#2e4390)",padding:"28px 32px",borderRadius:"24px 24px 0 0",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div style={{ display:"flex",alignItems:"center",gap:14 }}>
            {brand.logoImg ? <img src={brand.logoImg} alt="" style={{ height:44,width:44,objectFit:"contain",borderRadius:8,background:"rgba(255,255,255,0.15)",padding:4 }} /> : <HHLogo primary="#fff" size={44} />}
            <div>
              <div style={{ fontFamily:FONT_T,fontSize:20,color:"#fff",fontWeight:700 }}>{brand.name}</div>
              <div style={{ fontFamily:FONT_B,fontSize:12,color:"rgba(255,255,255,0.8)" }}>{brand.tagline}</div>
            </div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontFamily:FONT_B,fontSize:11,color:"rgba(255,255,255,0.7)",letterSpacing:2 }}>HOÁ ĐƠN</div>
            <div style={{ fontFamily:FONT_T,fontSize:24,color:"#fff",fontWeight:700 }}>{order.code}</div>
            <div style={{ fontFamily:FONT_B,fontSize:12,color:"rgba(255,255,255,0.8)" }}>{order.date}</div>
          </div>
        </div>
        <div style={{ padding:"28px 32px" }}>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:24 }}>
            {[["KHÁCH HÀNG",[order.customer.name,order.customer.phone,order.customer.address]],["VẬN CHUYỂN",["🚚 GHN / GHTK","Dự kiến giao 1–3 ngày",order.voucher?`🎟 ${order.voucher}`:""].filter(Boolean)]].map(([title,lines])=>(
              <div key={title} style={{ padding:16,background:"#f2f5fb",borderRadius:12,border:"2px solid #dbe2f1" }}>
                <div style={{ fontFamily:FONT_T,fontSize:11,color:"#5f6c8f",letterSpacing:2,marginBottom:10 }}>{title}</div>
                {lines.map((l,i)=><div key={i} style={{ fontFamily:i===0?FONT_T:FONT_B,fontSize:i===0?15:13,color:i===0?"#0d142e":"#4a5573",marginBottom:i===0?4:2 }}>{l}</div>)}
              </div>
            ))}
          </div>
          <div style={{ border:"2px solid #dbe2f1",borderRadius:14,overflow:"hidden",marginBottom:20 }}>
            <div style={{ display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",background:"#f2f5fb",padding:"10px 16px" }}>
              {["SẢN PHẨM","SL","ĐƠN GIÁ","THÀNH TIỀN"].map(h=><div key={h} style={{ fontFamily:FONT_T,fontSize:11,color:"#5f6c8f",letterSpacing:1 }}>{h}</div>)}
            </div>
            {order.items.map((it,i)=>(
              <div key={i} style={{ display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",padding:"12px 16px",borderTop:"1px solid #dbe2f1",alignItems:"center" }}>
                <div><div style={{ fontFamily:FONT_T,fontSize:14,color:"#0d142e" }}>{it.product.name}</div><div style={{ fontFamily:FONT_B,fontSize:11,color:"#5f6c8f" }}>{it.product.category}</div></div>
                <div style={{ fontFamily:FONT_T,fontSize:14 }}>{it.qty}</div>
                <div style={{ fontFamily:FONT_B,fontSize:13,color:"#4a5573" }}>{fmt(it.product.price)}</div>
                <div style={{ fontFamily:FONT_T,fontSize:14,color:"#1b295b",fontWeight:700 }}>{fmt(it.product.price*it.qty)}</div>
              </div>
            ))}
          </div>
          <div style={{ display:"flex",flexDirection:"column",gap:6,alignItems:"flex-end" }}>
            <div style={{ display:"flex",gap:32,fontFamily:FONT_B,fontSize:14,color:"#5f6c8f" }}><span>Tạm tính:</span><span>{fmt(sub)}</span></div>
            {order.discount>0&&<div style={{ display:"flex",gap:32,fontFamily:FONT_B,fontSize:14,color:"#27ae60" }}><span>Giảm giá ({order.discPct}%):</span><span>-{fmt(order.discount)}</span></div>}
            <div style={{ display:"flex",gap:32,fontFamily:FONT_T,fontSize:22,color:"#1b295b",fontWeight:700,borderTop:"2px solid #dbe2f1",paddingTop:10,marginTop:4 }}><span>TỔNG CỘNG:</span><span>{fmt(order.total)}</span></div>
          </div>
          <div style={{ marginTop:20,padding:16,background:"#f2f5fb",borderRadius:12,border:"2px solid #dbe2f1",textAlign:"center" }}>
            <div style={{ fontFamily:FONT_B,fontSize:13,color:"#4a5573" }}>Cảm ơn bạn đã mua sắm tại <strong>{brand.name}</strong> 🐾</div>
            <div style={{ fontFamily:FONT_B,fontSize:12,color:"#5f6c8f",marginTop:4 }}>Đổi trả trong 7 ngày · {brand.tagline}</div>
          </div>
          <div style={{ display:"flex",gap:12,marginTop:20 }}>
            <button onClick={print} style={{ flex:1,background:"#0d142e",color:"#ffffff",border:"none",borderRadius:12,padding:"13px 0",fontFamily:FONT_T,fontSize:14,cursor:"pointer",fontWeight:700 }}>🖨 In / Lưu PDF</button>
            <button onClick={onClose} style={{ flex:1,background:"#f2f5fb",color:"#5f6c8f",border:"2px solid #dbe2f1",borderRadius:12,padding:"13px 0",fontFamily:FONT_T,fontSize:14,cursor:"pointer",fontWeight:700 }}>Đóng</button>
          </div>
        </div>
      </div>
    </div>
  );
}


// ─── CART DRAWER ──────────────────────────────────────────────────────────────

function CartDrawer({ cart, brand, vouchers, onClose, onRemove, onQty, onOrderComplete }) {
  const FONT_T = "'Nunito','Nunito Sans','Segoe UI',sans-serif";
  const FONT_B = "'Nunito Sans','Nunito','Segoe UI',sans-serif";
  const fmt = n => n?.toLocaleString('vi-VN') + 'đ';

  const [vc, setVc]       = useState('');
  const [dp, setDp]       = useState(0);
  const [vm, setVm]       = useState('');
  const [vu, setVu]       = useState('');
  const [step, setStep]   = useState('cart');
  const [inv, setInv]     = useState(null);
  const [saving, setSaving] = useState(false);

  // Address state — stores both display name and GHN IDs
  const [form, setForm] = useState({
    name: '', phone: '', email: '', address: '', note: '',
    provinceId: null, provinceName: '',
    districtId: null, districtName: '',
    wardCode: '',     wardName: '',
  });

  // GHN master data
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards,     setWards]     = useState([]);
  const [geoLoading, setGeoLoading] = useState('');

  // Shipping fee
  const [shippingFee,  setShippingFee]  = useState(null);
  const [feeLoading,   setFeeLoading]   = useState(false);
  const [feeNote,      setFeeNote]      = useState('');

  const sub      = cart.reduce((s, i) => s + i.product.price * i.qty, 0);
  const da       = Math.round(sub * dp / 100);
  const shipCost = shippingFee || 0;
  const total    = sub - da + shipCost;

  // ── Load provinces on checkout step ────────────────────────────────────────
  useEffect(() => {
    if (step === 'checkout' && provinces.length === 0) {
      setGeoLoading('provinces');
      fetch('/api/shipping/provinces')
        .then(r => r.json())
        .then(data => { setProvinces(Array.isArray(data) ? data : []); })
        .catch(() => {})
        .finally(() => setGeoLoading(''));
    }
  }, [step]);

  // ── Load districts when province changes ────────────────────────────────────
  const handleProvinceChange = async (e) => {
    const idx = e.target.selectedIndex;
    const opt = e.target.options[idx];
    const id  = Number(opt.value);
    const name = opt.text;
    setForm(f => ({ ...f, provinceId: id, provinceName: name, districtId: null, districtName: '', wardCode: '', wardName: '' }));
    setDistricts([]); setWards([]); setShippingFee(null); setFeeNote('');
    if (!id) return;
    setGeoLoading('districts');
    try {
      const data = await fetch(`/api/shipping/districts?province_id=${id}`).then(r => r.json());
      setDistricts(Array.isArray(data) ? data : []);
    } catch (_) {}
    finally { setGeoLoading(''); }
  };

  // ── Load wards when district changes ────────────────────────────────────────
  const handleDistrictChange = async (e) => {
    const idx  = e.target.selectedIndex;
    const opt  = e.target.options[idx];
    const id   = Number(opt.value);
    const name = opt.text;
    setForm(f => ({ ...f, districtId: id, districtName: name, wardCode: '', wardName: '' }));
    setWards([]); setShippingFee(null); setFeeNote('');
    if (!id) return;
    setGeoLoading('wards');
    try {
      const data = await fetch(`/api/shipping/wards?district_id=${id}`).then(r => r.json());
      setWards(Array.isArray(data) ? data : []);
    } catch (_) {}
    finally { setGeoLoading(''); }
  };

  // ── Calculate fee when ward is selected ─────────────────────────────────────
  const handleWardChange = async (e) => {
    const idx  = e.target.selectedIndex;
    const opt  = e.target.options[idx];
    const code = opt.value;
    const name = opt.text;
    setForm(f => ({ ...f, wardCode: code, wardName: name }));
    if (!code || !form.districtId) return;
    setFeeLoading(true); setFeeNote('');
    try {
      const res  = await fetch('/api/shipping/fee', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toDistrictId:   form.districtId,
          toWardCode:     code,
          weight:         cart.reduce((s, i) => s + i.qty * 150, 0),
          insuranceValue: sub,
        }),
      });
      const data = await res.json();
      setShippingFee(data.fee || 30000);
      if (!data.success) {
        // Keep the technical reason in the console for the shop owner to debug,
        // but show customers a friendly Vietnamese note only.
        if (data.note) console.warn('[GHN]', data.note);
        setFeeNote('⚠️ Phí ship tạm tính — sẽ được xác nhận lại khi đóng đơn');
      } else {
        setFeeNote(data.estimatedDays ? `Dự kiến giao ${data.estimatedDays} ngày — ${data.provider || 'GHN'}` : '');
      }
    } catch (err) {
      setShippingFee(30000);
      console.warn('[GHN] connection error:', err.message);
      setFeeNote('⚠️ Phí ship tạm tính — sẽ được xác nhận lại khi đóng đơn');
    } finally {
      setFeeLoading(false);
    }
  };

  // ── Place order (server-side) ────────────────────────────────────────────────
  const place = async () => {
    if (!form.name || !form.phone || !form.address || !form.provinceId || !form.districtId || !form.wardCode) {
      alert('Vui lòng điền đầy đủ thông tin địa chỉ, bao gồm cả phường/xã.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(i => ({ productId: i.product.id, qty: i.qty, variantId: i.variant?.id || '' })),
          customer: {
            name:         form.name,
            phone:        form.phone,
            email:        form.email,
            address:      form.address,
            provinceId:   form.provinceId,
            provinceName: form.provinceName,
            districtId:   form.districtId,
            districtName: form.districtName,
            wardCode:     form.wardCode,
            wardName:     form.wardName,
          },
          voucherCode: vu || null,
          note:        form.note,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Đặt hàng thất bại');

      // Build a local order object for the invoice modal
      const order = {
        id:       data.orderId,
        code:     data.orderCode,
        date:     new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        customer: form,
        items:    cart,
        voucher:  vu, discPct: dp, discount: data.discountAmount,
        total:    data.total,
        shipping: 'GHN',
        shippingFee: data.shippingFee,
      };
      setInv(order);
      onOrderComplete(order);
    } catch (e) {
      alert('Lỗi đặt hàng: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const selectStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 12,
    border: '2px solid #dbe2f1', fontFamily: FONT_B, fontSize: 13,
    boxSizing: 'border-box', background: '#fff', cursor: 'pointer',
  };
  const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: 12,
    border: '2px solid #dbe2f1', fontFamily: FONT_B, fontSize: 14,
    boxSizing: 'border-box',
  };
  const labelStyle = { fontFamily: FONT_T, fontSize: 13, color: '#5f6c8f', marginBottom: 6, display: 'block' };

  if (inv) return <InvoiceModal order={inv} brand={brand} onClose={onClose} />;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1500, display: 'flex' }}>
      <div style={{ flex: 1 }} />
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', width: 420, height: '100%',
        borderLeft: '3px solid #dbe2f1', display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 40px rgba(27,41,91,0.2)', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '2px solid #f2f5fb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f2f5fb', position: 'sticky', top: 0, zIndex: 10 }}>
          <span style={{ fontFamily: FONT_T, fontWeight: 700, color: brand.primary, fontSize: 18 }}>
            🛒 Giỏ hàng ({cart.reduce((s, i) => s + i.qty, 0)})
          </span>
          <button onClick={onClose} style={{ background: brand.primary + '22', border: 'none', borderRadius: 8, padding: '6px 12px', color: brand.primary, cursor: 'pointer', fontFamily: FONT_T, fontWeight: 700, fontSize: 13 }}>✕</button>
        </div>

        <div style={{ flex: 1, padding: 20 }}>
          {step === 'cart' ? (
            cart.length === 0
              ? <div style={{ textAlign: 'center', paddingTop: 80 }}>
                  <div style={{ fontSize: 56 }}>🛒</div>
                  <div style={{ fontFamily: FONT_T, fontSize: 18, color: '#5f6c8f', marginTop: 12 }}>Giỏ hàng của bạn đang trống!</div>
                </div>
              : <>
                  {cart.map(it => {
                    const k = it.product.id + '|' + (it.variant?.id || '');
                    return (
                    <div key={k} style={{ display: 'flex', gap: 12, marginBottom: 14, padding: 14, background: '#f8fafd', borderRadius: 14, border: '1px solid #dbe2f1' }}>
                      <div style={{ width: 68, height: 68, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: '#f2f5fb' }}>
                        {it.product.img
                          ? <img src={it.product.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>📦</div>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: FONT_T, fontSize: 13, color: '#0d142e', marginBottom: 4 }}>{it.product.name}</div>
                        <div style={{ fontFamily: FONT_T, fontSize: 14, color: brand.primary, fontWeight: 700 }}>{fmt(it.product.price)}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                          <button onClick={() => onQty(k, it.qty - 1)} style={{ width: 26, height: 26, borderRadius: 8, background: '#f2f5fb', border: '1px solid #dbe2f1', color: brand.primary, cursor: 'pointer', fontWeight: 700 }}>−</button>
                          <span style={{ fontFamily: FONT_T, fontWeight: 700, fontSize: 14, minWidth: 20, textAlign: 'center' }}>{it.qty}</span>
                          <button onClick={() => onQty(k, it.qty + 1)} style={{ width: 26, height: 26, borderRadius: 8, background: '#f2f5fb', border: '1px solid #dbe2f1', color: brand.primary, cursor: 'pointer', fontWeight: 700 }}>+</button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                        <div style={{ fontFamily: FONT_T, fontWeight: 700, color: brand.primary }}>{fmt(it.product.price * it.qty)}</div>
                        <button onClick={() => onRemove(k)} style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: 18 }}>🗑</button>
                      </div>
                    </div>
                    );
                  })}

                  {/* Voucher */}
                  <div style={{ padding: 16, background: '#f2f5fb', borderRadius: 14, border: '2px dashed #dbe2f1', marginBottom: 16 }}>
                    <div style={{ fontFamily: FONT_T, fontSize: 13, color: brand.primary, marginBottom: 8 }}>🎟 Mã giảm giá</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input value={vc} onChange={e => setVc(e.target.value)} placeholder="Nhập mã..." style={{ flex: 1, padding: '8px 12px', borderRadius: 10, border: '2px solid #dbe2f1', fontFamily: FONT_B, fontSize: 13 }} />
                      <button onClick={async () => {
                        const code = vc.trim().toUpperCase();
                        if (!code) return;
                        setVm('⏳ Đang kiểm tra...');
                        try {
                          const res = await fetch('/api/voucher/validate', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ code }) });
                          const data = await res.json();
                          if (data.valid) { setDp(data.pct); setVu(code); setVm(`✅ Giảm ${data.pct}%!`); }
                          else { setVm(data.error || '❌ Mã không hợp lệ'); setDp(0); setVu(''); }
                        } catch { setVm('❌ Lỗi kết nối, thử lại'); setDp(0); setVu(''); }
                      }} style={{ background: brand.primary, color: '#fff', border: 'none', borderRadius: 10, padding: '8px 14px', fontFamily: FONT_T, fontSize: 13, cursor: 'pointer' }}>Áp dụng</button>
                    </div>
                    {vm && <div style={{ fontFamily: FONT_B, fontSize: 12, color: dp ? '#27ae60' : '#e74c3c', marginTop: 6 }}>{vm}</div>}
                  </div>

                  {/* Totals preview */}
                  {dp > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #dbe2f1' }}>
                    <span style={{ fontFamily: FONT_B, color: '#5f6c8f' }}>Giảm giá ({dp}%)</span>
                    <span style={{ fontFamily: FONT_T, color: '#27ae60', fontWeight: 600 }}>-{fmt(da)}</span>
                  </div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontFamily: FONT_T, fontSize: 18 }}>
                    <span style={{ color: '#0d142e' }}>Tạm tính</span>
                    <span style={{ color: brand.primary, fontWeight: 700 }}>{fmt(sub - da)}</span>
                  </div>
                </>
          ) : (
            /* ── CHECKOUT STEP ─────────────────────────────────────────── */
            <div>
              <div style={{ fontFamily: FONT_T, fontSize: 18, color: '#0d142e', marginBottom: 20 }}>Thông tin giao hàng</div>

              {/* Name + Phone */}
              {[['Họ và tên', 'name', 'text'], ['Số điện thoại', 'phone', 'tel'], ['Email (để nhận hoá đơn)', 'email', 'email']].map(([label, key, type]) => (
                <div key={key} style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>{label}</label>
                  <input type={type} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} style={inputStyle} />
                </div>
              ))}

              {/* Street address */}
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Địa chỉ</label>
                <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Số nhà, tên đường..." style={inputStyle} />
              </div>

              {/* Province */}
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Tỉnh / Thành phố {geoLoading === 'provinces' && '⏳'}</label>
                <select onChange={handleProvinceChange} value={form.provinceId || ''} style={selectStyle}>
                  <option value="">— Chọn tỉnh/thành —</option>
                  {provinces.map(p => (
                    <option key={p.ProvinceID} value={p.ProvinceID}>{p.ProvinceName}</option>
                  ))}
                </select>
              </div>

              {/* District */}
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Quận/Huyện {geoLoading === 'districts' && '⏳'}</label>
                <select onChange={handleDistrictChange} value={form.districtId || ''} disabled={!form.provinceId} style={{ ...selectStyle, opacity: form.provinceId ? 1 : 0.5 }}>
                  <option value="">— Chọn quận/huyện —</option>
                  {districts.map(d => (
                    <option key={d.DistrictID} value={d.DistrictID}>{d.DistrictName}</option>
                  ))}
                </select>
              </div>

              {/* Ward */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Phường/Xã {geoLoading === 'wards' && '⏳'}</label>
                <select onChange={handleWardChange} value={form.wardCode || ''} disabled={!form.districtId} style={{ ...selectStyle, opacity: form.districtId ? 1 : 0.5 }}>
                  <option value="">— Chọn phường/xã —</option>
                  {wards.map(w => (
                    <option key={w.WardCode} value={w.WardCode}>{w.WardName}</option>
                  ))}
                </select>
              </div>

              {/* Note */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Ghi chú đơn hàng (không bắt buộc)</label>
                <input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="VD: Để hàng trước cửa" style={inputStyle} />
              </div>

              {/* Shipping fee + total summary */}
              <div style={{ background: '#f2f5fb', borderRadius: 14, padding: 16, border: '2px solid #dbe2f1' }}>
                <div style={{ fontFamily: FONT_T, fontSize: 13, color: brand.primary, marginBottom: 10, fontWeight: 700 }}>🚚 Phí vận chuyển</div>
                {feeLoading
                  ? <div style={{ fontFamily: FONT_B, fontSize: 13, color: '#5f6c8f' }}>⏳ Đang tính...</div>
                  : shippingFee !== null
                    ? <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT_T, marginBottom: 4 }}>
                          <span style={{ color: '#5f6c8f' }}>Phí ship:</span>
                          <span style={{ color: brand.primary, fontWeight: 700 }}>{fmt(shippingFee)}</span>
                        </div>
                        {feeNote && <div style={{ fontFamily: FONT_B, fontSize: 11, color: '#5f6c8f' }}>{feeNote}</div>}
                      </div>
                    : <div style={{ fontFamily: FONT_B, fontSize: 12, color: '#5f6c8f' }}>↑ Chọn phường/xã để tính phí vận chuyển</div>
                }
                {dp > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: FONT_B, fontSize: 13 }}>
                  <span style={{ color: '#5f6c8f' }}>Giảm giá ({dp}%):</span>
                  <span style={{ color: '#27ae60' }}>-{fmt(da)}</span>
                </div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTop: '1px solid #dbe2f1', fontFamily: FONT_T }}>
                  <span style={{ color: '#0d142e', fontSize: 15 }}>Tổng cộng:</span>
                  <span style={{ color: brand.primary, fontSize: 22, fontWeight: 700 }}>{fmt(total)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div style={{ padding: 20, borderTop: '2px solid #f2f5fb', background: '#fff', position: 'sticky', bottom: 0 }}>
          {step === 'cart'
            ? <button
                onClick={() => cart.length > 0 && setStep('checkout')}
                style={{ width: '100%', background: cart.length > 0 ? brand.primary : '#dbe2f1', color: '#fff', border: 'none', borderRadius: 14, padding: '14px 0', fontFamily: FONT_T, fontSize: 16, fontWeight: 700, cursor: cart.length > 0 ? 'pointer' : 'not-allowed' }}
              >Tiến hành thanh toán →</button>
            : <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setStep('cart')} style={{ flex: 1, background: '#f2f5fb', color: brand.primary, border: '2px solid #dbe2f1', borderRadius: 12, padding: '12px 0', fontFamily: FONT_T, fontWeight: 700, cursor: 'pointer' }}>← Quay lại</button>
                <button
                  onClick={place}
                  disabled={saving || !form.wardCode}
                  style={{ flex: 2, background: brand.primary, color: '#fff', border: 'none', borderRadius: 12, padding: '12px 0', fontFamily: FONT_T, fontWeight: 700, fontSize: 15, cursor: (saving || !form.wardCode) ? 'not-allowed' : 'pointer', opacity: (saving || !form.wardCode) ? 0.7 : 1 }}
                >
                  {saving ? '⏳ Đang đặt hàng...' : '🧾 Đặt hàng'}
                </button>
              </div>
          }
        </div>
      </div>
    </div>
  );
}

// ─── POPUP ────────────────────────────────────────────────────────────────────
function PromoWidget({ cfg, brand }) {
  const [open,setOpen]=useState(false);
  const [email,setEmail]=useState(""); const [name,setName]=useState("");
  const [done,setDone]=useState(false); const [sending,setSending]=useState(false); const [err,setErr]=useState(null);

  // Auto-slide the box open once after the configured delay (desktop UX)
  useEffect(()=>{
    const t=setTimeout(()=>setOpen(true), cfg.delayMs||3500);
    return()=>clearTimeout(t);
  },[cfg.delayMs]);

  const submit = async ()=>{
    if(!name.trim()){ setErr("Vui lòng nhập tên của bạn."); return; }
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())){ setErr("Email không hợp lệ."); return; }
    setSending(true); setErr(null);
    try{
      const res = await fetch("/api/subscribe",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ name:name.trim(), email:email.trim() }) });
      let data; try{ data=await res.json(); }catch{ data={}; }
      if(!res.ok||!data.success) throw new Error(data.error||"Đăng ký thất bại, vui lòng thử lại.");
      setDone(true);
    }catch(e){ setErr(e.message); }
    finally{ setSending(false); }
  };

  return (
    <div className="hh-promo-wrap">
      {/* The box — slides up/down on desktop, always visible inline on mobile */}
      <div className={`hh-promo-box${open?" open":""}`} style={{ background:"#fff",borderRadius:20,overflow:"hidden",boxShadow:"0 8px 32px rgba(27,41,91,0.22)",border:"2px solid #dbe2f1" }}>
        {(cfg.img||cfg.imgMobile)&&<div style={{ width:"100%",height:110 }}>
          <ResponsiveImg src={cfg.img} srcMobile={cfg.imgMobile} alt="" style={{ width:"100%",height:"100%",objectFit:"cover",display:"block" }} />
        </div>}
        <div style={{ background:brand.primary,padding:"16px 18px 14px",position:"relative" }}>
          <button className="hh-promo-close" onClick={()=>setOpen(false)} aria-label="Thu gọn" style={{ position:"absolute",top:10,right:12,background:"rgba(255,255,255,0.25)",border:"none",borderRadius:50,width:26,height:26,color:"#fff",cursor:"pointer",fontSize:13,lineHeight:1 }}>✕</button>
          <div style={{ fontFamily:FONT_T,fontSize:18,color:"#fff",fontWeight:700 }}>{cfg.title}</div>
          <div style={{ fontFamily:FONT_B,fontSize:12.5,color:"rgba(255,255,255,0.88)",marginTop:2 }}>{cfg.body}</div>
        </div>
        <div style={{ padding:16 }}>
          {done
            ? <div style={{ textAlign:"center",padding:"6px 0" }}>
                <div style={{ fontSize:36 }}>📬</div>
                <div style={{ fontFamily:FONT_T,fontSize:16,color:brand.primary,margin:"8px 0 4px" }}>{cfg.successTitle}</div>
                <div style={{ fontFamily:FONT_B,fontSize:13,color:"#4a5573" }}>Code giảm giá đang được gửi đến Email của bạn</div>
              </div>
            : <>
                <input value={name} onChange={e=>setName(e.target.value)} placeholder="Tên của bạn" style={{ width:"100%",padding:"10px 14px",borderRadius:10,border:"2px solid #dbe2f1",fontSize:13,fontFamily:FONT_B,marginBottom:9,boxSizing:"border-box" }} />
                <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" type="email" style={{ width:"100%",padding:"10px 14px",borderRadius:10,border:"2px solid #dbe2f1",fontSize:13,fontFamily:FONT_B,marginBottom:10,boxSizing:"border-box" }} />
                {err&&<div style={{ marginBottom:10,padding:"7px 10px",borderRadius:8,fontFamily:FONT_B,fontSize:12,background:"#fdeeee",color:"#d64545",border:"1px solid #f0c4c4" }}>{err}</div>}
                <button onClick={submit} disabled={sending} style={{ width:"100%",background:brand.primary,color:"#fff",border:"none",borderRadius:12,padding:"11px 0",fontFamily:FONT_T,fontSize:14,fontWeight:700,cursor:sending?"not-allowed":"pointer",opacity:sending?0.7:1 }}>{sending?"⏳ Đang gửi...":cfg.btnLabel}</button>
              </>
          }
        </div>
      </div>
      {/* Collapsed launcher — small round logo button (desktop only) */}
      <button className="hh-promo-icon" onClick={()=>setOpen(o=>!o)} aria-label="Mở ưu đãi" style={{ width:56,height:56,borderRadius:"50%",background:brand.primary,border:"3px solid #fff",boxShadow:"0 4px 18px rgba(27,41,91,0.4)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0,overflow:"hidden" }}>
        {brand.logoImg
          ? <img src={brand.logoImg} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }} />
          : <span style={{ fontSize:24 }}>🎁</span>}
      </button>
    </div>
  );
}

// ─── ADMIN LOGIN — Supabase Auth ──────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
// ─── MAIN APP ─────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/* ══════════ HANAPET LANDING — color-block sections ══════════ */
const NAVY="#18284e", CLOUD="#f5f7fc", PERI="#8f9fe8", ACCENT="#ff6a3d";
const SCENT_MAP=[
  { k:["baby","powder"], name:"Baby Powder",  bg:"#cfe2f4", deep:"#3f6fae", img:"/products/wbs-baby-powder.png", icon:"/scents/baby-powder.png" },
  { k:["cotton","candy"],name:"Cotton Candy", bg:"#f4d4e7", deep:"#bf4f97", img:"/products/wbs-cotton-candy.png", icon:"/scents/cotton-candy.png" },
  { k:["peach","yogurt"],name:"Peach Yogurt", bg:"#f8ddcb", deep:"#d9713a", img:"/products/wbs-peach-yogurt.png", icon:"/scents/peach-yogurt.png" },
  { k:["quince"],        name:"Quince",       bg:"#efe171", deep:"#8a6d14", img:"/products/wbs-quince.png", icon:"/scents/quince.png" },
  { k:["lavender","oải"],name:"Lavender",     bg:"#dcd2f0", deep:"#6a55ad", img:"/products/wbs-lavender.png", icon:"/scents/lavender.png" },
];
const MISTY_MAP=[
  { k:["xịt","spray","chai"], img:"/products/misty-spray.png" },
  { k:["refill","lõi","loi"], img:"/products/misty-refill.png" },
];
const norm = t => (t||"").toLowerCase();
const scentOf  = v => SCENT_MAP.find(sc=>sc.k.some(k=>norm(v?.name).includes(k)));
const mistyImg = v => (MISTY_MAP.find(m=>m.k.some(k=>norm(v?.name).includes(k)))||{}).img;

function Reveal({ children, delay=0, style }) {
  const ref = useRef(null); const [on,setOn]=useState(false);
  useEffect(()=>{
    const el=ref.current; if(!el) return;
    if(typeof IntersectionObserver==="undefined"||window.matchMedia("(prefers-reduced-motion: reduce)").matches){ setOn(true); return; }
    const io=new IntersectionObserver(([e])=>{ if(e.isIntersecting){ setOn(true); io.disconnect(); } },{ threshold:0.15 });
    io.observe(el); return ()=>io.disconnect();
  },[]);
  return <div ref={ref} style={{ opacity:on?1:0, transform:on?"none":"translateY(26px)", transition:`opacity .7s ease ${delay}ms, transform .7s cubic-bezier(0.22,1,0.36,1) ${delay}ms`, ...style }}>{children}</div>;
}

function Hero({ brand, products, hasMisty, hasWbs }) {
  const go = id => document.getElementById(id)?.scrollIntoView({ behavior:"smooth" });
  const heroVid = brand.heroVideo || "";   // set in admin/config to enable TVC background
  const [vidOk,setVidOk] = useState(!!heroVid);
  return (
    <section style={{ position:"relative", overflow:"hidden", background:NAVY }}>
      <style>{`
        @keyframes hpFloat{ 0%,100%{ transform:translateY(0) } 50%{ transform:translateY(-12px) } }
        @keyframes hpRise{ from{ opacity:0; transform:translateY(28px) } to{ opacity:1; transform:none } }
        .hp-hero{ max-width:1200px; margin:0 auto; padding:64px 24px 72px; display:grid; grid-template-columns:1.05fr 0.95fr; gap:32px; align-items:center; min-height:calc(88svh - 64px) }
        .hp-hero-btn{ transition:transform .25s cubic-bezier(0.34,1.56,0.64,1), box-shadow .25s ease }
        .hp-hero-btn:hover{ transform:translateY(-4px) scale(1.03); box-shadow:0 16px 36px rgba(0,0,0,0.35) }
        .hp-hero-stage{ position:relative; height:clamp(300px,42vw,460px) }
        .hp-hero-stage img{ position:absolute; bottom:0; filter:drop-shadow(0 26px 40px rgba(0,0,0,0.4)) }
        @media (max-width:820px){
          .hp-hero{ grid-template-columns:1fr; text-align:center; padding:44px 22px 56px; gap:20px; min-height:0 }
          .hp-hero-copy{ order:1 } .hp-hero-stage{ order:2; height:300px }
          .hp-hero-btns{ justify-content:center }
        }
      `}</style>
      {vidOk&&<>
        <video autoPlay muted loop playsInline onError={()=>setVidOk(false)}
          style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", filter:"blur(2px) brightness(0.85)", transform:"scale(1.05)" }}>
          <source src={heroVid} type="video/mp4" />
        </video>
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom, rgba(13,20,46,0.62), rgba(13,20,46,0.5))" }} />
      </>}
      <div className="hp-hero" style={{ position:"relative", zIndex:2 }}>
        <div className="hp-hero-copy">
          <div style={{ fontFamily:FONT_B, fontWeight:700, fontSize:13, letterSpacing:3, textTransform:"uppercase", color:PERI, marginBottom:16, animation:"hpRise .7s both" }}>{brand.heroEyebrow||"🐾 Đồ dùng thú cưng cho chó & mèo"}</div>
          <h1 style={{ fontFamily:FONT_T, fontWeight:900, fontSize:"clamp(32px,5vw,60px)", lineHeight:1.04, letterSpacing:"-0.02em", color:"#fff", margin:"0 0 16px", textShadow:vidOk?"0 4px 30px rgba(0,0,0,0.4)":"none", animation:"hpRise .7s .1s both" }}>
            {brand.heroTitle||"Chăm sóc thú cưng cao cấp cùng Hanapet"}
          </h1>
          <p style={{ fontFamily:FONT_B, fontSize:"clamp(14px,1.5vw,17px)", lineHeight:1.75, color:"rgba(255,255,255,0.82)", maxWidth:480, margin:"0 0 30px", animation:"hpRise .7s .2s both" }}>
            {brand.heroSub||"Khử mùi an toàn · Tắm gội thơm tho — cho boss sạch thơm mỗi ngày."}
          </p>
          <div className="hp-hero-btns" style={{ display:"flex", gap:12, flexWrap:"wrap", animation:"hpRise .7s .3s both" }}>
            {hasMisty&&<button className="hp-hero-btn" onClick={()=>go("sku-misty")} style={{ background:"#fff", color:NAVY, border:"none", borderRadius:999, padding:"15px 28px", fontFamily:FONT_T, fontWeight:800, fontSize:15, cursor:"pointer", boxShadow:"0 10px 28px rgba(0,0,0,0.3)" }}>Xịt khử mùi →</button>}
            {hasWbs&&<button className="hp-hero-btn" onClick={()=>go("sku-wbs")} style={{ background:PERI, color:NAVY, border:"none", borderRadius:999, padding:"15px 28px", fontFamily:FONT_T, fontWeight:800, fontSize:15, cursor:"pointer", boxShadow:"0 10px 28px rgba(0,0,0,0.3)" }}>Tắm gội thơm tho →</button>}
          </div>
        </div>
        {!vidOk&&(
          <div className="hp-hero-stage">
            <img src="/products/misty-spray.png" alt="Misty Fresh" style={{ right:"34%", height:"100%", animation:"hpFloat 7s ease-in-out infinite" }} />
            <img src="/products/wbs-lavender.png" alt="Bubble Shampoo" style={{ right:"4%", height:"82%", animation:"hpFloat 7s ease-in-out 1.2s infinite" }} />
          </div>
        )}
      </div>
    </section>
  );
}

function SkuBlock({ id, product:p, brand, onAdd, onDetail, flip=false }) {
  const variants = Array.isArray(p.variants)?p.variants:[];
  const isWbs = variants.some(v=>scentOf(v)) || /bubble|shampoo|tắm/.test(norm(p.name));
  const [sel,setSel] = useState(variants[0]||null);
  const scent = isWbs ? (scentOf(sel)||SCENT_MAP[0]) : null;
  const dark = !isWbs;                       // Misty = dark navy block, white text
  const bg   = scent ? scent.bg : NAVY;
  const deep = scent ? scent.deep : "#fff";
  const ink  = dark ? "#fff" : NAVY;         // main text color on this block
  const img  = (sel&&sel.img) || (isWbs ? (scent&&scent.img) : mistyImg(sel)) || p.img || "/products/misty-spray.png";
  // Gallery: main image (variant-aware) + any extra product images
  const gallery = [img, ...(p.images||[])].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i);
  const [gi,setGi] = useState(0);
  useEffect(()=>{ setGi(0); }, [img]);   // reset to variant image when variant changes
  const curImg = gallery[gi] || img;
  const price    = sel ? (Number(sel.price)||p.price)       : p.price;
  const original = sel ? (Number(sel.original)||p.original) : p.original;
  const stock    = sel ? (Number(sel.stock)||0)             : p.stock;
  const off = original>price ? pct(price,original) : 0;
  return (
    <section id={id} style={{ padding:"16px 14px 0" }}>
      {(p.banner||p.bannerVideo)&&(
        <Reveal>
        <div style={{ maxWidth:1200,margin:"0 auto 14px",borderRadius:24,overflow:"hidden",position:"relative",aspectRatio:"16/9",boxShadow:"0 12px 40px rgba(24,40,78,0.18)" }}>
          {p.bannerVideo
            ? <video src={p.bannerVideo} autoPlay muted loop playsInline style={{ width:"100%",height:"100%",objectFit:"cover" }} />
            : <img src={p.banner} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }} />}
          {p.bannerText&&<>
            <div style={{ position:"absolute",inset:0,background:"linear-gradient(90deg,rgba(10,16,38,0.7) 0%,rgba(10,16,38,0.05) 70%)" }} />
            <div style={{ position:"absolute",bottom:0,left:0,padding:"clamp(18px,4vw,36px)",fontFamily:FONT_T,fontWeight:800,fontSize:"clamp(20px,3vw,34px)",color:"#fff",textShadow:"0 2px 14px rgba(0,0,0,0.5)",maxWidth:"80%" }}>{p.bannerText}</div>
          </>}
        </div>
        </Reveal>
      )}
      <Reveal>
      <div className="hp-sku-card" style={{ maxWidth:1200,margin:"0 auto",background:bg,borderRadius:32,transition:"background .6s ease, transform .35s ease, box-shadow .35s ease",overflow:"hidden",boxShadow:dark?"0 18px 50px rgba(24,40,78,0.35)":"0 18px 50px rgba(24,40,78,0.16)" }}
        onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-6px)";e.currentTarget.style.boxShadow=dark?"0 28px 64px rgba(24,40,78,0.45)":"0 28px 64px rgba(24,40,78,0.24)";}}
        onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow=dark?"0 18px 50px rgba(24,40,78,0.35)":"0 18px 50px rgba(24,40,78,0.16)";}}>
        <div className="hp-sku" style={{ display:"grid",gridTemplateColumns:"1fr 1fr",alignItems:"center",direction:flip?"rtl":"ltr" }}>
          <div style={{ direction:"ltr",position:"relative",minHeight:320,height:"min(48vw, 520px)",maxHeight:520,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px 0" }}>
            <div style={{ position:"relative",flex:1,width:"100%",display:"flex",alignItems:"center",justifyContent:"center",minHeight:0 }}>
              {dark&&<div style={{ position:"absolute",width:"64%",height:"64%",borderRadius:"50%",background:"radial-gradient(circle, rgba(143,159,232,0.55) 0%, rgba(143,159,232,0.18) 45%, rgba(24,40,78,0) 72%)",filter:"blur(6px)",pointerEvents:"none" }} />}
              <img key={curImg} src={curImg} alt={p.name} onClick={()=>onDetail(p)} className="hp-sku-mainimg" style={{ position:"relative",maxHeight:"100%",maxWidth:"68%",objectFit:"contain",cursor:"pointer",borderRadius:8,filter:dark?"drop-shadow(0 24px 40px rgba(0,0,0,0.45))":"drop-shadow(0 22px 34px rgba(24,40,78,0.28))",animation:"hpFloat 6s ease-in-out infinite" }} />
              {gallery.length>1&&<>
                <button onClick={()=>setGi(i=>(i-1+gallery.length)%gallery.length)} aria-label="Ảnh trước" style={{ position:"absolute",left:"6%",top:"50%",transform:"translateY(-50%)",width:38,height:38,borderRadius:19,background:dark?"rgba(255,255,255,0.16)":"rgba(255,255,255,0.75)",color:dark?"#fff":NAVY,border:"none",cursor:"pointer",fontSize:18,zIndex:2,backdropFilter:"blur(4px)" }}>‹</button>
                <button onClick={()=>setGi(i=>(i+1)%gallery.length)} aria-label="Ảnh sau" style={{ position:"absolute",right:"6%",top:"50%",transform:"translateY(-50%)",width:38,height:38,borderRadius:19,background:dark?"rgba(255,255,255,0.16)":"rgba(255,255,255,0.75)",color:dark?"#fff":NAVY,border:"none",cursor:"pointer",fontSize:18,zIndex:2,backdropFilter:"blur(4px)" }}>›</button>
              </>}
            </div>
            {gallery.length>1&&(
              <div style={{ display:"flex",gap:8,marginTop:14,alignItems:"center",flexWrap:"wrap",justifyContent:"center",maxWidth:"90%" }}>
                {gallery.map((src,i)=>(
                  <button key={i} onClick={()=>setGi(i)} style={{ width:46,height:46,borderRadius:9,overflow:"hidden",border:`2px solid ${i===gi?ACCENT:(dark?"rgba(255,255,255,0.3)":"rgba(24,40,78,0.2)")}`,background:dark?"rgba(255,255,255,0.9)":"#fff",cursor:"pointer",padding:2,flexShrink:0,transition:"border-color .2s" }}>
                    <img src={src} alt="" style={{ width:"100%",height:"100%",objectFit:"contain" }} />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={{ direction:"ltr",padding:"clamp(28px,4vw,56px)" }}>
            <div style={{ fontFamily:FONT_B,fontWeight:700,fontSize:12,letterSpacing:3.5,textTransform:"uppercase",color:deep,transition:"color .6s ease",marginBottom:12 }}>
              {isWbs?"Tắm gội thơm tho":"Khử mùi an toàn"}{off>0&&<span style={{ marginLeft:10,background:dark?"#fff":NAVY,color:dark?NAVY:"#fff",borderRadius:999,padding:"3px 10px",letterSpacing:0 }}>-{off}%</span>}
            </div>
            <h2 onClick={()=>onDetail(p)} title="Xem chi tiết" style={{ fontFamily:FONT_T,fontWeight:900,fontSize:"clamp(30px,3.6vw,48px)",lineHeight:1.02,letterSpacing:"-0.01em",color:ink,margin:"0 0 14px",cursor:"pointer",display:"inline-block",transition:"text-shadow .3s ease, transform .3s ease" }}
              onMouseEnter={e=>{e.currentTarget.style.textShadow=dark?"0 0 22px rgba(255,255,255,0.65), 0 0 40px rgba(255,255,255,0.3)":"0 0 20px rgba(24,40,78,0.25)";e.currentTarget.style.transform="translateY(-1px)";}}
              onMouseLeave={e=>{e.currentTarget.style.textShadow="none";e.currentTarget.style.transform="none";}}>{p.name}</h2>
            <p style={{ fontFamily:FONT_B,fontSize:15,lineHeight:1.8,color:dark?"rgba(255,255,255,0.82)":NAVY+"cc",whiteSpace:"pre-line",margin:"0 0 22px",maxWidth:460 }}>{p.story}</p>
            {variants.length>0&&(
              <div style={{ marginBottom:22 }}>
                <div style={{ fontFamily:FONT_T,fontWeight:800,fontSize:13,color:ink,marginBottom:10 }}>{p.variantLabel||(isWbs?"Chọn mùi hương":"Chọn loại")}</div>
                <div style={{ display:"flex",gap:10,flexWrap:"wrap" }}>
                  {variants.map((v,i)=>{
                    const vs=scentOf(v); const on=sel===v;
                    const onBg  = dark ? "#fff" : NAVY;
                    const onTxt = dark ? NAVY : "#fff";
                    const offBg = dark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.65)";
                    const offTxt= dark ? "#fff" : NAVY;
                    return (
                      <button key={i} onClick={()=>setSel(v)} style={{ display:"flex",alignItems:"center",gap:8,background:on?onBg:offBg,color:on?onTxt:offTxt,border:on?"2px solid "+ACCENT:"2px solid transparent",borderRadius:999,padding:"9px 15px",fontFamily:FONT_T,fontWeight:800,fontSize:13,cursor:"pointer",transition:"all .25s ease" }}>
                        {vs&&(vs.icon?<img src={vs.icon} alt="" style={{ width:20,height:20,objectFit:"contain",flexShrink:0 }} />:<span style={{ width:14,height:14,borderRadius:7,background:vs.deep,border:"2px solid #fff",flexShrink:0 }} />)}
                        {v.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div style={{ display:"flex",alignItems:"center",gap:14,flexWrap:"wrap" }}>
              <div style={{ display:"flex",alignItems:"baseline",gap:8 }}>
                <span style={{ fontFamily:FONT_T,fontWeight:900,fontSize:38,letterSpacing:"-0.02em",color:ink,lineHeight:1 }}>{fmt(price)}</span>
                {original>price&&<span style={{ fontFamily:FONT_B,fontSize:13,color:dark?"rgba(255,255,255,0.45)":NAVY+"66",textDecoration:"line-through" }}>{fmt(original)}</span>}
              </div>
              <button onClick={()=>{ if(variants.length>0&&!sel){alert("Vui lòng chọn phân loại");return;} onAdd(p,1,sel); }} disabled={stock<=0}
                style={{ background:dark?"#fff":NAVY,color:dark?NAVY:"#fff",border:"2px solid "+(dark?"#fff":NAVY),borderRadius:999,padding:"14px 30px",fontFamily:FONT_T,fontWeight:800,fontSize:15,cursor:stock>0?"pointer":"not-allowed",opacity:stock>0?1:0.5,transition:"all .2s ease",boxShadow:"0 4px 14px rgba(0,0,0,0.12)" }}
                onMouseEnter={e=>{ if(stock>0){e.currentTarget.style.background=ACCENT;e.currentTarget.style.borderColor=ACCENT;e.currentTarget.style.color="#fff";e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 12px 28px rgba(255,106,61,0.4)";} }}
                onMouseLeave={e=>{ e.currentTarget.style.background=dark?"#fff":NAVY;e.currentTarget.style.borderColor=dark?"#fff":NAVY;e.currentTarget.style.color=dark?NAVY:"#fff";e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 4px 14px rgba(0,0,0,0.12)"; }}>
                {stock>0?"🛒 Thêm vào giỏ":"Hết hàng"}
              </button>
              <button onClick={()=>onDetail(p)}
                style={{ background:"transparent",color:ink,border:"2px solid "+(dark?"rgba(255,255,255,0.5)":NAVY),borderRadius:999,padding:"12px 24px",fontFamily:FONT_T,fontWeight:800,fontSize:15,cursor:"pointer",transition:"all .2s ease" }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=ACCENT;e.currentTarget.style.color=ACCENT;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=dark?"rgba(255,255,255,0.5)":NAVY;e.currentTarget.style.color=ink;}}>Chi tiết →</button>
            </div>
            {stock>0&&stock<=10&&<div style={{ fontFamily:FONT_B,fontSize:12,color:deep,marginTop:12,transition:"color .6s ease" }}>Chỉ còn {stock} sản phẩm</div>}
          </div>
        </div>
      </div>
      </Reveal>
    </section>
  );
}

export default function App() {
  const [brand,    setBrand,    r1] = usePersist("hh_brand2",    DEFAULTS.brand);
  const [banners,  setBanners,  r2] = usePersist("hh_banners2",  DEFAULTS.banners);
  const [products, setProducts, r3] = usePersist("hh_products2", DEFAULTS.products);
  const [socials,  setSocials,  r4] = usePersist("hh_socials2",  DEFAULTS.socials);
  const [trustBar, setTrustBar, r5] = usePersist("hh_trust",     DEFAULTS.trustBar);
  const [popup,    setPopup,    r6] = usePersist("hh_popup",     DEFAULTS.popup);
  const [about,    setAbout,    r7] = usePersist("hh_about",     DEFAULTS.about);
  const [footer,   setFooter,   r8] = usePersist("hh_footer",    DEFAULTS.footer);
  const [flashBar, setFlashBar, r9] = usePersist("hh_flashbar",  DEFAULTS.flashBar);
  const [vouchers, setVouchers, r10]= usePersist("hh_vouchers",  DEFAULTS.vouchers);
  const [cats,     setCats,     r11]= usePersist("hh_cats",      DEFAULTS.categories);

  const [orders, setOrders] = useState([]);
  const S = { brand:[brand,setBrand], banners:[banners,setBanners], products:[products,setProducts], socials:[socials,setSocials], trustBar:[trustBar,setTrustBar], popup:[popup,setPopup], about:[about,setAbout], footer:[footer,setFooter], flashBar:[flashBar,setFlashBar], vouchers:[vouchers,setVouchers], categories:[cats,setCats], orders:[orders,setOrders] };

  const [page,setPage]             = useState("shop");
  const [cat,setCat]               = useState("Tất cả");
  const [search,setSearch]         = useState("");
  const [sort,setSort]             = useState("default");
  const [visibleCount,setVisibleCount] = useState(4);
  useEffect(()=>{ setVisibleCount(4); },[cat,search,sort]);
  const [selProd,setSelProd]       = useState(null);
  const [cart,setCart]             = useState([]);
  const [showCart,setShowCart]     = useState(false);
  const [toast,setToast]           = useState(null);

  const onLogoClick = () => { setPage("shop"); };

  const ready = r1&&r2&&r3&&r4&&r5&&r6&&r7&&r8&&r9&&r10&&r11;


  // Fetch fresh products + config from Supabase on every load
  // This ensures images, prices, stock etc. are always up to date
  useEffect(() => {
    getProducts().then(prods => {
      if (prods && prods.length > 0) setProducts(prods);
    }).catch(() => {});
    getCategories().then(cs => {
      if (cs && cs.length > 0) setCats(cs);
    }).catch(() => {});
    getAllConfigs().then(cfg => {
      if (cfg.brand)    setBrand(cfg.brand);
      if (cfg.banners)  setBanners(cfg.banners);
      if (cfg.socials)  setSocials(cfg.socials);
      if (cfg.trustBar) setTrustBar(cfg.trustBar);
      if (cfg.popup)    setPopup(cfg.popup);
      if (cfg.about)    setAbout(cfg.about);
      if (cfg.footer)   setFooter(cfg.footer);
      if (cfg.flashBar) setFlashBar(cfg.flashBar);
      // Inject favicon dynamically from uploaded URL
      const favUrl = cfg.footer?.faviconUrl;
      if (favUrl) {
        let link = document.querySelector("link[rel~='icon']");
        if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
        link.href = favUrl;
      }
    }).catch(() => {});
  }, []);

  const notify = msg=>{ setToast(msg); setTimeout(()=>setToast(null),2500); };
  const lineKey = (productId, variant) => productId + '|' + (variant?.id || '');
  const addToCart = (product,qty=1,variant=null)=>{
    // Fold the chosen variant's price/image/name into an effective product object,
    // so cart, invoice and checkout code that reads `product.price` keeps working.
    const eff = variant
      ? { ...product,
          price:    Number(variant.price)    || product.price,
          original: Number(variant.original) || product.original,
          img:      variant.img || product.img,
          name:     `${product.name} — ${variant.name}`,
          stock:    Number(variant.stock) || 0 }
      : product;
    const key = lineKey(product.id, variant);
    setCart(prev=>{
      const ex=prev.find(i=>lineKey(i.product.id,i.variant)===key);
      if(ex) return prev.map(i=>lineKey(i.product.id,i.variant)===key?{...i,qty:i.qty+qty}:i);
      return[...prev,{product:eff,qty,variant}];
    });
    notify(`Đã thêm "${eff.name}" vào giỏ! 🐾`);
  };
  const removeFromCart = key=>setCart(p=>p.filter(i=>lineKey(i.product.id,i.variant)!==key));
  const updateQty = (key,qty)=>{ if(qty<=0) removeFromCart(key); else setCart(p=>p.map(i=>lineKey(i.product.id,i.variant)===key?{...i,qty}:i)); };
  const cartCount = cart.reduce((s,i)=>s+i.qty,0);

  const allCats = ["Tất cả",...cats];
  const filtered = products
    .filter(p=>cat==="Tất cả"||p.category===cat)
    .filter(p=>p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b)=>{
      if(sort==="price-asc")  return a.price-b.price;
      if(sort==="price-desc") return b.price-a.price;
      if(sort==="rating")     return b.rating-a.rating;
      if(sort==="flash")      return (b.flashSale?1:0)-(a.flashSale?1:0);
      return 0;
    });

  if(!ready) return <div style={{ minHeight:"100vh",background:"#f2f5fb",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16 }}><img src="/logo.png" alt="Hanapet" style={{ height:72,objectFit:"contain" }} /><div style={{ fontFamily:FONT_T,fontSize:18,color:"#1b295b" }}>Đang tải...</div></div>;

  return (
    <div className={"hh-motion-"+(brand.motion||"full")} style={{ minHeight:"100vh",background:"#f8fafd",fontFamily:FONT_B }}>
      <style>{`
        /* Motion levels: full = all animations; soft = gentle only (no float loops); off = none */
        .hh-motion-soft [style*="hpFloat"], .hh-motion-soft [style*="hpPop"]{ animation:none !important }
        .hh-motion-off *{ animation:none !important; transition:none !important }
        @media (prefers-reduced-motion: reduce){ *{ animation:none !important; transition-duration:.01ms !important } }
      `}</style>
      {toast&&<div style={{ position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",background:"#0d142e",color:brand.secondary,padding:"11px 26px",borderRadius:30,zIndex:9999,fontFamily:FONT_T,fontSize:14,boxShadow:"0 4px 20px rgba(27,41,91,0.3)",whiteSpace:"nowrap" }}>{toast}</div>}

      {/* NAV */}
      <style>{`
        .hh-nav-row{ display:flex; align-items:center; gap:14px; height:64px; flex-wrap:nowrap }
        .hh-nav-search{ flex:1; position:relative; max-width:400px }
        .hh-nav-links{ display:flex; gap:4px; margin-left:auto }
        .hh-nav-socials{ display:flex; gap:6px }
        .hh-img-mobile{ display:none }
        @media (max-width:680px){
          .hh-img-desktop{ display:none !important }
          .hh-img-mobile{ display:block !important }
        }
        /* ── Promo widget ── */
        @media (min-width:681px){
          .hh-promo-wrap{ position:fixed; right:20px; bottom:20px; z-index:1500; display:flex; flex-direction:column; align-items:flex-end; gap:10px; width:320px; pointer-events:none }
          .hh-promo-wrap>*{ pointer-events:auto }
          .hh-promo-box{ width:100%; max-height:0; opacity:0; transform:translateY(18px); overflow:hidden; transition:max-height .4s cubic-bezier(0.22,1,0.36,1), opacity .3s ease, transform .4s cubic-bezier(0.22,1,0.36,1) }
          .hh-promo-box.open{ max-height:560px; opacity:1; transform:translateY(0) }
        }
        @media (max-width:680px){
          .hh-promo-wrap{ position:static; padding:0 16px 28px; max-width:480px; margin:0 auto }
          .hh-promo-box{ max-height:none; opacity:1; transform:none }
          .hh-promo-icon{ display:none !important }
          .hh-promo-close{ display:none !important }
        }
        @media (max-width:760px){
          .hh-nav-row{ height:auto; flex-wrap:wrap; padding:10px 16px !important; gap:8px !important }
          .hh-nav-logo-text div:first-child{ font-size:17px !important }
          .hh-nav-logo-text div:last-child{ display:none }
          .hh-nav-search{ order:3; flex:1 1 100%; max-width:100% }
          .hh-nav-links{ order:2; margin-left:0 !important }
          .hh-nav-links button{ padding:6px 10px !important; font-size:12px !important }
          .hh-nav-socials{ display:none }
          .hh-nav-cart{ padding:7px 12px !important; font-size:12px !important }
        }
      `}</style>
      <nav style={{ background:"rgba(255,255,255,0.92)",backdropFilter:"blur(12px)",borderBottom:"1px solid #e6eaf4",position:"sticky",top:0,zIndex:100 }}>
        <div className="hh-nav-row" style={{ maxWidth:1200,margin:"0 auto",padding:"0 20px",boxSizing:"border-box",height:64,display:"flex",alignItems:"center",gap:16 }}>
          <div style={{ display:"flex",alignItems:"center",gap:10,flexShrink:0,userSelect:"none",cursor:"pointer" }} onClick={onLogoClick}>
            <img src={brand.logoImg||"/logo.png"} alt={brand.name} style={{ height:40,objectFit:"contain" }} />
          </div>
          <div style={{ flex:1 }} />
          {[["shop","Cửa hàng"],["about","Về Hanapet"]].map(([key,label])=>(
            <button key={key} onClick={()=>setPage(key)} style={{ background:"transparent",color:page===key?"#18284e":"#5f6c8f",border:"none",padding:"6px 4px",fontFamily:FONT_T,fontWeight:800,fontSize:14,cursor:"pointer",borderBottom:page===key?"3px solid #18284e":"3px solid transparent" }}>{label}</button>
          ))}
          <button className="hh-nav-cart" onClick={()=>setShowCart(true)} style={{ position:"relative",background:"#18284e",color:"#fff",border:"none",borderRadius:999,padding:"10px 20px",fontFamily:FONT_T,fontWeight:800,fontSize:14,cursor:"pointer",flexShrink:0 }}>
            Giỏ hàng
            {cartCount>0&&<span style={{ position:"absolute",top:-6,right:-6,background:"#8f9fe8",color:"#18284e",borderRadius:12,minWidth:20,height:20,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900 }}>{cartCount}</span>}
          </button>
        </div>
      </nav>

      <div style={{ paddingBottom:60 }}>
        <style>{`
          @keyframes hpPop{ from{ opacity:0; transform:translateY(16px) scale(0.97) } to{ opacity:1; transform:none } }
          @media (max-width:820px){ .hp-sku{ grid-template-columns:1fr !important; direction:ltr !important } .hp-sku>div:first-child{ min-height:0 !important; height:auto !important; padding:24px 0 !important } .hp-sku-mainimg{ max-height:250px !important; max-width:60% !important } }
          @media (prefers-reduced-motion: reduce){ *{ animation:none !important; transition:none !important } }
        `}</style>
        {page==="shop"&&(()=>{
          const mistyP = products.find(pp=>/misty|khử mùi|xịt/.test(norm(pp.name)));
          const wbsP   = products.find(pp=>/bubble|shampoo|tắm/.test(norm(pp.name)));
          const rest   = products.filter(pp=>pp!==mistyP&&pp!==wbsP);
          return (
          <>
            <Hero brand={brand} products={products} hasMisty={!!mistyP} hasWbs={!!wbsP} />
            {banners.length>0&&<div style={{ maxWidth:1200,margin:"14px auto 0",padding:"0 14px" }}><BannerCarousel banners={banners} brand={brand} /></div>}
            <div style={{ height:14 }} />
            {mistyP&&<SkuBlock id="sku-misty" product={mistyP} brand={brand} onAdd={addToCart} onDetail={setSelProd} />}
            {wbsP&&<SkuBlock id="sku-wbs" product={wbsP} brand={brand} onAdd={addToCart} onDetail={setSelProd} flip />}
            {rest.map((pp,i)=><SkuBlock key={pp.id} id={"sku-"+pp.id} product={pp} brand={brand} onAdd={addToCart} onDetail={setSelProd} flip={(i+(mistyP?1:0)+(wbsP?1:0))%2===1} />)}

            {/* trust strip */}
            <Reveal>
            <div style={{ maxWidth:1200,margin:"0 auto",padding:"44px 24px 6px",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:10 }}>
              {trustBar.map(t=>(
                <div key={t.id} style={{ display:"flex",alignItems:"center",gap:12,padding:"16px 18px",background:"#fff",border:"1px solid #e6eaf4",borderRadius:20 }}>
                  <span style={{ fontSize:22 }}>{t.icon}</span>
                  <div>
                    <div style={{ fontFamily:FONT_T,fontWeight:800,fontSize:13,color:"#18284e" }}>{t.title}</div>
                    <div style={{ fontFamily:FONT_B,fontSize:11,color:"#5f6c8f" }}>{t.sub}</div>
                  </div>
                </div>
              ))}
            </div>
            </Reveal>

            {/* about strip */}
            <Reveal>
            <div style={{ maxWidth:1200,margin:"36px auto 0",padding:"0 24px",textAlign:"center" }}>
              <h3 style={{ fontFamily:FONT_T,fontWeight:900,fontSize:"clamp(24px,3vw,34px)",color:"#18284e",margin:"0 0 12px" }}>{about.heading}</h3>
              <p style={{ fontFamily:FONT_B,fontSize:15,lineHeight:1.9,color:"#3c4664",maxWidth:640,margin:"0 auto",whiteSpace:"pre-line" }}>{about.body}</p>
            </div>
            </Reveal>
          </>
          );
        })()}

        {page==="about"&&(
          <>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:32,alignItems:"center",marginBottom:48 }}>
              <div>
                <div style={{ fontFamily:FONT_B,fontSize:12,color:brand.primary,letterSpacing:3,textTransform:"uppercase",marginBottom:12 }}>Về {brand.name}</div>
                <h1 style={{ fontFamily:FONT_T,fontSize:44,color:"#0d142e",margin:"0 0 16px",lineHeight:1.1 }}>{about.heading}</h1>
                <p style={{ fontFamily:FONT_B,fontSize:15,color:"#131c3d",lineHeight:1.9 }}>{about.body}</p>
              </div>
              <div style={{ background:"#f2f5fb",borderRadius:20,overflow:"hidden",height:320,display:"flex",alignItems:"center",justifyContent:"center" }}>
                {banners[0]?.img?<ResponsiveImg src={banners[0].img} srcMobile={banners[0].imgMobile} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }} />:<div style={{ fontSize:80 }}>🐾</div>}
              </div>
            </div>
            <div style={{ background:"#fff",borderRadius:20,padding:36,border:"2px solid #dbe2f1" }}>
              <div style={{ fontFamily:FONT_T,fontSize:22,color:"#0d142e",marginBottom:20 }}>{about.socialHeading}</div>
              <div style={{ display:"flex",gap:12,flexWrap:"wrap" }}>
                {socials.map(s=>(
                  <a key={s.id} href={s.url||"#"} target="_blank" rel="noreferrer" style={{ display:"flex",alignItems:"center",gap:10,background:s.color+"18",border:`2px solid ${s.color}44`,borderRadius:30,padding:"10px 20px",textDecoration:"none",color:s.color,fontFamily:FONT_T,fontSize:13,fontWeight:700 }}>
                    <span style={{ fontWeight:800 }}>{s.icon}</span> {s.name}
                  </a>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* FOOTER */}
      {popup.enabled && <PromoWidget cfg={popup} brand={brand} />}

      <footer style={{ position:"relative", background:footer.bg||"#0d142e", padding:"40px 24px 28px", textAlign:"center", overflow:"hidden" }}>
        {(footer.bgImg||footer.bgImgMobile)&&<>
          <ResponsiveImg src={footer.bgImg} srcMobile={footer.bgImgMobile} alt="" style={{ position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",zIndex:0 }} />
          <div style={{ position:"absolute",inset:0,background:`linear-gradient(to top, ${footer.bg||"#0d142e"}ee, ${footer.bg||"#0d142e"}cc)`,zIndex:1 }} />
        </>}
        <div style={{ position:"relative",zIndex:2 }}>
        {/* Logo */}
        {footer.logoImg
          ? <img src={footer.logoImg} alt={brand.name} style={{ height:56,objectFit:"contain",marginBottom:10 }} />
          : <img src="/logo-white.png" alt={brand.name} style={{ height:56,objectFit:"contain",marginBottom:10 }} />
        }
        <div style={{ fontFamily:FONT_T,fontSize:22,color:footer.brandColor||brand.primary,marginTop:8 }}>{brand.name}</div>
        <div style={{ fontFamily:FONT_B,fontSize:13,color:footer.subtitleColor||"rgba(255,255,255,0.45)",marginTop:4 }}>{brand.tagline} · {footer.city}</div>
        {/* Social icons */}
        <div style={{ display:"flex",justifyContent:"center",gap:10,marginTop:16 }}>
          {socials.map(s=>(
            <a key={s.id} href={s.url||"#"} target="_blank" rel="noreferrer" style={{ width:38,height:38,borderRadius:19,background:s.color+"22",border:`1px solid ${s.color}44`,display:"flex",alignItems:"center",justifyContent:"center",color:s.color,fontWeight:800,textDecoration:"none",fontFamily:FONT_T,fontSize:12 }}>{s.icon}</a>
          ))}
        </div>
        {/* Quick links */}
        {(footer.links||[]).length>0&&(
          <div style={{ display:"flex",justifyContent:"center",gap:8,marginTop:14,flexWrap:"wrap" }}>
            {(footer.links||[]).map((l,i)=>(
              <a key={i} href={l.url||"#"} style={{ fontFamily:FONT_B,fontSize:12,color:footer.brandColor||brand.primary,textDecoration:"none",padding:"4px 12px",border:`1px solid ${(footer.brandColor||brand.primary)}44`,borderRadius:20,transition:"all 0.2s" }}>{l.label}</a>
            ))}
          </div>
        )}
        {/* Divider */}
        <div style={{ width:60,height:1,background:"rgba(255,255,255,0.08)",margin:"18px auto" }} />
        <div style={{ fontFamily:FONT_B,fontSize:11,color:"rgba(255,255,255,0.18)" }}>© 2025 {brand.name} · {footer.tagline2}</div>
        </div>
      </footer>

      {/* MODALS */}
      {selProd    && <ProductModal product={selProd} brand={brand} onClose={()=>setSelProd(null)} onAdd={addToCart} />}
      {showCart   && <CartDrawer cart={cart} brand={brand} vouchers={vouchers} onClose={()=>setShowCart(false)} onRemove={removeFromCart} onQty={updateQty} onOrderComplete={()=>setCart([])} />}
    </div>
  );
}
