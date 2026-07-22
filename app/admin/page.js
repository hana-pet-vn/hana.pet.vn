'use client'
// app/admin/page.js — Full-screen admin dashboard with all CMS controls
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  supabase, adminSignOut,
  getProducts, upsertProduct, deleteProduct, updateProductStock, saveProductOrder,
  getOrders, updateOrderDB, restockOrder,
  getAllConfigs, setConfig as setSupabaseConfig,
  getCategories, saveCategories, getVouchers, saveVouchers,
  addSubscriber,
} from '../../lib/supabase'

const FONT_T = "'Baloo 2','Be Vietnam Pro','Segoe UI',sans-serif"
const FONT_B = "'Be Vietnam Pro','Segoe UI',sans-serif"
const PRIMARY_DEFAULT = '#1b295b'


// ─── STORAGE — backed by Supabase ────────────────────────────────────────────
// usePersist still works for local-only UI state. Categories are now saved to Supabase (see TabCats).
// Main data (products, orders, configs) load from Supabase in App
function usePersist(key, def) {
  const [v, setV]   = useState(def);
  const [ok, setOk] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setV(JSON.parse(raw));
    } catch(_) {}
    setOk(true);
  }, [key]);
  const save = useCallback((next) => {
    const val = typeof next === "function" ? next(v) : next;
    setV(val);
    try { localStorage.setItem(key, JSON.stringify(val)); } catch(_) {}
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
// ── Freeform crop modal (pure canvas, no external lib) ───────────────────────
function CropModal({ src, onCancel, onDone }) {
  const imgRef = useRef(null);
  const [dim, setDim]   = useState(null);   // {w,h} rendered image size
  const [rect, setRect] = useState(null);   // {x,y,w,h} in rendered px, origin = image top-left
  const drag = useRef(null);

  const onImgLoad = () => {
    const el = imgRef.current;
    const w = el.clientWidth, h = el.clientHeight;
    setDim({ w, h });
    // Default a bit zoomed-in (trims ~8% edges) so stray borders/corners get cropped out
    setRect({ x: w*0.08, y: h*0.08, w: w*0.84, h: h*0.84 });
  };
  const selectAll = () => { if(dim) setRect({ x:0, y:0, w:dim.w, h:dim.h }); };

  const pointer = e => (e.touches && e.touches[0]) ? e.touches[0] : e;

  const startDrag = (mode, e) => {
    e.preventDefault(); e.stopPropagation();
    const pt = pointer(e);
    drag.current = { mode, sx: pt.clientX, sy: pt.clientY, orig: { ...rect } };
  };
  const onMove = (e) => {
    if (!drag.current || !dim) return;
    const pt = pointer(e);
    const dx = pt.clientX - drag.current.sx;
    const dy = pt.clientY - drag.current.sy;
    const o = drag.current.orig;
    const M = dim, MIN = 30;
    let { x, y, w, h } = o;
    const mode = drag.current.mode;
    if (mode === 'move') {
      x = Math.max(0, Math.min(M.w - w, o.x + dx));
      y = Math.max(0, Math.min(M.h - h, o.y + dy));
    } else if (mode === 'se') {
      w = Math.max(MIN, Math.min(M.w - o.x, o.w + dx));
      h = Math.max(MIN, Math.min(M.h - o.y, o.h + dy));
    } else if (mode === 'sw') {
      const nx = Math.max(0, Math.min(o.x + o.w - MIN, o.x + dx));
      w = o.w + (o.x - nx); x = nx;
      h = Math.max(MIN, Math.min(M.h - o.y, o.h + dy));
    } else if (mode === 'ne') {
      const ny = Math.max(0, Math.min(o.y + o.h - MIN, o.y + dy));
      h = o.h + (o.y - ny); y = ny;
      w = Math.max(MIN, Math.min(M.w - o.x, o.w + dx));
    } else if (mode === 'nw') {
      const nx = Math.max(0, Math.min(o.x + o.w - MIN, o.x + dx));
      const ny = Math.max(0, Math.min(o.y + o.h - MIN, o.y + dy));
      w = o.w + (o.x - nx); x = nx;
      h = o.h + (o.y - ny); y = ny;
    }
    setRect({ x, y, w, h });
  };
  const endDrag = () => { drag.current = null; };

  const apply = () => {
    const el = imgRef.current;
    const scaleX = el.naturalWidth / el.clientWidth;
    const scaleY = el.naturalHeight / el.clientHeight;
    const cw = rect.w * scaleX, ch = rect.h * scaleY;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(cw); canvas.height = Math.round(ch);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(el, rect.x*scaleX, rect.y*scaleY, cw, ch, 0, 0, cw, ch);
    canvas.toBlob((blob) => {
      if (blob) onDone(new File([blob], 'cropped.png', { type: 'image/png' }));
    }, 'image/png');
  };

  const handle = (mode, pos) => (
    <div onMouseDown={e=>startDrag(mode,e)} onTouchStart={e=>startDrag(mode,e)}
      style={{ position:'absolute', ...pos, width:20, height:20, borderRadius:'50%', background:'#18284e', border:'2px solid #fff', boxShadow:'0 2px 6px rgba(0,0,0,0.3)', touchAction:'none' }} />
  );

  return (
    <div onMouseMove={onMove} onMouseUp={endDrag} onMouseLeave={endDrag} onTouchMove={onMove} onTouchEnd={endDrag}
      style={{ position:'fixed', inset:0, background:'rgba(10,16,38,0.75)', zIndex:6000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'#fff', borderRadius:20, padding:20, maxWidth:520, width:'100%' }}>
        <div style={{ fontFamily:FONT_T, fontSize:15, color:'#0d142e', marginBottom:4 }}>✂️ Cắt ảnh (kéo tự do)</div>
        <div style={{ fontFamily:FONT_B, fontSize:12, color:'#5f6c8f', marginBottom:12 }}>Kéo 4 góc để đổi kích thước · kéo giữa khung để di chuyển · hoặc bấm "Chọn toàn bộ ảnh".</div>
        <div style={{ position:'relative', userSelect:'none', touchAction:'none', lineHeight:0, background:'#f4f4f4', borderRadius:10, overflow:'hidden', width:'fit-content', margin:'0 auto' }}>
          <img ref={imgRef} src={src} onLoad={onImgLoad} alt="" draggable={false} style={{ maxWidth:'100%', maxHeight:'55vh', display:'block' }} />
          {rect && (
            <div onMouseDown={e=>startDrag('move',e)} onTouchStart={e=>startDrag('move',e)}
              style={{ position:'absolute', left:rect.x, top:rect.y, width:rect.w, height:rect.h, border:'2px solid #18284e', boxShadow:'0 0 0 9999px rgba(0,0,0,0.45)', cursor:'move', boxSizing:'border-box', touchAction:'none' }}>
              {handle('nw', { left:-10, top:-10, cursor:'nwse-resize' })}
              {handle('ne', { right:-10, top:-10, cursor:'nesw-resize' })}
              {handle('sw', { left:-10, bottom:-10, cursor:'nesw-resize' })}
              {handle('se', { right:-10, bottom:-10, cursor:'nwse-resize' })}
            </div>
          )}
        </div>
        <div style={{ display:'flex', gap:10, marginTop:16 }}>
          <button onClick={apply} style={{ flex:1, background:'#18284e', color:'#fff', border:'none', borderRadius:12, padding:'12px 0', fontFamily:FONT_T, fontSize:14, cursor:'pointer' }}>✓ Xong</button>
          <button onClick={selectAll} style={{ background:'#f2f5fb', color:'#18284e', border:'2px solid #dbe2f1', borderRadius:12, padding:'12px 16px', fontFamily:FONT_T, fontSize:13, cursor:'pointer', whiteSpace:'nowrap' }}>⤢ Toàn bộ</button>
          <button onClick={onCancel} style={{ background:'#f2f5fb', color:'#5f6c8f', border:'2px solid #dbe2f1', borderRadius:12, padding:'12px 20px', fontFamily:FONT_T, fontSize:14, cursor:'pointer' }}>Huỷ</button>
        </div>
      </div>
    </div>
  );
}

function ImgUp({ current, onUpload, label="Ảnh", aspect="100%", folder="products", entityId="general", hint="" }) {
  const [drag,   setDrag]    = useState(false);
  const [loading,setLoading] = useState(false);
  const [error,  setError]   = useState("");
  const [cropSrc,setCropSrc] = useState(null);   // object URL of image awaiting crop
  const inp = useRef();

  // When a file is picked/dropped, show the crop modal first —
  // except GIFs, which skip cropping so their animation is preserved.
  const pickFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setError("");
    if (file.type === "image/gif") { upload(file); return; }
    setCropSrc(URL.createObjectURL(file));
  };

  const upload = async (file) => {
    if (!file) return;
    setLoading(true); setError("");
    try {
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
      {label && <div style={{ fontSize:12,fontFamily:FONT_T,color:"#888",marginBottom:2 }}>{label}</div>}
      {hint && <div style={{ fontSize:10,fontFamily:FONT_B,color:"#5f6c8f",marginBottom:6 }}>💡 Tỷ lệ khuyến nghị: {hint}</div>}
      {cropSrc && <CropModal src={cropSrc} onCancel={()=>{ URL.revokeObjectURL(cropSrc); setCropSrc(null); }} onDone={(file)=>{ URL.revokeObjectURL(cropSrc); setCropSrc(null); upload(file); }} />}
      <div
        onDragOver={e=>{e.preventDefault();setDrag(true);}}
        onDragLeave={()=>setDrag(false)}
        onDrop={e=>{e.preventDefault();setDrag(false);pickFile(e.dataTransfer.files[0]);}}
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
        <input ref={inp} type="file" accept="image/*" style={{ display:"none" }} onChange={e=>pickFile(e.target.files[0])} />
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
  const [saving,setSaving] = useState(false);
  const [err,   setErr]    = useState(null);
  const click = async () => {
    setSaving(true); setErr(null);
    try { await onSave(); }
    catch(e) { setErr(e?.message || "Lưu thất bại — vui lòng thử lại"); }
    finally { setSaving(false); }
  };
  return (
    <div>
      <button disabled={saving} onClick={click} style={{ background:"#1b295b",color:"#fff",border:"none",borderRadius:10,padding:"10px 24px",fontFamily:FONT_T,fontSize:13,cursor:saving?"not-allowed":"pointer",marginTop:20,opacity:saving?0.7:1 }}>
        {saving?"⏳ Đang lưu...":saved?"✅ Đã lưu!":"💾 Lưu"}
      </button>
      {err && <div style={{ marginTop:8,padding:"8px 12px",borderRadius:8,fontFamily:FONT_B,fontSize:12,background:"#fdeeee",color:"#d64545",border:"1px solid #f0c4c4",maxWidth:420 }}>❌ {err}</div>}
    </div>
  );
}

// ─── BANNER CAROUSEL ──────────────────────────────────────────────────────────
function BannerCarousel({ banners, brand }) {
  const [i,setI]=useState(0);
  useEffect(()=>{ const t=setInterval(()=>setI(x=>(x+1)%banners.length),5000); return()=>clearInterval(t); },[banners.length]);
  if(!banners.length) return null;
  const b=banners[i];
  return (
    <div style={{ position:"relative",borderRadius:20,overflow:"hidden",marginBottom:28,boxShadow:`0 8px 40px rgba(27,41,91,0.25)`,minHeight:280,background:b.bg||brand.primary }}>
      {b.img&&<img src={b.img} alt="" style={{ position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover" }} />}
      <div style={{ position:"absolute",inset:0,background:"linear-gradient(90deg,rgba(10,16,38,0.75) 0%,rgba(10,16,38,0.1) 65%,transparent 100%)" }} />
      <div style={{ position:"absolute",bottom:0,left:0,padding:"32px 40px" }}>
        <div style={{ fontFamily:FONT_T,fontSize:40,fontWeight:700,color:"#fff",lineHeight:1.1,textShadow:"0 2px 12px rgba(0,0,0,0.5)",marginBottom:6 }}>{b.title}</div>
        <div style={{ fontFamily:FONT_B,fontSize:15,color:"rgba(255,255,255,0.85)",marginBottom:16 }}>{b.sub}</div>
        <button style={{ background:brand.primary,color:"#fff",border:"none",borderRadius:12,padding:"11px 26px",fontFamily:FONT_T,fontSize:14,fontWeight:700,cursor:"pointer" }}>{b.cta} →</button>
      </div>
      <div style={{ position:"absolute",bottom:14,right:18,display:"flex",gap:6 }}>
        {banners.map((_,x)=><button key={x} onClick={()=>setI(x)} style={{ width:x===i?22:8,height:8,borderRadius:4,background:x===i?"#fff":"rgba(255,255,255,0.4)",border:"none",cursor:"pointer",transition:"all 0.3s",padding:0 }} />)}
      </div>
    </div>
  );
}

// ─── PRODUCT CARD ─────────────────────────────────────────────────────────────
function ProductCard({ product:p, brand, onClick, onAdd }) {
  const [hov,setHov]=useState(false);
  const d=pct(p.price,p.original);
  return (
    <div onClick={()=>onClick(p)} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ background:"#fff",borderRadius:20,overflow:"hidden",cursor:"pointer",border:`2px solid ${hov?brand.primary:"#dbe2f1"}`,boxShadow:hov?`0 12px 32px rgba(27,41,91,0.25)`:`0 4px 16px rgba(27,41,91,0.1)`,transform:hov?"translateY(-6px)":"none",transition:"all 0.25s cubic-bezier(0.34,1.56,0.64,1)" }}>
      <div style={{ position:"relative",paddingTop:"100%",background:"#f2f5fb",overflow:"hidden" }}>
        {p.img
          ? <img src={p.img} alt="" style={{ position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",transform:hov?"scale(1.07)":"scale(1)",transition:"transform 0.3s" }} />
          : <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:52 }}>📦</div>
        }
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
            <span style={{ fontFamily:FONT_T,fontSize:19,fontWeight:700,color:brand.primary }}>{fmt(p.price)}</span>
            {d>0&&<span style={{ fontFamily:FONT_B,fontSize:12,color:"#5f6c8f",textDecoration:"line-through",marginLeft:6 }}>{fmt(p.original)}</span>}
          </div>
          <button onClick={e=>{e.stopPropagation();onAdd(p);}} style={{ background:brand.primary,color:"#fff",border:"none",borderRadius:10,padding:"8px 14px",fontFamily:FONT_T,fontSize:13,cursor:"pointer" }}>+ Cart</button>
        </div>
      </div>
    </div>
  );
}

// ─── PRODUCT MODAL ────────────────────────────────────────────────────────────
function ProductModal({ product:p, brand, onClose, onAdd }) {
  const [qty,setQty]=useState(1); const [tab,setTab]=useState("story");
  const d=pct(p.price,p.original);
  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(10,16,38,0.7)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(6px)" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#fff",borderRadius:24,maxWidth:860,width:"100%",maxHeight:"92vh",overflow:"auto" }}>
        <div className="hh-admin-grid2" style={{ display:"grid",gridTemplateColumns:"1fr 1fr" }}>
          <div style={{ position:"relative",minHeight:400,background:"#f2f5fb",borderRadius:"24px 0 0 24px",overflow:"hidden" }}>
            {p.img?<img src={p.img} alt="" style={{ width:"100%",height:"100%",objectFit:"cover",position:"absolute",inset:0 }} />:<div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:80 }}>📦</div>}
            {p.flashSale&&<div style={{ position:"absolute",top:16,left:16 }}><FlashTimer end={p.flashEnd} /></div>}
          </div>
          <div style={{ padding:32 }}>
            <button onClick={onClose} style={{ float:"right",background:"#f2f5fb",border:"none",borderRadius:50,width:32,height:32,cursor:"pointer",color:"#5f6c8f",fontSize:16 }}>✕</button>
            <Tag text={p.category} color={brand.primary} />
            <h2 style={{ fontFamily:FONT_T,fontSize:26,color:"#0d142e",margin:"10px 0 4px" }}>{p.name}</h2>
            <Stars rating={p.rating} size={15} />
            <span style={{ fontFamily:FONT_B,fontSize:12,color:"#5f6c8f",marginLeft:6 }}>· only {p.stock} items</span>
            <div style={{ display:"flex",margin:"20px 0 16px",border:"2px solid #dbe2f1",borderRadius:12,overflow:"hidden" }}>
              {[["story","📖 Story"],["specs","⚙️ Details"],["reviews","💬 Reviews"]].map(([k,l])=>(
                <button key={k} onClick={()=>setTab(k)} style={{ flex:1,padding:"8px 4px",background:tab===k?brand.primary:"transparent",color:tab===k?"#fff":"#5f6c8f",border:"none",fontFamily:FONT_T,fontSize:12,cursor:"pointer",transition:"all 0.2s" }}>{l}</button>
              ))}
            </div>
            {tab==="story"&&<p style={{ fontFamily:FONT_B,fontSize:14,color:"#131c3d",lineHeight:1.8,whiteSpace:"pre-line",background:"#f2f5fb",borderLeft:`4px solid ${brand.primary}`,padding:"12px 16px",borderRadius:"0 10px 10px 0",margin:0 }}>{p.story||"No story yet."}</p>}
            {tab==="specs"&&<div>{[["Tags",(p.tags||"—").split(",")[0]],["Kho hàng",`${p.stock} items`],["Danh mục",p.category]].map(([k,v])=>(
              <div key={k} style={{ display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #dbe2f1",fontFamily:FONT_B,fontSize:13 }}><span style={{ color:"#5f6c8f" }}>{k}</span><span style={{ color:brand.primary,fontWeight:700 }}>{v}</span></div>
            ))}</div>}
            {tab==="reviews"&&(p.reviews||[]).map((r,i)=>(
              <div key={i} style={{ padding:"12px 0",borderBottom:"1px solid #dbe2f1" }}>
                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}><span style={{ fontFamily:FONT_T,fontSize:13,color:brand.primary }}>{r.user}</span><span style={{ fontSize:11,color:"#5f6c8f" }}>{r.date}</span></div>
                <Stars rating={r.rating} size={12} />
                <p style={{ fontFamily:FONT_B,fontSize:13,color:"#131c3d",margin:"6px 0 0" }}>{r.text}</p>
              </div>
            ))}
            <div style={{ marginTop:24,padding:20,background:"#f2f5fb",borderRadius:16,border:"2px solid #dbe2f1" }}>
              <div style={{ display:"flex",alignItems:"baseline",gap:12,marginBottom:16 }}>
                <span style={{ fontFamily:FONT_T,fontSize:28,fontWeight:700,color:brand.primary }}>{fmt(p.price*qty)}</span>
                {d>0&&<span style={{ fontFamily:FONT_B,fontSize:14,color:"#5f6c8f",textDecoration:"line-through" }}>{fmt(p.original*qty)}</span>}
              </div>
              <div style={{ display:"flex",gap:12 }}>
                <div style={{ display:"flex",alignItems:"center",border:"2px solid #dbe2f1",borderRadius:12,overflow:"hidden",background:"#fff" }}>
                  <button onClick={()=>setQty(q=>Math.max(1,q-1))} style={{ width:38,height:44,background:"none",border:"none",fontSize:20,cursor:"pointer",color:brand.primary,fontWeight:700 }}>−</button>
                  <span style={{ width:36,textAlign:"center",fontFamily:FONT_T,fontSize:16,fontWeight:700 }}>{qty}</span>
                  <button onClick={()=>setQty(q=>Math.min(p.stock,q+1))} style={{ width:38,height:44,background:"none",border:"none",fontSize:20,cursor:"pointer",color:brand.primary,fontWeight:700 }}>+</button>
                </div>
                <button onClick={()=>{onAdd(p,qty);onClose();}} style={{ flex:1,background:brand.primary,color:"#fff",border:"none",borderRadius:12,fontFamily:FONT_T,fontWeight:700,fontSize:15,cursor:"pointer" }}>🛒 Add to Cart</button>
              </div>
            </div>
          </div>
        </div>
      </div>
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
      <div><b>CUSTOMER</b><br>${order.customer.name}<br>${order.customer.phone}<br>${order.customer.address}</div>
      <div><b>SHIPPING</b><br>🚚 GHN / GHTK<br>Est. 1–3 days delivery${order.voucher?`<br>🎟 Code: ${order.voucher}`:""}</div>
    </div>
    <table><thead><tr><th>#</th><th>PRODUCT</th><th>SL</th><th>UNIT PRICE</th><th>AMOUNT</th></tr></thead><tbody>
    ${order.items.map((it,i)=>`<tr><td>${i+1}</td><td>${it.product.name}</td><td>${it.qty}</td><td>${fmt(it.product.price)}</td><td>${fmt(it.product.price*it.qty)}</td></tr>`).join("")}
    ${order.discount>0?`<tr><td colspan="4" style="text-align:right;color:#27ae60">Discount (${order.discPct}%)</td><td style="color:#27ae60">-${fmt(order.discount)}</td></tr>`:""}
    <tr class="tot"><td colspan="4" style="text-align:right">GRAND TOTAL</td><td>${fmt(order.total)}</td></tr>
    </tbody></table>
    <div style="margin-top:32px;text-align:center;color:#5f6c8f;font-size:12px">Thank you for shopping at ${brand.name} 🐾 · ${brand.tagline}</div>
    </body></html>`);
    w.document.close(); w.print();
  };
  const sub=order.items.reduce((s,i)=>s+i.product.price*i.qty,0);
  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(10,16,38,0.75)",zIndex:2500,display:"flex",alignItems:"center",justifyContent:"center",padding:20,backdropFilter:"blur(8px)" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#fff",borderRadius:24,maxWidth:660,width:"100%",maxHeight:"90vh",overflow:"auto",boxShadow:"0 24px 80px rgba(27,41,91,0.3)" }}>
        <div style={{ background:"linear-gradient(135deg,#1b295b,#2e4390)",padding:"28px 32px",borderRadius:"24px 24px 0 0",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div style={{ display:"flex",alignItems:"center",gap:14 }}>
            <HHLogo primary="#fff" size={44} />
            <div>
              <div style={{ fontFamily:FONT_T,fontSize:20,color:"#fff",fontWeight:700 }}>{brand.name}</div>
              <div style={{ fontFamily:FONT_B,fontSize:12,color:"rgba(255,255,255,0.8)" }}>{brand.tagline}</div>
            </div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontFamily:FONT_B,fontSize:11,color:"rgba(255,255,255,0.7)",letterSpacing:2 }}>INVOICE</div>
            <div style={{ fontFamily:FONT_T,fontSize:24,color:"#fff",fontWeight:700 }}>{order.code}</div>
            <div style={{ fontFamily:FONT_B,fontSize:12,color:"rgba(255,255,255,0.8)" }}>{order.date}</div>
          </div>
        </div>
        <div style={{ padding:"28px 32px" }}>
          <div className="hh-admin-grid2" style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:24 }}>
            {[["CUSTOMER",[order.customer.name,order.customer.phone,order.customer.address]],["SHIPPING",["🚚 GHN / GHTK","Est. 1–3 days delivery",order.voucher?`🎟 ${order.voucher}`:""].filter(Boolean)]].map(([title,lines])=>(
              <div key={title} style={{ padding:16,background:"#f2f5fb",borderRadius:12,border:"2px solid #dbe2f1" }}>
                <div style={{ fontFamily:FONT_T,fontSize:11,color:"#5f6c8f",letterSpacing:2,marginBottom:10 }}>{title}</div>
                {lines.map((l,i)=><div key={i} style={{ fontFamily:i===0?FONT_T:FONT_B,fontSize:i===0?15:13,color:i===0?"#0d142e":"#4a5573",marginBottom:i===0?4:2 }}>{l}</div>)}
              </div>
            ))}
          </div>
          <div style={{ border:"2px solid #dbe2f1",borderRadius:14,overflow:"hidden",marginBottom:20 }}>
            <div style={{ display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",background:"#f2f5fb",padding:"10px 16px" }}>
              {["PRODUCT","SL","UNIT PRICE","AMOUNT"].map(h=><div key={h} style={{ fontFamily:FONT_T,fontSize:11,color:"#5f6c8f",letterSpacing:1 }}>{h}</div>)}
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
            <div style={{ display:"flex",gap:32,fontFamily:FONT_B,fontSize:14,color:"#5f6c8f" }}><span>Subtotal:</span><span>{fmt(sub)}</span></div>
            {order.discount>0&&<div style={{ display:"flex",gap:32,fontFamily:FONT_B,fontSize:14,color:"#27ae60" }}><span>Discount ({order.discPct}%):</span><span>-{fmt(order.discount)}</span></div>}
            <div style={{ display:"flex",gap:32,fontFamily:FONT_T,fontSize:22,color:"#1b295b",fontWeight:700,borderTop:"2px solid #dbe2f1",paddingTop:10,marginTop:4 }}><span>GRAND TOTAL:</span><span>{fmt(order.total)}</span></div>
          </div>
          <div style={{ marginTop:20,padding:16,background:"#f2f5fb",borderRadius:12,border:"2px solid #dbe2f1",textAlign:"center" }}>
            <div style={{ fontFamily:FONT_B,fontSize:13,color:"#4a5573" }}>Thank you for shopping at <strong>{brand.name}</strong> 🐾</div>
            <div style={{ fontFamily:FONT_B,fontSize:12,color:"#5f6c8f",marginTop:4 }}>7-day returns · {brand.tagline}</div>
          </div>
          <div style={{ display:"flex",gap:12,marginTop:20 }}>
            <button onClick={print} style={{ flex:1,background:"#0d142e",color:"#ffffff",border:"none",borderRadius:12,padding:"13px 0",fontFamily:FONT_T,fontSize:14,cursor:"pointer",fontWeight:700 }}>🖨 Print / Save PDF</button>
            <button onClick={onClose} style={{ flex:1,background:"#f2f5fb",color:"#5f6c8f",border:"2px solid #dbe2f1",borderRadius:12,padding:"13px 0",fontFamily:FONT_T,fontSize:14,cursor:"pointer",fontWeight:700 }}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}


// ─── CART DRAWER ──────────────────────────────────────────────────────────────

function CartDrawer({ cart, brand, vouchers, onClose, onRemove, onQty, onOrderComplete }) {
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

  const vMap = Object.fromEntries((vouchers || []).map(v => [v.code.toUpperCase(), v.pct]));

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
      setFeeNote(data.estimatedDays ? `Est. ${data.estimatedDays} days — ${data.provider || 'GHN'}` : data.note || '');
    } catch (_) {
      setShippingFee(30000);
      setFeeNote('Estimated fee');
    } finally {
      setFeeLoading(false);
    }
  };

  // ── Place order (server-side) ────────────────────────────────────────────────
  const place = async () => {
    if (!form.name || !form.phone || !form.address || !form.provinceId || !form.districtId || !form.wardCode) {
      alert('Please fill in all address fields including ward.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(i => ({ productId: i.product.id, qty: i.qty })),
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
      if (!data.success) throw new Error(data.error || 'Order failed');

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
      alert('Order error: ' + e.message);
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
            🛒 Cart ({cart.reduce((s, i) => s + i.qty, 0)})
          </span>
          <button onClick={onClose} style={{ background: brand.primary + '22', border: 'none', borderRadius: 8, padding: '6px 12px', color: brand.primary, cursor: 'pointer', fontFamily: FONT_T, fontWeight: 700, fontSize: 13 }}>✕</button>
        </div>

        <div style={{ flex: 1, padding: 20 }}>
          {step === 'cart' ? (
            cart.length === 0
              ? <div style={{ textAlign: 'center', paddingTop: 80 }}>
                  <div style={{ fontSize: 56 }}>🛒</div>
                  <div style={{ fontFamily: FONT_T, fontSize: 18, color: '#5f6c8f', marginTop: 12 }}>Your cart is empty!</div>
                </div>
              : <>
                  {cart.map(it => (
                    <div key={it.product.id} style={{ display: 'flex', gap: 12, marginBottom: 14, padding: 14, background: '#f8fafd', borderRadius: 14, border: '1px solid #dbe2f1' }}>
                      <div style={{ width: 68, height: 68, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: '#f2f5fb' }}>
                        {it.product.img
                          ? <img src={it.product.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>📦</div>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: FONT_T, fontSize: 13, color: '#0d142e', marginBottom: 4 }}>{it.product.name}</div>
                        <div style={{ fontFamily: FONT_T, fontSize: 14, color: brand.primary, fontWeight: 700 }}>{fmt(it.product.price)}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                          <button onClick={() => onQty(it.product.id, it.qty - 1)} style={{ width: 26, height: 26, borderRadius: 8, background: '#f2f5fb', border: '1px solid #dbe2f1', color: brand.primary, cursor: 'pointer', fontWeight: 700 }}>−</button>
                          <span style={{ fontFamily: FONT_T, fontWeight: 700, fontSize: 14, minWidth: 20, textAlign: 'center' }}>{it.qty}</span>
                          <button onClick={() => onQty(it.product.id, it.qty + 1)} style={{ width: 26, height: 26, borderRadius: 8, background: '#f2f5fb', border: '1px solid #dbe2f1', color: brand.primary, cursor: 'pointer', fontWeight: 700 }}>+</button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                        <div style={{ fontFamily: FONT_T, fontWeight: 700, color: brand.primary }}>{fmt(it.product.price * it.qty)}</div>
                        <button onClick={() => onRemove(it.product.id)} style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: 18 }}>🗑</button>
                      </div>
                    </div>
                  ))}

                  {/* Voucher */}
                  <div style={{ padding: 16, background: '#f2f5fb', borderRadius: 14, border: '2px dashed #dbe2f1', marginBottom: 16 }}>
                    <div style={{ fontFamily: FONT_T, fontSize: 13, color: brand.primary, marginBottom: 8 }}>🎟 Discount Code</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input value={vc} onChange={e => setVc(e.target.value)} placeholder="Enter code..." style={{ flex: 1, padding: '8px 12px', borderRadius: 10, border: '2px solid #dbe2f1', fontFamily: FONT_B, fontSize: 13 }} />
                      <button onClick={() => {
                        const p = vMap[vc.toUpperCase()];
                        if (p) { setDp(p); setVu(vc.toUpperCase()); setVm(`✅ Discount ${p}%!`); }
                        else { setVm('❌ Invalid code'); setDp(0); setVu(''); }
                      }} style={{ background: brand.primary, color: '#fff', border: 'none', borderRadius: 10, padding: '8px 14px', fontFamily: FONT_T, fontSize: 13, cursor: 'pointer' }}>Apply</button>
                    </div>
                    {vm && <div style={{ fontFamily: FONT_B, fontSize: 12, color: dp ? '#27ae60' : '#e74c3c', marginTop: 6 }}>{vm}</div>}
                  </div>

                  {/* Totals preview */}
                  {dp > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #dbe2f1' }}>
                    <span style={{ fontFamily: FONT_B, color: '#5f6c8f' }}>Discount ({dp}%)</span>
                    <span style={{ fontFamily: FONT_T, color: '#27ae60', fontWeight: 600 }}>-{fmt(da)}</span>
                  </div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontFamily: FONT_T, fontSize: 18 }}>
                    <span style={{ color: '#0d142e' }}>Subtotal</span>
                    <span style={{ color: brand.primary, fontWeight: 700 }}>{fmt(sub - da)}</span>
                  </div>
                </>
          ) : (
            /* ── CHECKOUT STEP ─────────────────────────────────────────── */
            <div>
              <div style={{ fontFamily: FONT_T, fontSize: 18, color: '#0d142e', marginBottom: 20 }}>Delivery Information</div>

              {/* Name + Phone */}
              {[['Full Name', 'name', 'text'], ['Phone Number', 'phone', 'tel'], ['Email (for receipt)', 'email', 'email']].map(([label, key, type]) => (
                <div key={key} style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>{label}</label>
                  <input type={type} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} style={inputStyle} />
                </div>
              ))}

              {/* Street address */}
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Street Address</label>
                <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="House number, street name..." style={inputStyle} />
              </div>

              {/* Province */}
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Province / City {geoLoading === 'provinces' && '⏳'}</label>
                <select onChange={handleProvinceChange} value={form.provinceId || ''} style={selectStyle}>
                  <option value="">— Select province —</option>
                  {provinces.map(p => (
                    <option key={p.ProvinceID} value={p.ProvinceID}>{p.ProvinceName}</option>
                  ))}
                </select>
              </div>

              {/* District */}
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>District {geoLoading === 'districts' && '⏳'}</label>
                <select onChange={handleDistrictChange} value={form.districtId || ''} disabled={!form.provinceId} style={{ ...selectStyle, opacity: form.provinceId ? 1 : 0.5 }}>
                  <option value="">— Select district —</option>
                  {districts.map(d => (
                    <option key={d.DistrictID} value={d.DistrictID}>{d.DistrictName}</option>
                  ))}
                </select>
              </div>

              {/* Ward */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Ward {geoLoading === 'wards' && '⏳'}</label>
                <select onChange={handleWardChange} value={form.wardCode || ''} disabled={!form.districtId} style={{ ...selectStyle, opacity: form.districtId ? 1 : 0.5 }}>
                  <option value="">— Select ward —</option>
                  {wards.map(w => (
                    <option key={w.WardCode} value={w.WardCode}>{w.WardName}</option>
                  ))}
                </select>
              </div>

              {/* Note */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Order Note (optional)</label>
                <input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="e.g. Leave at door" style={inputStyle} />
              </div>

              {/* Shipping fee + total summary */}
              <div style={{ background: '#f2f5fb', borderRadius: 14, padding: 16, border: '2px solid #dbe2f1' }}>
                <div style={{ fontFamily: FONT_T, fontSize: 13, color: brand.primary, marginBottom: 10, fontWeight: 700 }}>🚚 Shipping Fee</div>
                {feeLoading
                  ? <div style={{ fontFamily: FONT_B, fontSize: 13, color: '#5f6c8f' }}>⏳ Calculating...</div>
                  : shippingFee !== null
                    ? <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT_T, marginBottom: 4 }}>
                          <span style={{ color: '#5f6c8f' }}>Shipping:</span>
                          <span style={{ color: brand.primary, fontWeight: 700 }}>{fmt(shippingFee)}</span>
                        </div>
                        {feeNote && <div style={{ fontFamily: FONT_B, fontSize: 11, color: '#5f6c8f' }}>{feeNote}</div>}
                      </div>
                    : <div style={{ fontFamily: FONT_B, fontSize: 12, color: '#5f6c8f' }}>↑ Select ward to calculate shipping</div>
                }
                {dp > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: FONT_B, fontSize: 13 }}>
                  <span style={{ color: '#5f6c8f' }}>Discount ({dp}%):</span>
                  <span style={{ color: '#27ae60' }}>-{fmt(da)}</span>
                </div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTop: '1px solid #dbe2f1', fontFamily: FONT_T }}>
                  <span style={{ color: '#0d142e', fontSize: 15 }}>Total:</span>
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
              >Proceed to Checkout →</button>
            : <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setStep('cart')} style={{ flex: 1, background: '#f2f5fb', color: brand.primary, border: '2px solid #dbe2f1', borderRadius: 12, padding: '12px 0', fontFamily: FONT_T, fontWeight: 700, cursor: 'pointer' }}>← Back</button>
                <button
                  onClick={place}
                  disabled={saving || !form.wardCode}
                  style={{ flex: 2, background: brand.primary, color: '#fff', border: 'none', borderRadius: 12, padding: '12px 0', fontFamily: FONT_T, fontWeight: 700, fontSize: 15, cursor: (saving || !form.wardCode) ? 'not-allowed' : 'pointer', opacity: (saving || !form.wardCode) ? 0.7 : 1 }}
                >
                  {saving ? '⏳ Placing order...' : '🧾 Place Order'}
                </button>
              </div>
          }
        </div>
      </div>
    </div>
  );
}

// ─── POPUP ────────────────────────────────────────────────────────────────────
function PopupModal({ cfg, brand, onClose, onSub }) {
  const [email,setEmail]=useState(""); const [name,setName]=useState(""); const [done,setDone]=useState(false);
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(10,16,38,0.65)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
      <div style={{ background:"#fff",borderRadius:28,maxWidth:400,width:"100%",overflow:"hidden" }}>
        <div style={{ background:brand.primary,padding:"36px 32px 28px",textAlign:"center",position:"relative" }}>
          <button onClick={onClose} style={{ position:"absolute",top:14,right:16,background:"rgba(255,255,255,0.25)",border:"none",borderRadius:50,width:30,height:30,color:"#fff",cursor:"pointer",fontSize:16 }}>✕</button>
          <HHLogo primary="#fff" size={52} />
          <div style={{ fontFamily:FONT_T,fontSize:26,color:"#fff",fontWeight:700,marginTop:10 }}>{cfg.title}</div>
          <div style={{ fontFamily:FONT_B,fontSize:14,color:"rgba(255,255,255,0.88)",marginTop:4 }}>{cfg.body}</div>
        </div>
        <div style={{ padding:28 }}>
          {done
            ? <div style={{ textAlign:"center",padding:"10px 0" }}><div style={{ fontSize:48 }}>🎉</div><div style={{ fontFamily:FONT_T,fontSize:20,color:brand.primary,margin:"10px 0 6px" }}>{cfg.successTitle}</div><div style={{ fontFamily:FONT_B,fontSize:14,color:"#4a5573" }}>{cfg.successBody}</div></div>
            : <>
                <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" style={{ width:"100%",padding:"12px 16px",borderRadius:12,border:"2px solid #dbe2f1",fontSize:14,fontFamily:FONT_B,marginBottom:12,boxSizing:"border-box" }} />
                <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" style={{ width:"100%",padding:"12px 16px",borderRadius:12,border:"2px solid #dbe2f1",fontSize:14,fontFamily:FONT_B,marginBottom:16,boxSizing:"border-box" }} />
                <button onClick={async ()=>{if(email&&name){try{await addSubscriber(name,email);}catch(_){} onSub({name,email});setDone(true);setTimeout(onClose,2200);}}} style={{ width:"100%",background:brand.primary,color:"#fff",border:"none",borderRadius:14,padding:"14px 0",fontFamily:FONT_T,fontSize:16,fontWeight:700,cursor:"pointer" }}>{cfg.btnLabel}</button>
              </>
          }
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN LOGIN — Supabase Auth ──────────────────────────────────────────────
function AdminLogin({ onSuccess, onClose }) {
  const [email, setEmail] = useState("");
  const [pw, setPw]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [shake, setShake]     = useState(false);

  const go = async () => {
    if (!email || !pw) return;
    setLoading(true); setError("");
    try {
      const user = await adminSignIn(email, pw);
      onSuccess(user.email);
    } catch(e) {
      setError("Incorrect email or password");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(10,16,38,0.85)",zIndex:5000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(10px)" }}>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}`}</style>
      <div style={{ background:"#fff",borderRadius:24,maxWidth:400,width:"100%",overflow:"hidden",animation:shake?"shake 0.4s ease":undefined }}>
        <div style={{ background:"#0d142e",padding:"32px 32px 28px",textAlign:"center" }}>
          <div style={{ fontSize:40,marginBottom:8 }}>🔐</div>
          <div style={{ fontFamily:FONT_T,fontSize:22,color:"#1b295b",fontWeight:700 }}>Admin — Hanapet</div>
          <div style={{ fontFamily:FONT_B,fontSize:13,color:"rgba(255,255,255,0.55)",marginTop:6 }}>Sign in with your Supabase account</div>
        </div>
        <div style={{ padding:28 }}>
          <div style={{ fontFamily:FONT_T,fontSize:13,color:"#5f6c8f",marginBottom:6 }}>Email</div>
          <input
            type="email" value={email}
            onChange={e=>{setEmail(e.target.value);setError("");}}
            onKeyDown={e=>e.key==="Enter"&&go()}
            placeholder="admin@gmail.com"
            style={{ width:"100%",padding:"12px 16px",borderRadius:12,border:"2px solid #dbe2f1",fontFamily:FONT_B,fontSize:14,boxSizing:"border-box",marginBottom:12 }}
          />
          <div style={{ fontFamily:FONT_T,fontSize:13,color:"#5f6c8f",marginBottom:6 }}>Password</div>
          <input
            type="password" value={pw}
            onChange={e=>{setPw(e.target.value);setError("");}}
            onKeyDown={e=>e.key==="Enter"&&go()}
            placeholder="••••••••"
            style={{ width:"100%",padding:"13px 16px",borderRadius:12,border:`2px solid ${error?"#d64545":"#dbe2f1"}`,fontFamily:FONT_B,fontSize:16,letterSpacing:4,boxSizing:"border-box",marginBottom:8 }}
          />
          {error && <div style={{ fontFamily:FONT_B,fontSize:12,color:"#d64545",marginBottom:8 }}>❌ {error}</div>}
          <div style={{ display:"flex",gap:10,marginTop:8 }}>
            <button onClick={go} disabled={loading} style={{ flex:2,background:"#1b295b",color:"#fff",border:"none",borderRadius:12,padding:"13px 0",fontFamily:FONT_T,fontSize:15,fontWeight:700,cursor:"pointer",opacity:loading?0.7:1 }}>
              {loading ? "⏳ Signing in..." : "Sign In →"}
            </button>
            <button onClick={onClose} style={{ flex:1,background:"#f2f5fb",color:"#5f6c8f",border:"2px solid #dbe2f1",borderRadius:12,padding:"13px 0",fontFamily:FONT_T,fontSize:14,cursor:"pointer" }}>Cancel</button>
          </div>
          <div style={{ marginTop:14,fontFamily:FONT_B,fontSize:11,color:"#5f6c8f",textAlign:"center" }}>
            🔒 Auth via Supabase — password never stored in code
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── ADMIN PANEL — FULL CONTENT CONTROL ──────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// ─── TAB ORDERS (injected for Supabase) ──────────────────────────────────────


function TabOrders({ S }) {
  const [orders, setOrders] = S.orders;
  const brand = S.brand[0];
  const [sel, setSel] = useState(null);
  const [filter, setFilter] = useState("all");
  const STEPS = ["Pending","Confirmed","Packing","Handed to GHN","In Transit","Delivered","Cancelled"];
  const STATUS_LABELS = {"Pending":"Chờ xử lý","Confirmed":"Đã xác nhận","Packing":"Đang đóng gói","Handed to GHN":"Đã giao cho GHN","In Transit":"Đang vận chuyển","Delivered":"Đã giao","Cancelled":"Đã huỷ"};
  const SC = {"Pending":"#F59E0B","Confirmed":"#3B82F6","Packing":"#8B5CF6","Handed to GHN":"#06B6D4","In Transit":"#1b295b","Delivered":"#22C55E","Cancelled":"#EF4444"};
  const filtered = filter==="all" ? orders : orders.filter(o=>o.status===filter);

  const updateOrder = async (id, patch) => {
    try {
      await updateOrderDB(id, patch);
      setOrders(prev=>prev.map(x=>x.id===id?{...x,...patch}:x));
    } catch(e) { alert("Lỗi cập nhật: "+e.message); }
  };

  const advance = async (o) => {
    const idx = STEPS.indexOf(o.status);
    if (idx < STEPS.length-2) await updateOrder(o.id, {status: STEPS[idx+1]});
  };

  const createShipmentForOrder = async (o) => {
    try {
      const {data:{session}} = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { alert("Vui lòng đăng nhập lại"); return; }
      const res = await fetch("/api/shipping/create", {
        method:"POST",
        headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},
        body: JSON.stringify({orderId: o.id}),
      });
      const data = await res.json();
      if (data.success) {
        await updateOrder(o.id, {trackingCode: data.shipment.trackingCode, status:"Handed to GHN"});
        alert("✅ Đã tạo vận đơn!\nMã: "+data.shipment.trackingCode+"\nPhí: "+(data.shipment.fee||0).toLocaleString("en-GB")+"đ");
      } else {
        alert("❌ Lỗi: "+data.error+"\n\n💡 Kiểm tra GHN_TOKEN trong .env.local");
      }
    } catch(e) { alert("❌ "+e.message); }
  };

  if (sel) {
    const o = orders.find(x=>x.id===sel);
    if (!o) return <div><button onClick={()=>setSel(null)}>← Quay lại</button></div>;
    const stepIdx = STEPS.indexOf(o.status);
    return (
      <div style={{maxWidth:700}}>
        <button onClick={()=>setSel(null)} style={{background:"#f2f5fb",border:"2px solid #dbe2f1",borderRadius:9,padding:"6px 14px",fontFamily:FONT_T,fontSize:13,color:"#5f6c8f",cursor:"pointer",marginBottom:20}}>← Tất cả đơn</button>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20,flexWrap:"wrap"}}>
          <div style={{fontFamily:FONT_T,fontSize:16,color:"#0d142e"}}>Đơn: <span style={{color:brand.primary}}>{o.code}</span></div>
          <span style={{display:"inline-block",background:(SC[o.status]||"#888")+"18",color:SC[o.status]||"#888",border:"1px solid "+(SC[o.status]||"#888")+"44",borderRadius:20,padding:"3px 12px",fontSize:12,fontFamily:FONT_T,fontWeight:700}}>{STATUS_LABELS[o.status]||o.status}</span>
        </div>
        {/* Pipeline */}
        <div style={{background:"#f2f5fb",borderRadius:16,padding:20,border:"2px solid #dbe2f1",marginBottom:20}}>
          <div style={{fontFamily:FONT_T,fontSize:11,color:"#5f6c8f",marginBottom:14,letterSpacing:1}}>TRẠNG THÁI ĐƠN HÀNG</div>
          <div style={{display:"flex",alignItems:"center",overflowX:"auto",gap:0,marginBottom:16}}>
            {STEPS.filter(s=>s!=="Cancelled").map((s,i,arr)=>{
              const done=STEPS.indexOf(o.status)>=i&&o.status!=="Cancelled";
              const active=o.status===s;
              return <div key={s} style={{display:"flex",alignItems:"center",flexShrink:0}}>
                <div style={{textAlign:"center"}}>
                  <div style={{width:32,height:32,borderRadius:16,background:active?brand.primary:done?"#22C55E":"#e0e0e0",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 4px",fontSize:13,color:"#fff",fontWeight:700}}>{done?(active?"●":"✓"):"○"}</div>
                  <div style={{fontFamily:FONT_T,fontSize:10,color:active?brand.primary:done?"#22C55E":"#5f6c8f",maxWidth:64,textAlign:"center",lineHeight:1.2}}>{STATUS_LABELS[s]||s}</div>
                </div>
                {i<arr.length-1&&<div style={{width:28,height:2,background:STEPS.indexOf(o.status)>i?"#22C55E":"#e0e0e0",flexShrink:0,margin:"0 0 16px"}}/>}
              </div>;
            })}
          </div>
          {/* Create Shipment Button */}
          {!o.trackingCode&&o.status!=="Cancelled"&&o.status!=="Delivered"&&(
            <button onClick={()=>createShipmentForOrder(o)} style={{background:"#14B8A6",color:"#fff",border:"none",borderRadius:10,padding:"10px 20px",fontFamily:FONT_T,fontSize:13,fontWeight:700,cursor:"pointer",marginBottom:10}}>
              🚚 Tự động tạo vận đơn GHN/GHTK
            </button>
          )}
          {o.trackingCode&&<div style={{padding:"8px 14px",background:"#f0fdf4",border:"1px solid #86efac",borderRadius:10,fontFamily:FONT_T,fontSize:13,color:"#166534",marginBottom:10}}>✅ Mã vận đơn: <strong>{o.trackingCode}</strong></div>}
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {o.status!=="Delivered"&&o.status!=="Cancelled"&&<button onClick={()=>advance(o)} style={{background:brand.primary,color:"#fff",border:"none",borderRadius:10,padding:"8px 18px",fontFamily:FONT_T,fontSize:13,cursor:"pointer"}}>→ {STATUS_LABELS[STEPS[stepIdx+1]]||STEPS[stepIdx+1]}</button>}
            {o.status!=="Cancelled"&&o.status!=="Delivered"&&<button onClick={async()=>{
              /* v20.1: HOÀN KHO khi huỷ — trước đây chỉ đổi chữ trạng thái,
                 kho mất luôn số hàng của đơn huỷ. Guard o.status!==Cancelled
                 ở điều kiện hiện nút → không cộng đôi. */
              if(!confirm("Huỷ đơn này? Kho sẽ được cộng trả lại từng món.")) return;
              try{ await restockOrder(o); }catch(e){ console.error("restock:",e); alert("⚠️ Hoàn kho lỗi: "+(e?.message||e)+" — đơn VẪN SẼ bị huỷ, kiểm kho tay giúp."); }
              updateOrder(o.id,{status:"Cancelled"});
            }} style={{background:"#fdeeee",color:"#d64545",border:"1px solid #f0c4c4",borderRadius:10,padding:"8px 18px",fontFamily:FONT_T,fontSize:13,cursor:"pointer"}}>Huỷ đơn</button>}
          </div>
        </div>
        {/* Customer + Shipping */}
        <div className="hh-admin-grid2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
          <div style={{padding:16,background:"#fff",borderRadius:12,border:"2px solid #dbe2f1"}}>
            <div style={{fontFamily:FONT_T,fontSize:11,color:"#5f6c8f",letterSpacing:2,marginBottom:8}}>KHÁCH HÀNG</div>
            <div style={{fontFamily:FONT_T,fontSize:15,color:"#0d142e"}}>{o.customer?.name}</div>
            <div style={{fontFamily:FONT_B,fontSize:13,color:"#5f6c8f",marginTop:2}}>{o.customer?.phone}</div>
            <div style={{fontFamily:FONT_B,fontSize:13,color:"#5f6c8f"}}>{o.customer?.address}{o.customer?.district?", "+o.customer.district:""}{o.customer?.province?", "+o.customer.province:""}</div>
          </div>
          <div style={{padding:16,background:"#fff",borderRadius:12,border:"2px solid #dbe2f1"}}>
            <div style={{fontFamily:FONT_T,fontSize:11,color:"#5f6c8f",letterSpacing:2,marginBottom:8}}>VẬN CHUYỂN</div>
            <select value={o.shipping||"GHN"} onChange={e=>updateOrder(o.id,{shipping:e.target.value})} style={{width:"100%",padding:"7px 10px",borderRadius:8,border:"2px solid #dbe2f1",fontFamily:FONT_B,fontSize:13,marginBottom:8}}>
              {["GHN","GHTK","Viettel Post","J&T","Tự giao"].map(x=><option key={x}>{x}</option>)}
            </select>
            <input value={o.trackingCode||""} onChange={e=>updateOrder(o.id,{trackingCode:e.target.value})} placeholder="Nhập mã vận đơn thủ công..." style={{width:"100%",padding:"8px 10px",borderRadius:8,border:"2px solid #dbe2f1",fontFamily:"monospace",fontSize:13,boxSizing:"border-box"}}/>
          </div>
        </div>
        <div className="hh-admin-grid2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
          <div><div style={{fontFamily:FONT_T,fontSize:11,color:"#5f6c8f",marginBottom:5}}>📅 Ngày giao dự kiến</div><input type="date" value={o.estDelivery||""} onChange={e=>updateOrder(o.id,{estDelivery:e.target.value})} style={{width:"100%",padding:"9px 12px",borderRadius:10,border:"2px solid #dbe2f1",fontFamily:FONT_B,fontSize:13,boxSizing:"border-box"}}/></div>
          <div><div style={{fontFamily:FONT_T,fontSize:11,color:"#5f6c8f",marginBottom:5}}>📦 Nguồn đơn</div><input value={o.source||"website"} onChange={e=>updateOrder(o.id,{source:e.target.value})} style={{width:"100%",padding:"9px 12px",borderRadius:10,border:"2px solid #dbe2f1",fontFamily:FONT_B,fontSize:13,boxSizing:"border-box"}}/></div>
        </div>
        <div><div style={{fontFamily:FONT_T,fontSize:11,color:"#5f6c8f",marginBottom:5}}>📝 Ghi chú</div><textarea value={o.note||""} onChange={e=>updateOrder(o.id,{note:e.target.value})} rows={2} style={{width:"100%",padding:"9px 12px",borderRadius:10,border:"2px solid #dbe2f1",fontFamily:FONT_B,fontSize:13,boxSizing:"border-box",resize:"vertical"}}/></div>
        {/* Items */}
        <div style={{marginTop:16,border:"2px solid #dbe2f1",borderRadius:12,overflow:"hidden"}}>
          <div style={{padding:"10px 16px",background:"#f2f5fb",fontFamily:FONT_T,fontSize:13,color:"#0d142e",fontWeight:700}}>Sản phẩm ({(o.items||[]).length})</div>
          {(o.items||[]).map((it,i)=><div key={i} style={{display:"flex",gap:12,padding:"12px 16px",borderTop:"1px solid #dbe2f1",alignItems:"center"}}>
            <div style={{width:48,height:48,borderRadius:8,overflow:"hidden",background:"#f2f5fb",flexShrink:0}}>{it.product?.img?<img src={it.product.img} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center"}}>📦</div>}</div>
            <div style={{flex:1}}><div style={{fontFamily:FONT_T,fontSize:14,color:"#0d142e"}}>{it.product?.name}</div><div style={{fontFamily:FONT_B,fontSize:12,color:"#5f6c8f"}}>×{it.qty}</div></div>
            <div style={{fontFamily:FONT_T,fontSize:14,color:brand.primary,fontWeight:700}}>{((it.product?.price||0)*it.qty).toLocaleString("en-GB")}đ</div>
          </div>)}
          <div style={{display:"flex",justifyContent:"space-between",padding:"12px 16px",borderTop:"2px solid #dbe2f1",fontFamily:FONT_T,fontSize:16}}><span style={{color:"#5f6c8f"}}>Tổng</span><span style={{color:brand.primary,fontWeight:700}}>{(o.total||0).toLocaleString("en-GB")}đ</span></div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <div style={{fontFamily:FONT_T,fontSize:16,color:"#0d142e"}}>Quản Lý Đơn Hàng ({orders.length})</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {["all",...STEPS].map(s=>{const on=filter===s;return <button key={s} onClick={()=>setFilter(s)} style={{padding:"6px 13px",borderRadius:20,border:"1.5px solid "+(on?brand.primary:"#dbe2f1"),background:on?brand.primary:"#fff",color:on?"#fff":"#5f6c8f",fontFamily:FONT_T,fontWeight:700,fontSize:11,cursor:"pointer",whiteSpace:"nowrap",transition:"none"}}>{s==="all"?"Tất cả":(STATUS_LABELS[s]||s)}</button>})}
        </div>
      </div>
      {filtered.length===0
        ? <div style={{textAlign:"center",padding:"60px 0",color:"#5f6c8f",fontFamily:FONT_T,fontSize:16}}>Chưa có đơn hàng nào 📭</div>
        : filtered.map(o=>(
          <div key={o.id} style={{padding:16,background:"#fff",borderRadius:14,border:"2px solid #dbe2f1",marginBottom:12,cursor:"pointer"}} onClick={()=>setSel(o.id)}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <span style={{fontFamily:"monospace",fontSize:13,color:brand.primary,fontWeight:700}}>{o.code}</span>
                  <span style={{background:(SC[o.status]||"#888")+"18",color:SC[o.status]||"#888",border:"1px solid "+(SC[o.status]||"#888")+"44",borderRadius:20,padding:"2px 10px",fontSize:11,fontFamily:FONT_T,fontWeight:700}}>{STATUS_LABELS[o.status]||o.status}</span>
                </div>
                <div style={{fontFamily:FONT_B,fontSize:13,color:"#5f6c8f"}}>{o.customer?.name} · {o.customer?.phone}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontFamily:FONT_T,fontSize:16,color:brand.primary,fontWeight:700}}>{(o.total||0).toLocaleString("en-GB")}đ</div>
                <div style={{fontFamily:FONT_B,fontSize:11,color:"#5f6c8f"}}>{o.date}</div>
              </div>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {(o.items||[]).slice(0,3).map((it,i)=><span key={i} style={{fontFamily:FONT_B,fontSize:12,color:"#5f6c8f",background:"#f2f5fb",border:"1px solid #dbe2f1",borderRadius:8,padding:"2px 8px"}}>{it.product?.name} ×{it.qty}</span>)}
              {(o.items||[]).length>3&&<span style={{fontFamily:FONT_B,fontSize:12,color:"#5f6c8f"}}>+{(o.items||[]).length-3} nữa</span>}
              {o.trackingCode&&<span style={{fontFamily:"monospace",fontSize:11,color:"#14B8A6",marginLeft:"auto"}}>📦 {o.trackingCode}</span>}
              {o.estDelivery&&<span style={{fontFamily:FONT_B,fontSize:11,color:"#22C55E"}}>📅 {o.estDelivery}</span>}
            </div>
          </div>
        ))
      }
    </div>
  );
}

// ─── TAB INVENTORY (injected) ────────────────────────────────────────────────
function TabInventory({ S }) {
  const [products, setProducts] = S.products;
  const brand = S.brand[0];
  const [adj, setAdj] = useState(null);
  const [adjAmt, setAdjAmt] = useState(0);
  const [selected, setSelected] = useState([]);
  const [bulk, setBulk] = useState(null); // {mode:'set'|'add', amount:number}
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkErr, setBulkErr] = useState(null);
  const low = products.filter(p => p.stock <= (p.minStock||5));
  const toggleSel = (id) => setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
  const applyBulk = async () => {
    if (!bulk || selected.length===0) return;
    setBulkSaving(true); setBulkErr(null);
    try {
      const targets = products.filter(p=>selected.includes(p.id));
      const updated = [];
      for (const p of targets) {
        const newStock = bulk.mode==='set' ? Math.max(0,bulk.amount) : Math.max(0, p.stock + bulk.amount);
        await updateProductStock(p.id, newStock);
        updated.push({ id:p.id, stock:newStock });
      }
      setProducts(prev => prev.map(x => { const u = updated.find(u=>u.id===x.id); return u ? {...x, stock:u.stock} : x; }));
      setSelected([]); setBulk(null);
    } catch(e) {
      setBulkErr(e?.message || "Cập nhật hàng loạt thất bại — vui lòng thử lại");
    } finally {
      setBulkSaving(false);
    }
  };

  const saveStock = async (p, newStock) => {
    try {
      await updateProductStock(p.id, newStock);
      setProducts(prev => prev.map(x => x.id===p.id ? {...x, stock:newStock} : x));
    } catch(e) { alert("Lỗi cập nhật tồn kho: "+e.message); }
  };

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{fontFamily:FONT_T,fontSize:16,color:"#0d142e"}}>Quản Lý Tồn Kho</div>
        {low.length>0&&<div style={{background:"#FEF3C7",border:"2px solid #F59E0B",borderRadius:10,padding:"6px 14px",fontFamily:FONT_T,fontSize:12,color:"#92400E"}}>⚠️ {low.length} sản phẩm sắp hết hàng</div>}
      </div>
      {low.length>0&&<div style={{background:"#FEF3C7",border:"2px solid #F59E0B",borderRadius:14,padding:16,marginBottom:20}}>
        <div style={{fontFamily:FONT_T,fontSize:13,color:"#92400E",marginBottom:8}}>⚠️ Cảnh báo sắp hết hàng</div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>{low.map(p=><div key={p.id} style={{background:"#fff",borderRadius:10,padding:"8px 14px",border:"1px solid #F59E0B"}}><div style={{fontFamily:FONT_T,fontSize:13,color:"#0d142e"}}>{p.name}</div><div style={{fontFamily:"monospace",fontSize:12,color:"#EF4444",fontWeight:700}}>Còn {p.stock} / tối thiểu {p.minStock||5}</div></div>)}</div>
      </div>}
      {/* API Platform connections */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:20}}>
        {[["Shopee","#ee4d2d"],["TikTok Shop","#010101"],["Lazada","#0f146d"]].map(([name,color])=>(
          <div key={name} style={{padding:14,background:"#fff",borderRadius:12,border:"2px solid #dbe2f1"}}>
            <div style={{fontFamily:FONT_T,fontSize:13,color:"#0d142e",marginBottom:4}}>{name}</div>
            <div style={{fontFamily:FONT_B,fontSize:11,color:"#5f6c8f",marginBottom:8}}>Chưa kết nối</div>
            <button style={{width:"100%",background:color+"18",color,border:"1px solid "+color+"44",borderRadius:8,padding:"5px 0",fontFamily:FONT_T,fontSize:11,cursor:"pointer"}}>Kết nối API</button>
          </div>
        ))}
      </div>
      {selected.length>0 && (
        <div style={{background:"#fff",border:`2px solid ${brand.primary}`,borderRadius:14,padding:14,marginBottom:16,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <div style={{fontFamily:FONT_T,fontSize:13,color:"#0d142e"}}>✅ {selected.length} sản phẩm đã chọn</div>
          <select value={bulk?.mode||""} onChange={e=>setBulk(b=>({mode:e.target.value,amount:b?.amount||0}))} style={{padding:"7px 10px",borderRadius:8,border:"2px solid #dbe2f1",fontFamily:FONT_B,fontSize:12}}>
            <option value="" disabled>Chọn hành động...</option>
            <option value="set">Đặt tồn kho = </option>
            <option value="add">Cộng/Trừ tồn kho (+/-)</option>
          </select>
          {bulk?.mode && <input type="number" value={bulk.amount} onChange={e=>setBulk(b=>({...b,amount:Number(e.target.value)}))} placeholder={bulk.mode==='set'?'VD: 50':'VD: 20 hoặc -5'} style={{width:110,padding:"7px 10px",borderRadius:8,border:"2px solid #dbe2f1",fontFamily:"monospace",fontSize:13}} />}
          <button disabled={!bulk?.mode||bulkSaving} onClick={applyBulk} style={{background:brand.primary,color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",fontFamily:FONT_T,fontSize:12,cursor:bulkSaving?"not-allowed":"pointer",opacity:bulkSaving?0.7:1}}>{bulkSaving?"⏳ Đang lưu...":"Áp dụng"}</button>
          <button onClick={()=>{setSelected([]);setBulk(null);setBulkErr(null);}} style={{background:"#f2f5fb",color:"#5f6c8f",border:"1px solid #dbe2f1",borderRadius:8,padding:"8px 16px",fontFamily:FONT_T,fontSize:12,cursor:"pointer"}}>Bỏ chọn</button>
          {bulkErr && <div style={{width:"100%",marginTop:4,padding:"8px 12px",borderRadius:8,fontFamily:FONT_B,fontSize:12,background:"#fdeeee",color:"#d64545",border:"1px solid #f0c4c4"}}>❌ {bulkErr}</div>}
        </div>
      )}
      <div style={{border:"2px solid #dbe2f1",borderRadius:16,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"32px 2fr 1fr 1fr 1fr 80px",background:"#f2f5fb",padding:"10px 16px",gap:8,alignItems:"center"}}>
          <input type="checkbox" checked={selected.length>0 && selected.length===products.length} onChange={e=>setSelected(e.target.checked?products.map(p=>p.id):[])} />
          {["Sản Phẩm","SKU","Tồn Kho","Tồn tối thiểu",""].map(h=><div key={h} style={{fontFamily:FONT_T,fontSize:11,color:"#5f6c8f",letterSpacing:1}}>{h}</div>)}
        </div>
        {products.map(p=>{
          const isLow=p.stock<=(p.minStock||5);
          return <div key={p.id} style={{display:"grid",gridTemplateColumns:"32px 2fr 1fr 1fr 1fr 80px",padding:"12px 16px",borderTop:"1px solid #dbe2f1",alignItems:"center",gap:8,background:selected.includes(p.id)?"#FFF5E8":isLow?"#FFFBEB":"#fff"}}>
            <input type="checkbox" checked={selected.includes(p.id)} onChange={()=>toggleSel(p.id)} />
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:40,height:40,borderRadius:8,overflow:"hidden",background:"#f2f5fb",flexShrink:0}}>{p.img?<img src={p.img} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",fontSize:18}}>📦</div>}</div>
              <div><div style={{fontFamily:FONT_T,fontSize:13,color:"#0d142e"}}>{p.name}</div><div style={{fontFamily:FONT_B,fontSize:11,color:"#5f6c8f"}}>{p.category}</div></div>
            </div>
            <div style={{fontFamily:"monospace",fontSize:12,color:"#4a5573"}}>{p.sku||"—"}</div>
            <div style={{fontFamily:"monospace",fontSize:15,fontWeight:700,color:isLow?"#EF4444":"#22C55E"}}>{p.stock}</div>
            <div><input type="number" value={p.minStock||5} onChange={e=>{const v=Number(e.target.value);setProducts(prev=>prev.map(x=>x.id===p.id?{...x,minStock:v}:x));}} onBlur={async()=>{try{await upsertProduct(products.find(x=>x.id===p.id));}catch(e){alert("Lỗi cập nhật tồn tối thiểu: "+e.message);}}} style={{width:55,padding:"4px 8px",borderRadius:8,border:"2px solid #dbe2f1",fontFamily:"monospace",fontSize:13,textAlign:"center"}}/></div>
            <button onClick={()=>{setAdj(p);setAdjAmt(0);}} style={{background:"#f2f5fb",color:brand.primary,border:"1px solid #dbe2f1",borderRadius:8,padding:"5px 10px",fontFamily:FONT_T,fontSize:11,cursor:"pointer"}}>+/−</button>
          </div>;
        })}
      </div>
      {adj&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:4000,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{background:"#fff",borderRadius:20,padding:28,maxWidth:340,width:"100%",margin:16}}>
          <div style={{fontFamily:FONT_T,fontSize:16,color:"#0d142e",marginBottom:12}}>Điều chỉnh: {adj.name}</div>
          <div style={{fontFamily:FONT_B,fontSize:13,color:"#5f6c8f",marginBottom:12}}>Hiện tại: <strong style={{color:brand.primary}}>{adj.stock}</strong></div>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
            <button onClick={()=>setAdjAmt(a=>a-1)} style={{width:36,height:36,borderRadius:8,background:"#f2f5fb",border:"2px solid #dbe2f1",fontSize:18,cursor:"pointer",color:brand.primary}}>−</button>
            <input type="number" value={adjAmt} onChange={e=>setAdjAmt(Number(e.target.value))} style={{flex:1,padding:"8px 12px",borderRadius:10,border:"2px solid #dbe2f1",fontFamily:"monospace",fontSize:18,textAlign:"center",fontWeight:700}}/>
            <button onClick={()=>setAdjAmt(a=>a+1)} style={{width:36,height:36,borderRadius:8,background:"#f2f5fb",border:"2px solid #dbe2f1",fontSize:18,cursor:"pointer",color:brand.primary}}>+</button>
          </div>
          <div style={{fontFamily:FONT_B,fontSize:13,color:"#4a5573",marginBottom:16}}>Sau điều chỉnh: <strong style={{color:adjAmt>=0?"#22C55E":"#EF4444"}}>{Math.max(0,adj.stock+adjAmt)}</strong></div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={async()=>{await saveStock(adj,Math.max(0,adj.stock+adjAmt));setAdj(null);}} style={{flex:1,background:brand.primary,color:"#fff",border:"none",borderRadius:12,padding:"12px 0",fontFamily:FONT_T,fontSize:14,cursor:"pointer"}}>Xác nhận</button>
            <button onClick={()=>setAdj(null)} style={{flex:1,background:"#f2f5fb",color:"#5f6c8f",border:"2px solid #dbe2f1",borderRadius:12,padding:"12px 0",fontFamily:FONT_T,fontSize:14,cursor:"pointer"}}>Huỷ</button>
          </div>
        </div>
      </div>}
    </div>
  );
}




// ─── MAIN ADMIN PAGE ─────────────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('orders')
  const [sub,setSub] = useState({ home:'hero', brand:'brandmain', promo:'vouchers' })
  const [saved, setSaved] = useState(false)
  const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 1800) }

  // ── Load all state (mirrors page.js S object) ──────────────────────────────
  const [home,     setHome]     = useState({})
  const [brand,    setBrand]    = useState([{ primary:'#1b295b', secondary:'#ffffff', name:'Hanapet', tagline:'Làm bằng cả tấm lòng 🐾' }])
  const [banners,  setBanners]  = useState([])
  const [products, setProducts] = useState([])
  const [socials,  setSocials]  = useState([])
  const [trustBar, setTrustBar] = useState([])
  const [popup,    setPopup]    = useState({ enabled:false, title:'', body:'', delayMs:3500 })
  const [about,    setAbout]    = useState({ title:'', body:'' })
  const [footer,   setFooter]   = useState({ city:'', tagline2:'', bg:'#0d142e', brandColor:'#1b295b', subtitleColor:'rgba(255,255,255,0.5)' })
  const [flashBar, setFlashBar] = useState({ enabled:false, text:'' })
  const [vouchers, setVouchers] = useState([])
  const [cats,     setCats]     = useState(['Đồ ăn','Phụ kiện'])
  const [orders,   setOrders]   = useState([])

  const S = {
    home:[home,setHome],
    brand:[brand,setBrand], banners:[banners,setBanners], products:[products,setProducts],
    socials:[socials,setSocials], trustBar:[trustBar,setTrustBar], popup:[popup,setPopup],
    about:[about,setAbout], footer:[footer,setFooter], flashBar:[flashBar,setFlashBar],
    vouchers:[vouchers,setVouchers], categories:[cats,setCats], orders:[orders,setOrders],
  }

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/admin/login'); return }
      setUser(session.user)
      try {
        const [cfg, prods, ords, categories] = await Promise.all([
          getAllConfigs(), getProducts(), getOrders(), getCategories()
        ])
        if (cfg.home     !== undefined) setHome(cfg.home)
        if (cfg.brand    !== undefined) setBrand(cfg.brand)
        if (cfg.banners  !== undefined) setBanners(cfg.banners)
        if (cfg.socials  !== undefined) setSocials(cfg.socials)
        if ((cfg.trustBar ?? cfg.trustbar) !== undefined) setTrustBar(cfg.trustBar ?? cfg.trustbar)
        if (cfg.popup    !== undefined) setPopup(cfg.popup)
        if (cfg.about    !== undefined) setAbout(cfg.about)
        if (cfg.footer   !== undefined) setFooter(cfg.footer)
        if ((cfg.flashBar ?? cfg.flashbar) !== undefined) setFlashBar(cfg.flashBar ?? cfg.flashbar)
        if (cfg.vouchers !== undefined) setVouchers(cfg.vouchers)
        setProducts(prods)
        setOrders(ords)
        setCats(categories)
      } catch(e) { console.error('Load error:', e) }
      setLoading(false)
    })()
  }, [])

  const signOut = async () => {
    await adminSignOut()
    document.cookie = 'sb-access-token=; max-age=0; path=/'
    document.cookie = 'sb-refresh-token=; max-age=0; path=/'
    router.replace('/admin/login')
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f2f5fb', fontFamily:"'Baloo 2',sans-serif", fontSize:18, color:'#1b295b' }}>
      ⏳ Đang tải trang quản trị...
    </div>
  )

  const PRIMARY = brand[0]?.primary || '#1b295b'

  const pendingCount = orders.filter(o => o.status === 'Pending').length

  const TABS = [
    ['orders','📋 Đơn hàng', pendingCount],
    ['inventory','📊 Tồn kho', null],
    ['products','📦 Sản phẩm', null],
    ['home','🏠 Trang chủ', null],
    ['brand','🎨 Thương hiệu', null],
    ['promo','🎟 Khuyến mãi', null],
  ]
  // Sub-tabs inside grouped tabs
  const SUBTABS = {
    /* v20 dọn dẹp: bỏ Bố cục/Banner/Trust Bar/Flash Bar/Popup (trang chủ
       KHÔNG đọc các key này — function chết) và Giới thiệu/Footer/Mạng xã
       hội/Favicon (bị key 'home' đè hoặc không được render). Nội dung
       trang chủ giờ sửa TẤT CẢ trong 1 tab Trang chủ. */
    promo: [['vouchers','Mã giảm giá'],['categories','Danh mục']],
  }
  // (sub-tab state declared at top with other hooks)




  const PrimaryBtn = ({ onClick, label }) => (
    <button onClick={onClick} style={{ background:S.brand[0].primary,color:"#fff",border:"none",borderRadius:10,padding:"9px 20px",fontFamily:FONT_T,fontSize:13,cursor:"pointer" }}>{label}</button>
  )
  const AddBtn = ({ onClick, label }) => (
    <button onClick={onClick} style={{ background:S.brand[0].primary,color:"#fff",border:"none",borderRadius:10,padding:"8px 16px",fontFamily:FONT_T,fontSize:12,cursor:"pointer",flexShrink:0 }}>+ {label}</button>
  )
  const DelBtn = ({ onClick }) => (
    <button onClick={onClick} style={{ background:"#fdeeee",color:"#d64545",border:"1px solid #f0c4c4",borderRadius:8,padding:"5px 12px",fontFamily:FONT_T,fontSize:12,cursor:"pointer" }}>🗑</button>
  )

  /* ── Tab: TRANG CHU (moi) ─────────────────────────────────────────────
     Sua TOAN BO noi dung trang chu. Ghi thang vao site_config key='home'
     — dung key ma app/page.js doc. Cac tab cu van giu nguyen, khong dung. */
/* 3 ô nhập dùng chung của tab Trang chủ.
   PHẢI đặt ở đây, NGOÀI TabHome. Nếu định nghĩa bên trong, mỗi lần gõ 1 chữ
   React coi là component MỚI -> input mất con trỏ, gõ được 1 ký tự rồi dừng. */
function HLines({ value, onChange, label, hint }) {
  const arr = Array.isArray(value) ? value : [];
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ fontFamily:FONT_B,fontSize:12,color:"#5f6c8f",marginBottom:6 }}>{label}</div>
      {arr.map((v,i)=>(
        <div key={i} style={{ display:"flex",gap:7,marginBottom:6 }}>
          <input value={v} onChange={e=>{const n=[...arr];n[i]=e.target.value;onChange(n);}}
                 style={{ flex:1,fontFamily:FONT_B,fontSize:13,padding:"8px 10px",border:"2px solid #dbe2f1",borderRadius:9 }} />
          <button onClick={()=>onChange(arr.filter((_,j)=>j!==i))}
                  style={{ background:"#fdeeee",color:"#d64545",border:"1px solid #f0c4c4",borderRadius:8,padding:"5px 12px",fontFamily:FONT_T,fontSize:12,cursor:"pointer" }}>🗑</button>
        </div>
      ))}
      <button onClick={()=>onChange([...arr,''])}
              style={{ background:"#18284e",color:"#fff",border:"none",borderRadius:10,padding:"8px 16px",fontFamily:FONT_T,fontSize:12,cursor:"pointer" }}>+ dòng</button>
      {hint && <div style={{ fontFamily:FONT_B,fontSize:11,color:"#8a93ad",marginTop:6 }}>{hint}</div>}
    </div>
  );
}

function HRows({ value, onChange, label, cols, blank, hint, folder='home', idKey='r' }) {
  const arr = Array.isArray(value) ? value : [];
  const upd = (i,f,v)=>onChange(arr.map((r,j)=>j===i?{...r,[f]:v}:r));
  return (
    <div style={{ marginBottom:16,padding:14,background:"#f7f8fc",borderRadius:12,border:"2px solid #dbe2f1" }}>
      <div style={{ fontFamily:FONT_T,fontSize:13,color:"#18284e",marginBottom:10 }}>{label}</div>
      {arr.map((r,i)=>(
        <div key={i} style={{ background:"#fff",borderRadius:10,padding:11,marginBottom:9,border:"1px solid #e6ebf5" }}>
          <div style={{ display:"flex",justifyContent:"flex-end",marginBottom:6 }}>
            <button onClick={()=>onChange(arr.filter((_,j)=>j!==i))}
                    style={{ background:"#fdeeee",color:"#d64545",border:"1px solid #f0c4c4",borderRadius:8,padding:"5px 12px",fontFamily:FONT_T,fontSize:12,cursor:"pointer" }}>🗑</button>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:9 }}>
            {cols.map(([f,lbl,kind])=>(
              kind==='img'
                ? <div key={f} style={{ gridColumn:"1 / -1" }}>
                    <ImgUp current={r[f]||''} onUpload={v=>upd(i,f,v)} label={lbl}
                           aspect="100%" folder={folder} entityId={idKey+'-'+i+'-'+f} />
                  </div>
                : <Field key={f} label={lbl} value={r[f]||''} onChange={v=>upd(i,f,v)}
                         span={kind==='full'?'full':undefined} />
            ))}
          </div>
        </div>
      ))}
      <button onClick={()=>onChange([...arr,{...blank}])}
              style={{ background:"#18284e",color:"#fff",border:"none",borderRadius:10,padding:"8px 16px",fontFamily:FONT_T,fontSize:12,cursor:"pointer" }}>+ mục</button>
      {hint && <div style={{ fontFamily:FONT_B,fontSize:11,color:"#8a93ad",marginTop:8,lineHeight:1.6 }}>{hint}</div>}
    </div>
  );
}

/* Kéo-thả bố cục hero. Đơn giản: kéo để đổi chỗ, kéo mép phải để đổi
   độ rộng. Số đo lưu theo % nên co giãn đúng trên mọi màn hình.
   Thả ra gần mốc thì TỰ HÍT vào (căn giữa / chạm đáy / bằng chai kia). */
const HERO_DEFAULT = { main: { l: -4, w: 58 }, refill: { l: 46, w: 58 } };
const SNAP = 1.6; /* % — trong khoảng này thì hít vào mốc */

function HeroLayout({ value, onChange, imgMain, imgRefill }) {
  const box = useRef(null);
  const [drag, setDrag] = useState(null);
  const L = { main: { ...HERO_DEFAULT.main, ...(value?.main || {}) },
              refill: { ...HERO_DEFAULT.refill, ...(value?.refill || {}) } };

  const pct = (px) => (px / (box.current?.offsetWidth || 1)) * 100;

  /* các mốc để hít vào */
  const snapTo = (v, marks) => {
    for (const m of marks) if (Math.abs(v - m) < SNAP) return m;
    return Math.round(v * 10) / 10;
  };

  const start = (which, mode) => (e) => {
    e.preventDefault();
    const p = e.touches ? e.touches[0] : e;
    setDrag({ which, mode, x: p.clientX, l: L[which].l, w: L[which].w });
  };

  useEffect(() => {
    if (!drag) return;
    const move = (e) => {
      const p = e.touches ? e.touches[0] : e;
      const d = pct(p.clientX - drag.x);
      const other = drag.which === 'main' ? L.refill : L.main;
      const next = { ...L };
      if (drag.mode === 'move') {
        const raw = drag.l + d;
        next[drag.which] = { ...L[drag.which],
          l: snapTo(raw, [0, other.l, 50 - L[drag.which].w / 2, 100 - L[drag.which].w]) };
      } else {
        const raw = Math.max(15, Math.min(100, drag.w + d));
        next[drag.which] = { ...L[drag.which], l: L[drag.which].l, w: snapTo(raw, [other.w, 50, 58]) };
      }
      onChange(next);
    };
    const up = () => setDrag(null);
    window.addEventListener('mousemove', move);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('mouseup', up);
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchend', up);
    };
  }, [drag, L.main.l, L.main.w, L.refill.l, L.refill.w]);

  const Piece = ({ k, img, label, z }) => (
    <div onMouseDown={start(k, 'move')} onTouchStart={start(k, 'move')}
         style={{ position:'absolute', bottom:0, left:L[k].l+'%', width:L[k].w+'%', height:'100%',
                  zIndex:z, cursor:'grab', display:'grid', placeItems:'end center',
                  alignContent:'end', touchAction:'none',
                  outline: drag?.which===k ? '2px solid #fff' : '2px dashed rgba(255,255,255,.35)',
                  outlineOffset:-2, borderRadius:10 }}>
      {img
        ? <img src={img} alt="" draggable={false}
               style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain', pointerEvents:'none' }} />
        : <div style={{ width:'70%', height:'78%', background:'rgba(255,255,255,.12)', borderRadius:8,
                        display:'grid', placeItems:'center', fontFamily:FONT_T, fontSize:11,
                        color:'rgba(255,255,255,.6)', textAlign:'center', padding:6 }}>{label}</div>}
      <span style={{ position:'absolute', top:6, left:6, background:'rgba(0,0,0,.55)', color:'#fff',
                     fontFamily:FONT_T, fontSize:10, fontWeight:700, padding:'3px 7px', borderRadius:5,
                     pointerEvents:'none' }}>{label}</span>
      <span onMouseDown={start(k, 'size')} onTouchStart={start(k, 'size')}
            title="Kéo để đổi độ rộng"
            style={{ position:'absolute', right:-7, top:'50%', marginTop:-16, width:14, height:32,
                     borderRadius:7, background:'#fff', border:'2px solid #18284e',
                     cursor:'ew-resize', touchAction:'none' }} />
    </div>
  );

  return (
    <div>
      <div ref={box} style={{ position:'relative', width:'100%', aspectRatio:'16/9', background:'#18284e',
                              borderRadius:12, overflow:'hidden', userSelect:'none', marginBottom:10 }}>
        {/* vạch giữa để căn */}
        <div style={{ position:'absolute', left:'50%', top:0, bottom:0, width:1,
                      background:'rgba(255,255,255,.18)', pointerEvents:'none' }} />
        <Piece k="main"   img={imgMain}   label="Chai chính" z={3} />
        <Piece k="refill" img={imgRefill} label="Lõi refill" z={2} />
      </div>
      <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
        <button onClick={()=>onChange(null)}
                style={{ fontFamily:FONT_T, fontSize:12, padding:'7px 14px', borderRadius:8,
                         border:'2px solid #dbe2f1', background:'#fff', color:'#5f6c8f', cursor:'pointer' }}>
          Về mặc định
        </button>
        <span style={{ fontFamily:FONT_B, fontSize:11, color:'#8a93ad' }}>
          Kéo ảnh để đổi chỗ · kéo nút trắng bên phải để đổi độ rộng · thả gần mốc sẽ tự hít vào
        </span>
      </div>
    </div>
  );
}

function HBox({ title, children }) {
  return (
    <div style={{ marginTop:16,padding:16,background:"#f2f5fb",borderRadius:14,border:"2px solid #dbe2f1" }}>
      <div style={{ fontFamily:FONT_T,fontSize:13,color:"#18284e",marginBottom:10 }}>{title}</div>
      {children}
    </div>
  );
}

  const TabHome = () => {
    const [h, setH] = useState({ ...(S.home[0] || {}) });
    const [grp, setGrp] = useState('hero');
    const set  = (k, v) => setH(x => ({ ...x, [k]: v }));




    const GROUPS = [
      ['hero','Hero'], ['sp','Sản phẩm'], ['tm','Đánh giá'],
      ['cb','Combo'],  ['ab','Giới thiệu'], ['txt','Chữ & nút'], ['pet','Mascot'],
    ];

    return (
      <div style={{ maxWidth:640 }}>
        <SectionHeader title="🏠 Trang chủ — toàn bộ nội dung" />
        <div style={{ fontFamily:FONT_B,fontSize:12,color:"#5f6c8f",marginBottom:14,lineHeight:1.7 }}>
          Mọi chữ, ảnh, giá hiển thị trên trang chủ đều sửa ở đây. Lưu vào <b>key &quot;home&quot;</b> —
          đúng nơi trang chủ đọc. Để trống ô nào thì dùng mặc định.
        </div>

        <div style={{ display:"flex",gap:6,flexWrap:"wrap",marginBottom:16 }}>
          {GROUPS.map(([k,l])=>(
            <button key={k} onClick={()=>setGrp(k)} style={{ padding:"7px 15px",borderRadius:999,
              background:grp===k?"#18284e":"#fff",color:grp===k?"#fff":"#5f6c8f",
              border:"2px solid "+(grp===k?"#18284e":"#dbe2f1"),fontFamily:FONT_T,fontWeight:700,
              fontSize:12,cursor:"pointer" }}>{l}</button>
          ))}
        </div>

        {grp==='hero' && (<>
          <Field label="Dòng nhỏ trên cùng" value={h.heroEyebrow||''} onChange={v=>set('heroEyebrow',v)} span="full" />
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
            <Field label="Tiêu đề dòng 1" value={h.heroTitle1||''} onChange={v=>set('heroTitle1',v)} />
            <Field label="Tiêu đề dòng 2" value={h.heroTitle2||''} onChange={v=>set('heroTitle2',v)} />
          </div>
          <Field label="Câu đỡ dưới tiêu đề" value={h.heroSupport||''} onChange={v=>set('heroSupport',v)} span="full" />
          <HLines value={h.heroBenefits} onChange={v=>set('heroBenefits',v)} label="Các gạch đầu dòng" />
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
            <Field label="Chữ nút mua" value={h.heroBtn1||''} onChange={v=>set('heroBtn1',v)} />
            <Field label="Nút mua trỏ tới" value={h.heroBtn1Link||''} onChange={v=>set('heroBtn1Link',v)} />
          </div>
          <div style={{ fontFamily:FONT_B,fontSize:11,color:"#8a93ad",marginBottom:10 }}>
            Viết <code>{'{gia}'}</code> trong chữ nút sẽ tự thay bằng giá thật của sản phẩm.
          </div>
          <Field label="Dòng chữ nhỏ dưới nút" value={h.heroMicro||''} onChange={v=>set('heroMicro',v)} span="full" />
          <Field label="Tên sản phẩm trong hero (mô tả ảnh)" value={h.heroSkuName||''} onChange={v=>set('heroSkuName',v)} span="full" />

          <HBox title="🧴 Ảnh hero (ảnh RIÊNG, không dùng ảnh sản phẩm)">
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
              <ImgUp current={h.heroImage||''} onUpload={v=>set('heroImage',v)} label="Chai chính (trái)"
                     aspect="130%" folder="home" entityId="hero-main" hint="PNG nền trong suốt" />
              <ImgUp current={h.heroRefillImage||''} onUpload={v=>set('heroRefillImage',v)} label="Lõi refill (phải)"
                     aspect="130%" folder="home" entityId="hero-refill" hint="PNG nền trong suốt" />
            </div>          </HBox>

          <HBox title="✋ Bố cục hero — kéo thả">
            <HeroLayout value={h.heroLayout} onChange={v=>set('heroLayout',v)}
                        imgMain={h.heroImage||''} imgRefill={h.heroRefillImage||''} />
          </HBox>

          <HBox title="🖼 Ảnh nền hero">
            <ImgUp current={h.heroBg||''} onUpload={v=>set('heroBg',v)} label="Ảnh nền"
                   aspect="56%" folder="home" entityId="hero-bg" hint="Để trống = nền navy trơn" />
            <div style={{ marginTop:10 }}>
              <Field label="Độ đậm lớp phủ navy (0 → 1)" value={h.heroBgDim ?? ''} onChange={v=>set('heroBgDim', v===''?undefined:Number(v))} />
            </div>
            <div style={{ fontFamily:FONT_B,fontSize:11,color:"#8a93ad",marginTop:6 }}>
              Ảnh càng sáng thì để số càng cao (0.72 là vừa) cho chữ trắng đọc được.
            </div>
          </HBox>

          <HRows idKey="heroTrust" value={h.heroTrust} onChange={v=>set('heroTrust',v)} label="✅ Thanh tin cậy dưới hero (4 ô)"
                cols={[['icon','Icon'],['t','Chữ']]} blank={{icon:'check',t:''}}
                hint="Icon chọn: truck · shield-check · refresh · star · check" />

          <HBox title="🎬 Video TVC">
            <Field label="Link video" value={h.heroVideo||''} onChange={v=>set('heroVideo',v)} span="full" />
            <label style={{ display:"flex",gap:8,alignItems:"center",marginTop:10,fontFamily:FONT_B,fontSize:13,color:"#5f6c8f",cursor:"pointer" }}>
              <input type="checkbox" checked={!!h.heroShowVideo} onChange={e=>set('heroShowVideo',e.target.checked)} />
              Hiện TVC trong hero
            </label>
          </HBox>
        </>)}

        {grp==='sp' && (<>
          <Field label="Kicker" value={h.spKicker||''} onChange={v=>set('spKicker',v)} span="full" />
          <Field label="Tiêu đề mục" value={h.spTitle||''} onChange={v=>set('spTitle',v)} span="full" />
          <Field label="Mô tả mục" value={h.spSub||''} onChange={v=>set('spSub',v)} span="full" />

          {/* v20: tiêu đề nhóm combo A/B/C + nhãn Best choice.
              Combo NHẬP trong tab Sản phẩm (ô Combo A/B/C của từng SP);
              ở đây chỉ sửa thanh tiêu đề nhóm + mascot + chữ nhãn. */}
          <HBox title="🧩 Nhóm combo A/B/C (thanh tiêu đề + nhãn)">
            <Field label='Chữ nhãn thẻ nổi bật (mặc định "Best choice" — đổi được, VD "Đáng mua nhất")' value={h.bestChoiceLabel||''} onChange={v=>set('bestChoiceLabel',v)} span="full" />
            <Field label='Tên thẻ tự sinh khi SP có phân loại mùi/màu (mặc định "Chai lẻ")' value={h.autoCardName||''} onChange={v=>set('autoCardName',v)} span="full" />
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:10 }}>
              <Field label="Tiêu đề nhóm Misty" value={h.mfHeading||''} onChange={v=>set('mfHeading',v)} />
              <Field label="Kicker nhóm Misty (trống = ẩn)" value={h.mfHeadKicker||''} onChange={v=>set('mfHeadKicker',v)} />
              <Field label="Tiêu đề nhóm Waterless" value={h.wbsHeading||''} onChange={v=>set('wbsHeading',v)} />
              <Field label="Kicker nhóm Waterless (trống = ẩn)" value={h.wbsHeadKicker||''} onChange={v=>set('wbsHeadKicker',v)} />
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:10 }}>
              <ImgUp current={h.mfHeadMascot||''} onUpload={v=>set('mfHeadMascot',v)} label="Mascot nhóm Misty"
                     aspect="100%" folder="home" entityId="mf-head-mascot" hint="Nằm ổ tròn trắng — mascot nâu tối OK" />
              <ImgUp current={h.wbsHeadMascot||''} onUpload={v=>set('wbsHeadMascot',v)} label="Mascot nhóm Waterless"
                     aspect="100%" folder="home" entityId="wbs-head-mascot" hint="Nằm ổ tròn trắng — mascot nâu tối OK" />
            </div>
          </HBox>

          <HBox title="🧴 Misty Fresh">
            <Field label="Từ khoá khớp sản phẩm trong tab Sản phẩm" value={h.mfKey||''} onChange={v=>set('mfKey',v)} span="full" />
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:10 }}>
              <Field label="Nhãn góc" value={h.mfBadge||''} onChange={v=>set('mfBadge',v)} />
              <Field label="Nhãn ô chọn loại" value={h.mfOptLabel||''} onChange={v=>set('mfOptLabel',v)} />
            </div>
            <div style={{ marginTop:10 }}>
              <Field label="Tên hiện trên thẻ" value={h.mfName||''} onChange={v=>set('mfName',v)} span="full" />
              <Field label="Mô tả" value={h.mfDesc||''} onChange={v=>set('mfDesc',v)} rows={3} span="full" />
            </div>
            <div style={{ marginTop:10 }}>
              <ImgUp current={h.mfImage||''} onUpload={v=>set('mfImage',v)} label="Ảnh dự phòng"
                     aspect="130%" folder="home" entityId="mf-img" hint="Trống = dùng ảnh trong tab Sản phẩm" />
            </div>
          </HBox>

          <HBox title="💬 Dòng mời gọi giữa 2 thẻ">
            <Field label="Câu chữ" value={h.inviteText||''} onChange={v=>set('inviteText',v)} span="full" />
            <div style={{ marginTop:10 }}>
              <ImgUp current={h.inviteMascot||''} onUpload={v=>set('inviteMascot',v)} label="Mascot nhỏ"
                     aspect="100%" folder="home" entityId="invite-mascot" />
            </div>
          </HBox>

          <HBox title="🫧 Waterless Bubble Shampoo">
            <Field label="Từ khoá khớp sản phẩm" value={h.wbsKey||''} onChange={v=>set('wbsKey',v)} span="full" />
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:10 }}>
              <Field label="Nhãn góc" value={h.wbsBadge||''} onChange={v=>set('wbsBadge',v)} />
              <Field label="Nhãn ô chọn mùi" value={h.wbsOptLabel||''} onChange={v=>set('wbsOptLabel',v)} />
            </div>
            <div style={{ marginTop:10 }}>
              <Field label="Tên hiện trên thẻ" value={h.wbsName||''} onChange={v=>set('wbsName',v)} span="full" />
              <Field label="Mô tả" value={h.wbsDesc||''} onChange={v=>set('wbsDesc',v)} rows={3} span="full" />
            </div>
          </HBox>

          <HRows idKey="wbsScents" value={h.wbsScents} onChange={v=>set('wbsScents',v)} label="🎨 Các mùi (tên phải TRÙNG phân loại trong tab Sản phẩm)"
                cols={[['name','Tên mùi'],['dot','Màu chấm (#hex)'],['c1','Màu nền 1 (#hex)'],['c2','Màu nền 2 (#hex)'],['image','Ảnh chai theo mùi','img']]}
                blank={{name:'',dot:'#cccccc',c1:'#eeeeee',c2:'#dddddd',image:'',icon:''}}
                hint="Màu nền là mảng màu sau chai, tự đổi khi khách bấm chọn mùi." />
        </>)}

        {grp==='tm' && (<>
          <Field label="Kicker" value={h.tmKicker||''} onChange={v=>set('tmKicker',v)} span="full" />
          <Field label="Tiêu đề" value={h.tmTitle||''} onChange={v=>set('tmTitle',v)} span="full" />
          <HRows idKey="testimonials" value={h.testimonials} onChange={v=>set('testimonials',v)} label="💬 Đánh giá khách"
                cols={[['who','Tên tài khoản'],['pet','Bé nhà ai'],['quote','Câu nói','full'],['embed','Link TikTok / video','full'],['thumb','Ảnh bìa','img']]}
                blank={{who:'',pet:'',quote:'',embed:'',thumb:''}}
                hint="Chưa gắn link video thì thẻ hiện câu nói trên nền navy." />
          <HRows idKey="tmStats" value={h.tmStats} onChange={v=>set('tmStats',v)} label="📊 Các con số"
                cols={[['n','Con số'],['l','Chú thích']]} blank={{n:'',l:''}} />
        </>)}

        {grp==='cb' && (<>
          <Field label="Kicker" value={h.cbKicker||''} onChange={v=>set('cbKicker',v)} span="full" />
          <Field label="Tiêu đề" value={h.cbTitle||''} onChange={v=>set('cbTitle',v)} span="full" />
          <Field label="Mô tả" value={h.cbSub||''} onChange={v=>set('cbSub',v)} span="full" />
          <Field label="Chữ nút" value={h.cbBtn||''} onChange={v=>set('cbBtn',v)} span="full" />
          <HRows idKey="comboTiers" value={h.comboTiers} onChange={v=>set('comboTiers',v)} label="📦 Các gói combo"
                cols={[['key','Từ khoá khớp sản phẩm'],['flag','Nhãn nổi bật'],['image','Ảnh gói','img']]}
                blank={{key:'',flag:'',best:false,image:'',items:[]}}
                hint="Mỗi gói phải là 1 sản phẩm trong tab Sản phẩm (có giá + tồn kho). Ở đây chỉ khai báo gói nào khớp sản phẩm nào." />
        </>)}

        {grp==='ab' && (<>
          <Field label="Kicker" value={h.abKicker||''} onChange={v=>set('abKicker',v)} span="full" />
          <Field label="Tiêu đề" value={h.abTitle||''} onChange={v=>set('abTitle',v)} span="full" />
          <Field label="Đoạn 1" value={h.abBody1||''} onChange={v=>set('abBody1',v)} rows={3} span="full" />
          <Field label="Đoạn 2" value={h.abBody2||''} onChange={v=>set('abBody2',v)} rows={3} span="full" />
          <Field label="Chữ nút" value={h.abBtn||''} onChange={v=>set('abBtn',v)} span="full" />
          <div style={{ marginTop:12 }}>
            <ImgUp current={h.abImage||''} onUpload={v=>set('abImage',v)} label="Ảnh phần giới thiệu"
                   aspect="62%" folder="home" entityId="about-img" />
          </div>
          <HRows idKey="facts" value={h.facts} onChange={v=>set('facts',v)} label="🔢 Các con số"
                cols={[['t','Con số'],['s','Chú thích','full']]} blank={{t:'',s:''}} />
        </>)}

        {grp==='txt' && (<>
          <HBox title="🏷 Thương hiệu & menu">
            <Field label="Tên thương hiệu" value={h.brandName||''} onChange={v=>set('brandName',v)} span="full" />
            <div style={{ marginTop:10 }}>
              <ImgUp current={h.logo||''} onUpload={v=>set('logo',v)} label="Logo"
                     aspect="100%" folder="home" entityId="logo" />
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9,marginTop:10 }}>
              <Field label="Menu 1" value={h.navShop||''} onChange={v=>set('navShop',v)} />
              <Field label="Menu 2" value={h.navAbout||''} onChange={v=>set('navAbout',v)} />
              <Field label="Menu giỏ" value={h.navCart||''} onChange={v=>set('navCart',v)} />
            </div>
          </HBox>

          <HBox title="🔘 Chữ trên nút">
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:9 }}>
              {[['labelCart','Nút thêm giỏ'],['labelDetail','Nút chi tiết'],
                ['buybarBtn','Nút thanh mua dưới'],['pmFullPage','Nút trong popup'],
                ['txtCheckout','Thanh toán'],['txtViewCart','Xem giỏ hàng'],
                ['txtPlaceOrder','Đặt hàng'],['txtInStock','Còn hàng'],
                ['txtOutOfStock','Hết hàng'],['txtAddedToCart','Đã thêm vào giỏ'],
                ['txtCartEmpty','Giỏ trống'],['txtSubtotal','Tạm tính'],
                ['txtShipFee','Phí ship'],['txtTotal','Tổng cộng'],
                ['txtCOD','Trả khi nhận'],['txtOrderOk','Đặt hàng xong']].map(([k,l])=>(
                <Field key={k} label={l} value={h[k]||''} onChange={v=>set(k,v)} />
              ))}
            </div>
            <div style={{ marginTop:10 }}>
              <Field label="Ghi chú trả khi nhận" value={h.txtCODNote||''} onChange={v=>set('txtCODNote',v)} rows={2} span="full" />
              <Field label="Lời cảm ơn sau khi đặt" value={h.txtOrderOkBody||''} onChange={v=>set('txtOrderOkBody',v)} rows={2} span="full" />
            </div>
          </HBox>

          <HBox title="🖼 Ảnh thanh mua dưới cùng">
            <ImgUp current={h.buybarImage||''} onUpload={v=>set('buybarImage',v)} label="Ảnh nhỏ"
                   aspect="130%" folder="home" entityId="buybar-img" />
          </HBox>

          <HLines value={h.trustPoints} onChange={v=>set('trustPoints',v)} label="✅ Điểm tin cậy (hiện trong popup sản phẩm)" />

          <HBox title="📄 Chân trang — cột 1: thương hiệu">
            <ImgUp current={h.logoWhite||''} onUpload={v=>set('logoWhite',v)} label="Logo bản trắng"
                   aspect="100%" folder="home" entityId="logo-white" hint="Nền chân trang là navy đậm" />
            <div style={{ marginTop:10 }}>
              <Field label="Câu giới thiệu ngắn" value={h.footerDesc||''} onChange={v=>set('footerDesc',v)} rows={2} span="full" />
            </div>
            <HLines value={h.footerLines} onChange={v=>set('footerLines',v)}
                    label="Các dòng thông tin (địa chỉ, website…)" />
          </HBox>

          <HBox title="📄 Chân trang — cột 2: điều khoản">
            <Field label="Tiêu đề cột" value={h.footerCol2Title||''} onChange={v=>set('footerCol2Title',v)} span="full" />
            <HRows idKey="footerLinks" value={h.footerLinks} onChange={v=>set('footerLinks',v)}
                   label="Các đường dẫn"
                   cols={[['t','Chữ hiện ra'],['href','Đường dẫn']]} blank={{t:'',href:'#'}} />
          </HBox>

          <HBox title="📄 Chân trang — cột 3: Bộ Công Thương">
            <Field label="Tiêu đề cột" value={h.footerCol3Title||''} onChange={v=>set('footerCol3Title',v)} span="full" />
            <div style={{ marginTop:10 }}>
              <ImgUp current={h.footerBctImg||''} onUpload={v=>set('footerBctImg',v)} label="Ảnh dấu đỏ"
                     aspect="38%" folder="home" entityId="bct" hint="Tải từ trang online.gov.vn sau khi đăng ký" />
            </div>
            <div style={{ marginTop:10 }}>
              <Field label="Bấm vào dấu thì mở trang nào" value={h.footerBctHref||''} onChange={v=>set('footerBctHref',v)} span="full" />
            </div>
          </HBox>

          <Field label="Dòng bản quyền dưới cùng" value={h.footerText||''} onChange={v=>set('footerText',v)} span="full" />
        </>)}

        {grp==='pet' && (<>
          {/* cartPets luu trong DB dang MANG CHUOI, nhung HRows can MANG OBJECT.
              Doi o day luc nap. Luc luu thi doan trong SaveBtn boc nguoc lai. */}
          <HRows idKey="cartPets"
                value={(Array.isArray(h.cartPets) ? h.cartPets : [])
                        .map(x => (typeof x === 'string' ? { src: x } : x))}
                onChange={v=>set('cartPets',v)} label="🐶 Mascot thò đầu khi bấm mua"
                cols={[['src','Ảnh mascot','img']]} blank={{src:''}} folder="mascots"
                hint="Bấm mua sẽ chọn ngẫu nhiên 1 con. CHỈ DÙNG MASCOT MÀU TỐI — mascot nằm trong ổ tròn trắng nên con màu sáng sẽ chìm, không nhìn thấy gì." />
          <HLines value={h.cartCheers} onChange={v=>set('cartCheers',v)} label="🎉 Câu cổ vũ hiện cùng mascot" />
        </>)}

        <SaveBtn saved={saved} onSave={async ()=>{
          /* cartPets luu dang mang chuoi cho khop app/page.js */
          const clean = { ...h };
          if (Array.isArray(clean.cartPets)) {
            clean.cartPets = clean.cartPets
              .map(x => (typeof x === 'string' ? x : x?.src))
              .filter(Boolean);
          }
          await setSupabaseConfig('home', clean);
          S.home[1](clean);
          flash();
        }} />
      </div>
    );
  };

  // ── Tab: Brand ──
  const TabBrand = () => {
    const [b,setB] = useState({...S.brand[0]});
    return (
      <div style={{ maxWidth:520 }}>
        <SectionHeader title="🎨 Branding & Màu Sắc" />
        <div className="hh-admin-grid2" style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
          <Field label="Tên thương hiệu" value={b.name}    onChange={v=>setB(x=>({...x,name:v}))} span="full" />
          <Field label="Khẩu hiệu"         value={b.tagline} onChange={v=>setB(x=>({...x,tagline:v}))} span="full" />
          <Field label="Màu chính"       value={b.primary}   onChange={v=>setB(x=>({...x,primary:v}))}   type="color" />
          <Field label="Màu phụ (nhấn)"value={b.secondary} onChange={v=>setB(x=>({...x,secondary:v}))} type="color" />
        </div>
        <div style={{ marginTop:18 }}>
          <div style={{ fontFamily:FONT_T,fontSize:12,color:"#5f6c8f",marginBottom:8 }}>🖼 Logo cửa hàng (hiện ở đầu trang — để trống sẽ dùng icon HH mặc định)</div>
          <ImgUp current={b.logoImg} onUpload={v=>setB(x=>({...x,logoImg:v}))} label="Tải logo lên" aspect="60%" folder="brand" entityId="site-logo" hint="Vuông ~1:1 (logo)" />
          {b.logoImg && (
            <button onClick={()=>setB(x=>({...x,logoImg:""}))} style={{ marginTop:8,background:"#fdeeee",color:"#d64545",border:"1px solid #f0c4c4",borderRadius:8,padding:"6px 14px",fontFamily:FONT_T,fontSize:12,cursor:"pointer" }}>✕ Xoá logo, dùng icon mặc định</button>
          )}
        </div>
        <div style={{ marginTop:16,padding:16,background:"#f9f9f9",borderRadius:14,border:"2px solid #dbe2f1" }}>
          <div style={{ fontFamily:FONT_T,fontSize:12,color:"#5f6c8f",marginBottom:10 }}>XEM TRƯỚC</div>
          <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:10 }}>
            {b.logoImg ? <img src={b.logoImg} alt="" style={{ height:44,width:44,objectFit:"contain",borderRadius:8 }} /> : <HHLogo primary={b.primary} size={44} />}
            <div><div style={{ fontFamily:FONT_T,fontSize:20,color:b.primary }}>{b.name}</div><div style={{ fontFamily:FONT_B,fontSize:11,color:"#5f6c8f" }}>{b.tagline}</div></div>
          </div>
          <div style={{ display:"flex",gap:8 }}>
            <div style={{ background:b.primary,color:"#fff",borderRadius:8,padding:"8px 16px",fontFamily:FONT_T,fontSize:13 }}>Nút chính</div>
          </div>
        </div>
        <SaveBtn onSave={async ()=>{await setSupabaseConfig("brand", b); S.brand[1](b); flash();}} saved={saved} />
      </div>
    );
  };

  // ── Tab: Products ──
  const TabProducts = () => {
    const cats = S.categories[0];
    const [list,setList] = useState([...S.products[0]]);
    const [editing,setEditing] = useState(null);
    const [importing,setImporting] = useState(false);
    const [importMsg,setImportMsg] = useState(null);
    const [saving,setSaving] = useState(false);
    const [saveErr,setSaveErr] = useState(null);
    const fileRef = useRef(null);
    const upd = (id,k,v) => setList(l=>l.map(x=>x.id===id?{...x,[k]:v}:x));

    // ── CSV parsing (handles quoted fields with commas) ──
    const parseCSV = (text) => {
      const rows = [];
      let row = [], field = '', inQuotes = false;
      for (let i=0; i<text.length; i++) {
        const c = text[i], next = text[i+1];
        if (inQuotes) {
          if (c === '"' && next === '"') { field += '"'; i++; }
          else if (c === '"') { inQuotes = false; }
          else { field += c; }
        } else {
          if (c === '"') inQuotes = true;
          else if (c === ',') { row.push(field); field = ''; }
          else if (c === '\n' || c === '\r') {
            if (c === '\r' && next === '\n') i++;
            row.push(field); field = '';
            if (row.some(v=>v.trim()!=='')) rows.push(row);
            row = [];
          } else field += c;
        }
      }
      if (field !== '' || row.length) { row.push(field); rows.push(row); }
      return rows;
    };

    const CSV_HEADERS = ['id','name','price','original','category','stock','minStock','sku','rating','tags','story','img','image2','image3','image4','flashSale','flashEndHours'];
    const csvCell = v => `"${String(v ?? '').replace(/"/g,'""')}"`;
    const downloadCSVFile = (rows, filename) => {
      const csv = rows.map(r=>r.map(csvCell).join(',')).join('\n');
      const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    };
    const downloadTemplate = () => {
      const sample = ['','Pate cho mèo','35000','45000','Đồ ăn','25','5','PATE-001','4.8','Mèo,Ăn dặm','Pate thơm ngon cho mèo','https://example.com/img1.jpg','','','','FALSE',''];
      downloadCSVFile([CSV_HEADERS, sample], 'hanapet_products_template.csv');
    };
    // Export the CURRENT catalog exactly as it is (stock, prices, everything) —
    // edit the file and re-upload: rows keep their id, so re-import UPDATES
    // instead of duplicating.
    const exportProducts = () => {
      const rows = [CSV_HEADERS, ...list.map(p => [
        p.id, p.name, p.price, p.original, p.category, p.stock, p.minStock||5,
        p.sku||'', p.rating||4.5, p.tags||'', p.story||'', p.img||'',
        (p.images||[])[0]||'', (p.images||[])[1]||'', (p.images||[])[2]||'',
        p.flashSale?'TRUE':'FALSE',
        p.flashSale&&p.flashEnd>Date.now() ? Math.round((p.flashEnd-Date.now())/3600000) : '',
      ])];
      downloadCSVFile(rows, `hanapet_products_${new Date().toISOString().slice(0,10)}.csv`);
    };

    const handleImport = async (file) => {
      if (!file) return;
      setImporting(true); setImportMsg(null);
      try {
        const text = await file.text();
        const rows = parseCSV(text);
        if (rows.length < 2) throw new Error('File is empty or has no data rows');
        const headers = rows[0].map(h=>h.trim().toLowerCase());
        const idx = (name) => headers.indexOf(name);
        const dataRows = rows.slice(1);

        const newRows = dataRows.map(r => {
          const get = (col) => idx(col)>=0 ? (r[idx(col)]||'').trim() : '';
          const images = [get('image2'), get('image3'), get('image4')].filter(Boolean);
          return {
            _csvId: get('id'),   // id from an exported file — strongest match key
            name: get('name') || 'Untitled Product',
            price: Number(get('price'))||0,
            original: Number(get('original'))||Number(get('price'))||0,
            category: get('category') || cats[0] || 'Đồ ăn',
            stock: Number(get('stock'))||0,
            minStock: Number(get('minstock'))||5,
            sku: get('sku'),
            rating: Number(get('rating'))||4.5,
            tags: get('tags'),
            story: get('story'),
            img: get('img'),
            images,
            flashSale: ['true','1','yes'].includes(get('flashsale').toLowerCase()),
            flashEnd: get('flashendhours') ? Date.now()+Number(get('flashendhours'))*3600000 : 0,
          };
        });

        // Match each CSV row against existing products: by id first (from an
        // exported file — exact), then by SKU, then by exact name. Matches get
        // UPDATED; only truly new rows are created. Re-uploading the same file
        // never duplicates.
        let working = [...list];
        const findMatch = (row) => {
          if (row._csvId) { const m = working.find(x=>x.id===row._csvId); if (m) return m; }
          if (row.sku) { const m = working.find(x=>x.sku && x.sku.toLowerCase()===row.sku.toLowerCase()); if (m) return m; }
          return working.find(x=>x.name.trim().toLowerCase()===row.name.trim().toLowerCase());
        };
        const toSave = [];
        let updatedCount = 0, createdCount = 0;
        for (const rowRaw of newRows) {
          const { _csvId, ...row } = rowRaw;   // don't persist the helper field
          const match = findMatch(rowRaw);
          if (match) {
            const merged = { ...match, ...row, id: match.id, reviews: match.reviews||[] };
            working = working.map(x=>x.id===match.id?merged:x);
            toSave.push(merged);
            updatedCount++;
          } else {
            const created = { ...row, id: uid(), reviews: [] };
            working = [...working, created];
            toSave.push(created);
            createdCount++;
          }
        }

        setList(working);
        S.products[1](working);
        // Save each to Supabase
        let saved = 0, failed = 0;
        for (const p of toSave) {
          try { await upsertProduct(p); saved++; } catch(e) { failed++; console.error('Import row failed:', p.name, e); }
        }
        setImportMsg({ type: failed===0?'success':'warning', text: `${createdCount} sản phẩm mới, ${updatedCount} đã cập nhật (khớp theo SKU/tên)${failed>0?`, ${failed} lỗi (xem console)`:''}.` });
      } catch(e) {
        setImportMsg({ type:'error', text: 'Nhập file thất bại: ' + e.message });
      } finally {
        setImporting(false);
        if (fileRef.current) fileRef.current.value = '';
      }
    };
    if (editing) {
      const p = list.find(x=>x.id===editing);
      return (
        <div style={{ maxWidth:560 }}>
          <div style={{ display:"flex",gap:10,alignItems:"center",marginBottom:18 }}>
            <button onClick={()=>setEditing(null)} style={{ background:"#f2f5fb",border:"2px solid #dbe2f1",borderRadius:9,padding:"6px 14px",fontFamily:FONT_T,fontSize:13,color:"#5f6c8f",cursor:"pointer" }}>← Quay lại</button>
            <div style={{ fontFamily:FONT_T,fontSize:15,color:"#0d142e" }}>{p.id.startsWith("new")?"Thêm Sản Phẩm Mới":"Sửa Sản Phẩm"}</div>
          </div>
          <div style={{ marginBottom:14 }}>
            <div style={{ fontFamily:FONT_T,fontSize:12,color:"#5f6c8f",marginBottom:10 }}>🖼 Ảnh Sản Phẩm (ảnh đầu = ảnh chính, các ảnh sau hiện trong slideshow)</div>
            <div className="hh-admin-grid2" style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
              <ImgUp current={p.img} onUpload={v=>upd(p.id,"img",v)} label="Ảnh 1 (chính)" aspect="100%" folder="products" entityId={p.id+"_0"} hint="Vuông 1:1, chủ thể ở GIỮA — trang chủ cắt kín khung ngang 4:3, trang chi tiết hiện vuông" />
              {(p.images||[]).map((img,idx)=>(
                <div key={idx}>
                  <ImgUp current={img} onUpload={v=>{const arr=[...(p.images||[])];arr[idx]=v;upd(p.id,"images",arr);}} label={`Ảnh ${idx+2}`} aspect="100%" folder="products" entityId={p.id+"_"+(idx+1)} hint="Vuông 1:1 (slideshow trang chi tiết)" />
                  <button onClick={()=>{const arr=(p.images||[]).filter((_,i)=>i!==idx);upd(p.id,"images",arr);}} style={{ marginTop:5,background:"#fdeeee",color:"#d64545",border:"1px solid #f0c4c4",borderRadius:7,padding:"3px 10px",fontSize:11,fontFamily:FONT_T,cursor:"pointer",width:"100%" }}>✕ Xóa ảnh này</button>
                </div>
              ))}
            </div>
            <button onClick={()=>upd(p.id,"images",[...(p.images||[]),""])} style={{ marginTop:10,background:"#fff",color:S.brand[0].primary,border:`2px dashed ${S.brand[0].primary}`,borderRadius:10,padding:"9px 16px",fontFamily:FONT_T,fontSize:12,cursor:"pointer",width:"100%" }}>+ Thêm ảnh khác</button>
          </div>
          <div className="hh-admin-grid2" style={{ marginTop:14,display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
            <Field label="Tên sản phẩm" value={p.name} onChange={v=>upd(p.id,"name",v)} span="full" />
            <div>
              <div style={{ fontFamily:FONT_T,fontSize:11,color:"#5f6c8f",marginBottom:5 }}>Danh mục</div>
              <select value={p.category} onChange={e=>upd(p.id,"category",e.target.value)} style={{ width:"100%",padding:"9px 12px",borderRadius:10,border:"2px solid #dbe2f1",fontFamily:FONT_B,fontSize:13 }}>
                {cats.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <Field label="Giá bán (₫)"  value={p.price}    onChange={v=>upd(p.id,"price",v)}    type="number" />
            <Field label="Giá gốc (₫)"  value={p.original} onChange={v=>upd(p.id,"original",v)} type="number" />
            <Field label="Kho hàng"     value={p.stock}    onChange={v=>upd(p.id,"stock",v)}    type="number" />
            <Field label="Đánh giá (0-5)" value={p.rating}   onChange={v=>upd(p.id,"rating",v)}   type="number" />
            <Field label="Tags (cách nhau bằng dấu phẩy)" value={p.tags||""} onChange={v=>upd(p.id,"tags",v)} span="full" />
            <Field label="Mô tả ngắn (hiện ở trang chủ — 1-2 câu)" value={p.subtitle||""} onChange={v=>upd(p.id,"subtitle",v)} rows={2} span="full" placeholder="VD: Xịt khử mùi khử khuẩn, an toàn khi liếm" />
            <Field label="Câu chuyện sản phẩm (mô tả dài — chỉ hiện trong popup chi tiết)" value={p.story||""} onChange={v=>upd(p.id,"story",v)} rows={4} span="full" />
            {/* v20 dọn: BỎ ô "Phông chữ riêng cho SP" — storefront không đọc
                productFont ở đâu cả (trang chủ/chi tiết/popup đều không), bấm
                chọn chỉ lưu DB rồi nằm im. Muốn dùng lại thì phải nối
                normalize() + render trước, đừng chỉ thêm ô. */}
            {/* v20 dọn: BỎ ô "Phông chữ riêng cho SP" — storefront không đọc
                productFont ở đâu cả (trang chủ/chi tiết/popup đều không), bấm
                chọn chỉ lưu DB rồi nằm im. Muốn dùng lại thì phải nối
                normalize() + render trước, đừng chỉ thêm ô. */}
            {/* v20.1: banner SP — KHÔI PHỤC vì trang chủ GIỜ RENDER THẬT
                (khối .pbanner phía trên nhóm thẻ). Trước đây là ô hứa suông. */}
            <div style={{ gridColumn:"1 / -1",marginTop:4,padding:14,background:"#eef1fa",borderRadius:12,border:"2px solid #dbe2f1" }}>
              <div style={{ fontFamily:FONT_T,fontSize:12,color:"#18284e",marginBottom:8 }}>🖼 Banner riêng của sản phẩm — hiện phía TRÊN nhóm thẻ ở trang chủ (không bắt buộc)</div>
              <div style={{ display:"flex",gap:12,alignItems:"flex-start",flexWrap:"wrap" }}>
                <ImgUp current={p.banner} onUpload={v=>upd(p.id,"banner",v)} label="Ảnh banner (ngang ~3:1)" aspect="33%" folder="products" entityId={p.id+"_banner"} hint="Ngang rộng — cao tối đa 340px khi hiện" />
                <div style={{ flex:1,minWidth:180 }}>
                  <Field label="Link video banner (.mp4 — ưu tiên hơn ảnh)" value={p.bannerVideo||""} onChange={v=>upd(p.id,"bannerVideo",v)} span="full" placeholder="https://.../banner.mp4" />
                  <Field label="Chữ trên banner (không bắt buộc)" value={p.bannerText||""} onChange={v=>upd(p.id,"bannerText",v)} span="full" placeholder="VD: Ưu đãi đặc biệt tháng này" />
                </div>
              </div>
            </div>
          </div>

          {/* ── Variants (Phân loại) ── */}
          <div style={{ marginTop:18,padding:16,background:"#f2f5fb",border:"2px dashed #dbe2f1",borderRadius:14 }}>
            <div style={{ fontFamily:FONT_T,fontSize:13,color:"#5f6c8f",marginBottom:4 }}>🏷 Phân loại (Variants)</div>
            <div style={{ fontFamily:FONT_B,fontSize:12,color:"#5f6c8f",marginBottom:12 }}>
              Nếu có phân loại, giá và kho ở trên bị bỏ qua — mỗi loại có giá + kho riêng. Để trống nếu sản phẩm không phân loại.
              Trang chủ TỰ SINH 1 thẻ "sản phẩm lẻ" có bộ chọn từ đây (chip tên phân loại; SP có bảng mùi thì thành chấm màu) — KHÔNG cần nhập lại vào combo.
            </div>
            <div style={{ marginBottom:12,maxWidth:260 }}>
              <Field label='Tên nhóm phân loại (VD: "Kích cỡ", "Màu")' value={p.variantLabel||""} onChange={v=>upd(p.id,"variantLabel",v)} />
            </div>
            {(p.variants||[]).map((v,vi)=>(
              <div key={v.id} style={{ background:"#fff",border:"1px solid #dbe2f1",borderRadius:12,padding:12,marginBottom:10 }}>
                <div style={{ display:"grid",gridTemplateColumns:"90px 1fr",gap:12 }}>
                  <ImgUp current={v.img} onUpload={val=>{const nv=[...p.variants];nv[vi]={...nv[vi],img:val};upd(p.id,"variants",nv);}} label="Ảnh" aspect="100%" folder="products" entityId={p.id+"_v"+vi} hint="Vuông 1:1, chủ thể giữa — trang chủ cắt kín 4:3 khi chọn loại này" />
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
                    <Field label="Tên loại" value={v.name||""} onChange={val=>{const nv=[...p.variants];nv[vi]={...nv[vi],name:val};upd(p.id,"variants",nv);}} span="full" />
                    <Field label="Giá bán (₫)" value={v.price||0} type="number" onChange={val=>{const nv=[...p.variants];nv[vi]={...nv[vi],price:Number(val)};upd(p.id,"variants",nv);}} />
                    <Field label="Giá gốc (₫)" value={v.original||0} type="number" onChange={val=>{const nv=[...p.variants];nv[vi]={...nv[vi],original:Number(val)};upd(p.id,"variants",nv);}} />
                    <Field label="Kho" value={v.stock||0} type="number" onChange={val=>{const nv=[...p.variants];nv[vi]={...nv[vi],stock:Number(val)};upd(p.id,"variants",nv);}} />
                    <button onClick={()=>{const nv=p.variants.filter((_,x)=>x!==vi);upd(p.id,"variants",nv);}} style={{ alignSelf:"end",background:"#fdeeee",color:"#d64545",border:"1px solid #f0c4c4",borderRadius:8,padding:"8px 0",fontFamily:FONT_T,fontSize:12,cursor:"pointer" }}>✕ Xóa loại</button>
                  </div>
                </div>
              </div>
            ))}
            <button onClick={()=>{const nv=[...(p.variants||[]),{id:"v_"+uid(),name:"",price:p.price||0,original:p.original||0,stock:0,img:""}];upd(p.id,"variants",nv);}} style={{ background:"#fff",color:S.brand[0].primary,border:`2px solid ${S.brand[0].primary}`,borderRadius:10,padding:"9px 16px",fontFamily:FONT_T,fontSize:12,cursor:"pointer" }}>+ Thêm phân loại</button>
          </div>

          {/* ── v20: Combo A/B/C (CHIỀU DỮ LIỆU MỚI, tách khỏi Phân loại) ──
              Phân loại của WBS vẫn là 5 MÙI — không đụng. Combo là gói bán
              (chai lẻ / combo vừa / combo lớn) hiện thành 3 thẻ ở trang chủ. */}
          <div style={{ marginTop:18,padding:16,background:"#fdf9ec",border:"2px dashed #e3ca22",borderRadius:14 }}>
            <div style={{ fontFamily:FONT_T,fontSize:13,color:"#5f6c8f",marginBottom:4 }}>🧩 Combo (khu sản phẩm trang chủ)</div>
            <div style={{ fontFamily:FONT_B,fontSize:12,color:"#5f6c8f",marginBottom:12 }}>
              Thẻ đầu nhóm ở trang chủ TỰ SINH từ sản phẩm gốc/phân loại — KHÔNG cần nhập lại chai lẻ ở đây.
              Chỉ thêm các GÓI (combo đôi, set...). KHO KHÔNG NHẬP TAY: khai &quot;Gồm những món nào trong kho&quot; —
              số còn bán được tự tính từ kho phân loại/SP gốc, bán combo trừ thẳng kho món con (1 nguồn duy nhất).
              Combo tick 🎨 &quot;Cho chọn mùi&quot; có thể thêm dòng kho &quot;Mùi khách chọn&quot;.
            </div>
            {(p.combos||[]).map((c,ci)=>(
              <div key={c.id||ci} style={{ background:"#fff",border:"1px solid #dbe2f1",borderRadius:12,padding:12,marginBottom:10 }}>
                <div style={{ display:"grid",gridTemplateColumns:"90px 1fr",gap:12 }}>
                  <ImgUp current={c.img} onUpload={val=>{const nc=[...p.combos];nc[ci]={...nc[ci],img:val};upd(p.id,"combos",nc);}} label="Ảnh" aspect="75%" folder="products" entityId={p.id+"_c"+ci} hint="Ngang 4:3 (VD 1200×900) — hiện phủ kín khung thẻ trang chủ" />
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
                    <Field label='Tên combo (VD: "Combo Tiết Kiệm")' value={c.name||""} onChange={val=>{const nc=[...p.combos];nc[ci]={...nc[ci],name:val};upd(p.id,"combos",nc);}} span="full" />
                    <Field label='Kicker (dòng nhỏ trên tên — VD: "Misty Fresh")' value={c.kicker||""} onChange={val=>{const nc=[...p.combos];nc[ci]={...nc[ci],kicker:val};upd(p.id,"combos",nc);}} span="full" />
                    <Field label="Giá bán (₫)" value={c.price||0} type="number" onChange={val=>{const nc=[...p.combos];nc[ci]={...nc[ci],price:Number(val)};upd(p.id,"combos",nc);}} />
                    <Field label="Giá gốc (₫)" value={c.original||0} type="number" onChange={val=>{const nc=[...p.combos];nc[ci]={...nc[ci],original:Number(val)};upd(p.id,"combos",nc);}} />
                    <Field label="Trong combo có gì — CHỮ HIỂN THỊ trên thẻ (MỖI DÒNG 1 MÓN)" value={(c.items||[]).join("\n")} rows={3} span="full" onChange={val=>{const nc=[...p.combos];nc[ci]={...nc[ci],items:val.split("\n")};upd(p.id,"combos",nc);}} placeholder={"1 Chai xịt 250ml\n1 Lõi refill 250ml"} />

                    {/* ── BOM: kho 1 nguồn ── */}
                    <div style={{ gridColumn:"1 / -1",background:"#f2f5fb",border:"1px solid #dbe2f1",borderRadius:10,padding:10 }}>
                      <div style={{ fontFamily:FONT_T,fontSize:12,color:"#18284e",marginBottom:6 }}>📦 Gồm những món nào trong kho (bán 1 combo trừ đúng từng món)</div>
                      {(c.bom||[]).map((b,bi)=>(
                        <div key={bi} style={{ display:"flex",gap:8,alignItems:"center",marginBottom:6 }}>
                          <select value={b.variantId||""} onChange={e=>{const nc=[...p.combos];const nb=[...(nc[ci].bom||[])];nb[bi]={...nb[bi],variantId:e.target.value};nc[ci]={...nc[ci],bom:nb};upd(p.id,"combos",nc);}} style={{ flex:1,padding:"7px 10px",borderRadius:8,border:"2px solid #dbe2f1",fontFamily:FONT_B,fontSize:13 }}>
                            <option value="">— Sản phẩm gốc —</option>
                            {(p.variants||[]).map(v=><option key={v.id} value={v.id}>{v.name||"(chưa tên)"} (kho {v.stock||0})</option>)}
                            {c.scentPick && <option value="*scent*">🎨 Mùi khách chọn</option>}
                          </select>
                          <span style={{ fontFamily:FONT_B,fontSize:12,color:"#5f6c8f" }}>×</span>
                          <input type="number" min={1} value={b.qty||1} onChange={e=>{const nc=[...p.combos];const nb=[...(nc[ci].bom||[])];nb[bi]={...nb[bi],qty:Number(e.target.value)||1};nc[ci]={...nc[ci],bom:nb};upd(p.id,"combos",nc);}} style={{ width:60,padding:"7px 8px",borderRadius:8,border:"2px solid #dbe2f1",fontFamily:FONT_B,fontSize:13,textAlign:"center" }} />
                          <button onClick={()=>{const nc=[...p.combos];const nb=(nc[ci].bom||[]).filter((_,x)=>x!==bi);nc[ci]={...nc[ci],bom:nb};upd(p.id,"combos",nc);}} style={{ background:"#fdeeee",color:"#d64545",border:"1px solid #f0c4c4",borderRadius:8,padding:"6px 10px",fontFamily:FONT_T,fontSize:12,cursor:"pointer" }}>✕</button>
                        </div>
                      ))}
                      <button onClick={()=>{const nc=[...p.combos];nc[ci]={...nc[ci],bom:[...(nc[ci].bom||[]),{variantId:(p.variants||[])[0]?.id||"",qty:1}]};upd(p.id,"combos",nc);}} style={{ background:"#fff",color:S.brand[0].primary,border:`2px solid ${S.brand[0].primary}`,borderRadius:8,padding:"6px 12px",fontFamily:FONT_T,fontSize:12,cursor:"pointer" }}>+ Thêm món</button>
                      {(c.bom||[]).length===0 && <div style={{ fontFamily:FONT_B,fontSize:11,color:"#d64545",marginTop:6 }}>⚠️ Chưa khai món nào — combo sẽ hiện HẾT HÀNG cho tới khi thêm món.</div>}
                    </div>

                    <label style={{ display:"flex",alignItems:"center",gap:7,fontFamily:FONT_T,fontSize:12.5,cursor:"pointer" }}>
                      <input type="checkbox" checked={!!c.best} onChange={e=>{const nc=[...p.combos];nc[ci]={...nc[ci],best:e.target.checked};upd(p.id,"combos",nc);}} />
                      ⭐ Best choice (viên vàng góc ảnh)
                    </label>
                    <label style={{ display:"flex",alignItems:"center",gap:7,fontFamily:FONT_T,fontSize:12.5,cursor:"pointer" }}>
                      <input type="checkbox" checked={!!c.scentPick} onChange={e=>{const nc=[...p.combos];nc[ci]={...nc[ci],scentPick:e.target.checked};upd(p.id,"combos",nc);}} />
                      🎨 Cho chọn mùi (SP có phân loại mùi/màu)
                    </label>
                    <button onClick={()=>{const nc=p.combos.filter((_,x)=>x!==ci);upd(p.id,"combos",nc);}} style={{ gridColumn:"1 / -1",background:"#fdeeee",color:"#d64545",border:"1px solid #f0c4c4",borderRadius:8,padding:"8px 0",fontFamily:FONT_T,fontSize:12,cursor:"pointer" }}>✕ Xóa combo</button>
                  </div>
                </div>
              </div>
            ))}
            <button onClick={()=>{const nc=[...(p.combos||[]),{id:"c_"+uid(),name:"",kicker:"",items:[],price:p.price||0,original:p.original||0,stock:0,best:false,scentPick:false,img:"",bom:[]}];upd(p.id,"combos",nc);}} style={{ background:"#fff",color:S.brand[0].primary,border:`2px solid ${S.brand[0].primary}`,borderRadius:10,padding:"9px 16px",fontFamily:FONT_T,fontSize:12,cursor:"pointer" }}>+ Thêm combo</button>
          </div>
          <div style={{ marginTop:12,display:"flex",alignItems:"center",gap:12 }}>
            <label style={{ display:"flex",alignItems:"center",gap:8,cursor:"pointer" }}>
              <input type="checkbox" checked={p.flashSale||false} onChange={e=>upd(p.id,"flashSale",e.target.checked)} />
              <span style={{ fontFamily:FONT_T,fontSize:13 }}>⚡ Flash Sale</span>
            </label>
            {p.flashSale&&(
              <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                <span style={{ fontFamily:FONT_B,fontSize:12,color:"#5f6c8f" }}>Kết thúc sau (giờ):</span>
                <input type="number" min={1} max={72} value={Math.max(1,Math.round((p.flashEnd-Date.now())/3600000))||4} onChange={e=>upd(p.id,"flashEnd",Date.now()+Number(e.target.value)*3600000)} style={{ width:60,padding:"6px 10px",borderRadius:8,border:"2px solid #dbe2f1",fontFamily:FONT_B,fontSize:13 }} />
              </div>
            )}
          </div>
          <div style={{ display:"flex",gap:10,marginTop:16 }}>
            <button disabled={saving} onClick={async()=>{
              // Assign a real id ONCE and use it consistently for both the DB
              // row and the local list. (The old logic borrowed the FIRST
              // product's id, silently overwriting it in the database.)
              const realId = p.id.startsWith("new") ? uid() : p.id;
              const toSave = { ...p, id: realId };
              const final  = list.map(x => x.id === p.id ? { ...x, id: realId } : x);
              setSaving(true); setSaveErr(null);
              try {
                await upsertProduct(toSave);
                setList(final); S.products[1](final);
                flash(); setEditing(null);
              } catch(e) {
                setSaveErr(e?.message || "Lưu thất bại — vui lòng thử lại");
              } finally {
                setSaving(false);
              }
            }} style={{ flex:1,background:S.brand[0].primary,color:"#fff",border:"none",borderRadius:12,padding:"12px 0",fontFamily:FONT_T,fontSize:14,cursor:saving?"not-allowed":"pointer",opacity:saving?0.7:1 }}>{saving?"⏳ Đang lưu...":"💾 Lưu"}</button>
            <DelBtn onClick={async()=>{
              setSaving(true); setSaveErr(null);
              try {
                try{ await deleteProduct(p.id); }catch(_){ /* junk id not on DB — still remove locally */ }
                const nl=list.filter(x=>x.id!==p.id);
                setList(nl); S.products[1](nl); setEditing(null);
              } catch(e) {
                setSaveErr(e?.message || "Xoá thất bại — vui lòng thử lại");
              } finally {
                setSaving(false);
              }
            }} />
          </div>
          {saveErr && <div style={{ marginTop:8,padding:"8px 12px",borderRadius:8,fontFamily:FONT_B,fontSize:12,background:"#fdeeee",color:"#d64545",border:"1px solid #f0c4c4" }}>❌ {saveErr}</div>}
        </div>
      );
    }
    return (
      <div>
        <SectionHeader title="📦 Sản Phẩm"><AddBtn onClick={()=>{const np={id:"new_"+uid(),name:"Sản Phẩm Mới",price:100000,original:130000,category:cats[0]||"Đồ ăn",rating:4.5,stock:10,flashSale:false,flashEnd:0,tags:"",story:"",img:"",reviews:[]};setList(l=>[...l,np]);setEditing(np.id);}} label="Thêm Sản Phẩm" /></SectionHeader>

        <div style={{ background:"#f2f5fb",border:"2px dashed #dbe2f1",borderRadius:14,padding:16,marginBottom:18 }}>
          <div style={{ fontFamily:FONT_T,fontSize:13,color:"#5f6c8f",marginBottom:10 }}>📊 Nhập hàng loạt qua CSV / Excel</div>
          <div style={{ fontFamily:FONT_B,fontSize:12,color:"#5f6c8f",marginBottom:12 }}>
            Bấm "Xuất CSV" để tải danh sách sản phẩm ĐÚNG THỰC TẾ hiện tại (tồn kho, giá, flash sale...). Sửa file đó rồi tải lên lại — các dòng giữ nguyên cột id nên sẽ được CẬP NHẬT đè lên đúng sản phẩm cũ (khớp theo id → SKU → tên), dòng mới thì được thêm vào. Upload lại cùng file bao nhiêu lần cũng không bị trùng. Cột ảnh dùng link trực tiếp.
          </div>
          <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
            <button onClick={exportProducts} style={{ background:"#22C55E",color:"#fff",border:"none",borderRadius:10,padding:"9px 16px",fontFamily:FONT_T,fontSize:12,cursor:"pointer" }}>📥 Xuất CSV (thực tế hiện tại)</button>
            <button onClick={downloadTemplate} style={{ background:"#fff",color:"#5f6c8f",border:"2px solid #dbe2f1",borderRadius:10,padding:"9px 16px",fontFamily:FONT_T,fontSize:12,cursor:"pointer" }}>⬇️ Tải file mẫu CSV</button>
            <button onClick={()=>fileRef.current?.click()} disabled={importing} style={{ background:S.brand[0].primary,color:"#fff",border:"none",borderRadius:10,padding:"9px 16px",fontFamily:FONT_T,fontSize:12,cursor:importing?"not-allowed":"pointer",opacity:importing?0.7:1 }}>
              {importing ? "⏳ Đang nhập..." : "📤 Tải file CSV lên"}
            </button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display:"none" }} onChange={e=>handleImport(e.target.files[0])} />
          </div>
          {importMsg && (
            <div style={{ marginTop:10,padding:"8px 12px",borderRadius:8,fontFamily:FONT_B,fontSize:12,
              background: importMsg.type==='success'?'#f0fdf4':importMsg.type==='warning'?'#fffbeb':'#fdeeee',
              color: importMsg.type==='success'?'#166534':importMsg.type==='warning'?'#92400e':'#d64545',
              border: `1px solid ${importMsg.type==='success'?'#86efac':importMsg.type==='warning'?'#fcd34d':'#f0c4c4'}` }}>
              {importMsg.type==='success'?'✅':importMsg.type==='warning'?'⚠️':'❌'} {importMsg.text}
            </div>
          )}
        </div>

        {list.map((p,i)=>(
          <div key={p.id} style={{ display:"flex",alignItems:"center",gap:14,padding:14,background:"#f8fafd",borderRadius:14,border:"2px solid #dbe2f1",marginBottom:10 }}>
            <div onClick={()=>setEditing(p.id)} style={{ width:56,height:56,borderRadius:10,overflow:"hidden",background:"#f2f5fb",flexShrink:0,cursor:"pointer" }}>
              {p.img?<img src={p.img} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }} />:<div style={{ width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24 }}>📦</div>}
            </div>
            <div onClick={()=>setEditing(p.id)} style={{ flex:1,cursor:"pointer" }}>
              <div style={{ fontFamily:FONT_T,fontSize:14,color:"#0d142e" }}>{p.name||"(chưa có tên)"}</div>
              <div style={{ fontFamily:FONT_B,fontSize:12,color:"#5f6c8f" }}>{fmt(p.price)} · {p.category} · tồn:{p.stock} {p.flashSale?"· ⚡":""}</div>
            </div>
            <Stars rating={p.rating} size={12} />
            <div style={{ display:"flex",flexDirection:"column",gap:3 }}>
              <button disabled={i===0} onClick={async()=>{
                const nl=[...list]; [nl[i-1],nl[i]]=[nl[i],nl[i-1]];
                setList(nl); S.products[1](nl);
                try{ await saveProductOrder(nl.map(x=>x.id)); }catch(e){ alert("Lỗi lưu thứ tự: "+e.message); }
              }} title="Đưa lên" style={{ background:"#f2f5fb",border:"1px solid #dbe2f1",borderRadius:6,padding:"2px 8px",fontSize:11,cursor:i===0?"not-allowed":"pointer",opacity:i===0?0.3:1,color:S.brand[0].primary }}>▲</button>
              <button disabled={i===list.length-1} onClick={async()=>{
                const nl=[...list]; [nl[i],nl[i+1]]=[nl[i+1],nl[i]];
                setList(nl); S.products[1](nl);
                try{ await saveProductOrder(nl.map(x=>x.id)); }catch(e){ alert("Lỗi lưu thứ tự: "+e.message); }
              }} title="Đưa xuống" style={{ background:"#f2f5fb",border:"1px solid #dbe2f1",borderRadius:6,padding:"2px 8px",fontSize:11,cursor:i===list.length-1?"not-allowed":"pointer",opacity:i===list.length-1?0.3:1,color:S.brand[0].primary }}>▼</button>
            </div>
            <div onClick={()=>setEditing(p.id)} style={{ background:"#f2f5fb",border:"2px solid #dbe2f1",color:S.brand[0].primary,borderRadius:8,padding:"6px 12px",fontFamily:FONT_T,fontSize:12,cursor:"pointer" }}>✏️</div>
            <button onClick={async()=>{
              if(!confirm(`Xoá sản phẩm "${p.name||'(chưa có tên)'}"?`)) return;
              try{ await deleteProduct(p.id); }catch(e){ /* ID rác không có trên DB — bỏ qua, vẫn xoá khỏi danh sách */ }
              const nl=list.filter(x=>x.id!==p.id);
              setList(nl); S.products[1](nl);
            }} title="Xoá sản phẩm" style={{ background:"#fdeeee",color:"#d64545",border:"1px solid #f0c4c4",borderRadius:8,padding:"6px 11px",fontFamily:FONT_T,fontSize:14,cursor:"pointer",flexShrink:0 }}>🗑</button>
          </div>
        ))}
      </div>
    );
  };

  // ── Tab: Categories ──
  const TabCats = () => {
    const [list,setList]=useState([...S.categories[0]]);
    const [newCat,setNewCat]=useState("");
    const [saving,setSaving]=useState(false);
    const [err,setErr]=useState(null);
    return (
      <div style={{ maxWidth:400 }}>
        <SectionHeader title="🏷 Categories Sản Phẩm" />
        <div style={{ display:"flex",gap:8,marginBottom:16 }}>
          <input value={newCat} onChange={e=>setNewCat(e.target.value)} placeholder="Tên danh mục mới..." style={{ flex:1,padding:"9px 12px",borderRadius:10,border:"2px solid #dbe2f1",fontFamily:FONT_B,fontSize:13 }} />
          <PrimaryBtn onClick={()=>{if(newCat.trim()&&!list.includes(newCat.trim())){setList(l=>[...l,newCat.trim()]);setNewCat("");}}} label="+ Thêm" />
        </div>
        {list.map(c=>(
          <div key={c} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",background:"#f8fafd",borderRadius:10,border:"2px solid #dbe2f1",marginBottom:8 }}>
            <span style={{ fontFamily:FONT_T,fontSize:14,color:"#0d142e" }}>{c}</span>
            <DelBtn onClick={()=>setList(l=>l.filter(x=>x!==c))} />
          </div>
        ))}
        {err&&<div style={{ marginBottom:10,padding:"8px 12px",borderRadius:8,fontFamily:FONT_B,fontSize:12,background:"#fdeeee",color:"#d64545",border:"1px solid #f0c4c4" }}>❌ {err}</div>}
        <button disabled={saving} onClick={async()=>{
          setSaving(true); setErr(null);
          try {
            await saveCategories(list);
            S.categories[1](list);
            flash();
          } catch(e) {
            setErr('Lưu thất bại: ' + e.message);
          } finally {
            setSaving(false);
          }
        }} style={{ background:S.brand[0].primary,color:"#fff",border:"none",borderRadius:12,padding:"12px 0",fontFamily:FONT_T,fontSize:14,cursor:saving?"not-allowed":"pointer",width:"100%",opacity:saving?0.7:1 }}>
          {saving?"⏳ Đang lưu...":saved?"✅ Đã lưu!":"💾 Lưu"}
        </button>
      </div>
    );
  };

  // ── Tab: Vouchers ──
  const TabVouchers = () => {
    const [list,setList]=useState([]);
    const [loading,setLoading]=useState(true);
    const [loadErr,setLoadErr]=useState(null);
    const upd=(id,k,v)=>setList(l=>l.map(x=>x.id===id?{...x,[k]:v}:x));
    useEffect(()=>{
      getVouchers().then(vs=>{ setList(vs); setLoading(false); })
        .catch(e=>{ setLoadErr('Không tải được mã: '+e.message+' (đã chạy VOUCHERS_PRIVATE_SQL.sql chưa?)'); setLoading(false); });
    },[]);
    if (loading) return <div style={{ fontFamily:FONT_B,fontSize:13,color:'#5f6c8f',padding:'20px 0' }}>⏳ Đang tải mã giảm giá...</div>;
    return (
      <div style={{ maxWidth:480 }}>
        <SectionHeader title="🎟 Mã Giảm Giá"><AddBtn onClick={()=>setList(l=>[...l,{id:'new_'+uid(),code:"CODE"+Math.floor(Math.random()*100),pct:10}])} label="Thêm mã" /></SectionHeader>
        <div style={{ fontFamily:FONT_B,fontSize:11,color:'#5f6c8f',marginBottom:12,background:'#f0fdf4',border:'1px solid #86efac',borderRadius:8,padding:'8px 12px' }}>🔒 Mã giảm giá giờ được lưu riêng tư — khách không đọc trộm được qua API nữa.</div>
        {loadErr&&<div style={{ marginBottom:12,padding:'8px 12px',borderRadius:8,fontFamily:FONT_B,fontSize:12,background:'#fdeeee',color:'#d64545',border:'1px solid #f0c4c4' }}>❌ {loadErr}</div>}
        {list.map(v=>(
          <div key={v.id} style={{ display:"grid",gridTemplateColumns:"2fr 1fr auto",gap:10,alignItems:"end",padding:"12px 14px",background:"#f8fafd",borderRadius:12,border:"2px solid #dbe2f1",marginBottom:10 }}>
            <Field label="Mã"       value={v.code} onChange={val=>upd(v.id,"code",val.toUpperCase())} />
            <Field label="Giảm giá (%)"      value={v.pct}  onChange={val=>upd(v.id,"pct",Number(val))} type="number" />
            <div style={{ paddingBottom:2 }}><DelBtn onClick={()=>setList(l=>l.filter(x=>x.id!==v.id))} /></div>
          </div>
        ))}
        <SaveBtn onSave={async ()=>{await saveVouchers(list); const fresh=await getVouchers(); setList(fresh); flash();}} saved={saved} />
      </div>
    );
  };


  return (
    <div style={{ minHeight:'100vh', background:'#f2f5fb', fontFamily:FONT_B }}>
      <style>{`
        .hh-admin-content :is([style*="gridTemplateColumns"]) {}
        @media (max-width:640px){
          .hh-admin-grid2{ grid-template-columns:1fr !important }
          .hh-admin-grid3{ grid-template-columns:1fr !important }
          .hh-admin-grid4{ grid-template-columns:1fr 1fr !important }
          .hh-admin-content{ padding:18px 14px !important }
          .hh-admin-top{ padding:0 12px !important; gap:8px !important }
          .hh-admin-top span{ font-size:14px !important }
          .hh-admin-top a, .hh-admin-top button{ padding:6px 10px !important; font-size:11px !important }
        }
      `}</style>
      {/* Top bar */}
      <div className="hh-admin-top" style={{ background:'#0d142e', padding:'0 24px', display:'flex', alignItems:'center', gap:14, height:56, position:'sticky', top:0, zIndex:100, overflowX:'auto' }}>
        <HHLogo primary={PRIMARY} size={32} />
        <span style={{ fontFamily:FONT_T, fontSize:18, color:'#fff', whiteSpace:'nowrap' }}>Hanapet Admin</span>
        <div style={{ flex:1 }} />
        {saved && <span style={{ fontFamily:FONT_T, fontSize:12, color:'#ffffff', whiteSpace:'nowrap' }}>✅ Đã lưu!</span>}
        <a href="/" target="_blank" style={{ background:'transparent', border:'1px solid rgba(255,255,255,0.2)', borderRadius:8, padding:'5px 12px', color:'rgba(255,255,255,0.7)', cursor:'pointer', fontFamily:FONT_T, fontSize:12, textDecoration:'none', whiteSpace:'nowrap' }}>🏠 Cửa hàng</a>
        <button onClick={signOut} style={{ background:'#1b295b', border:'none', borderRadius:8, padding:'6px 16px', color:'#fff', cursor:'pointer', fontFamily:FONT_T, fontSize:13, fontWeight:700, whiteSpace:'nowrap' }}>🚪 Đăng xuất</button>
      </div>

      {/* Tab bar */}
      <div style={{ display:'flex', overflowX:'auto', borderBottom:'3px solid #dbe2f1', background:'#f8fafd', position:'sticky', top:56, zIndex:99, WebkitOverflowScrolling:'touch' }}>
        {TABS.map(([key, label, badge]) => (
          <button key={key} onClick={() => setTab(key)} style={{ padding:'11px 16px', background: tab===key ? PRIMARY : 'transparent', color: tab===key ? '#fff' : '#5f6c8f', border:'none', fontFamily:FONT_T, fontSize:12, cursor:'pointer', whiteSpace:'nowrap', borderBottom: tab===key ? `3px solid ${PRIMARY}` : '3px solid transparent', transition:'all 0.15s', flexShrink:0, position:'relative' }}>
            {label}
            {badge > 0 && <span style={{ marginLeft:5, background:'#EF4444', color:'#fff', borderRadius:10, padding:'1px 6px', fontSize:10 }}>{badge}</span>}
          </button>
        ))}
      </div>

      {/* Sub-tab bar (for grouped tabs) */}
      {SUBTABS[tab] && (
        <div style={{ display:'flex', gap:6, overflowX:'auto', padding:'10px 20px', background:'#eef1fa', borderBottom:'1px solid #dbe2f1', position:'sticky', top:101, zIndex:98 }}>
          {SUBTABS[tab].map(([key,label])=>{
            const on = (sub[tab]||SUBTABS[tab][0][0])===key;
            return <button key={key} onClick={()=>setSub(s=>({...s,[tab]:key}))} style={{ padding:'7px 16px', borderRadius:999, background:on?PRIMARY:'#fff', color:on?'#fff':'#5f6c8f', border:'1px solid '+(on?PRIMARY:'#dbe2f1'), fontFamily:FONT_T, fontWeight:700, fontSize:12, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 }}>{label}</button>;
          })}
        </div>
      )}

      {/* Content */}
      <div className="hh-admin-content" style={{ maxWidth:900, margin:'0 auto', padding:'28px 20px', boxSizing:'border-box' }}>
        {tab==='orders'     && <TabOrders S={S} />}
        {tab==='inventory'  && <TabInventory S={S} />}
        {tab==='products'   && <TabProducts />}

        {tab==='home'  && <TabHome />}

        {tab==='brand' && <TabBrand />}

        {tab==='promo' && (sub.promo||'vouchers')==='vouchers' && <TabVouchers />}
        {tab==='promo' && sub.promo==='categories'       && <TabCats />}
      </div>
    </div>
  )
}
