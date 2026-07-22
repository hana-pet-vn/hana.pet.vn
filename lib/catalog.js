// lib/catalog.js
// ─────────────────────────────────────────────────────────────────────────────
// Nguồn dữ liệu sản phẩm DUY NHẤT cho storefront: bảng `products` trong Supabase
// (đúng bảng mà admin panel ghi vào). Trước đây trang chủ hardcode DEFAULTS và
// đọc site_config key 'home' — key đó admin không bao giờ ghi, nên sửa gì trong
// admin cũng không hiện ra ngoài. Đây là chỗ sửa gốc.
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js';
import { slugify } from './cart';

export const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function normalize(r) {
  const variants = (Array.isArray(r.variants) ? r.variants : []).map(v => ({
    id: v.id || '',
    name: v.name || '',
    price: Number(v.price) || 0,
    original: Number(v.original) || 0,
    stock: Number(v.stock) || 0,
    img: v.img || '',
  }));
  /* v20: combos = CHIỀU DỮ LIỆU MỚI, tách khỏi variants.
     variants của WBS vẫn là 5 MÙI (scents map theo tên) — không đụng.
     Mỗi combo: {id,name,kicker,items[],price,original,stock,best,scentPick,img} */
  const combos = (Array.isArray(r.combos) ? r.combos : []).map(c => ({
    id: c.id || '',
    name: c.name || '',
    kicker: c.kicker || '',
    items: Array.isArray(c.items) ? c.items : [],
    price: Number(c.price) || 0,
    original: Number(c.original) || 0,
    stock: Number(c.stock) || 0,
    best: !!c.best,
    scentPick: !!c.scentPick,
    img: c.img || '',
  }));
  return {
    id: r.id,
    name: r.name || '',
    slug: slugify(r.name || r.id),
    price: Number(r.price) || 0,
    original: Number(r.original) || 0,
    category: r.category || '',
    rating: Number(r.rating) || 0,
    stock: Number(r.stock) || 0,
    sku: r.sku || '',
    tags: r.tags || '',
    story: r.story || '',
    subtitle: r.subtitle || '',
    img: r.img || '',
    imgMobile: r.img_mobile || '',
    images: Array.isArray(r.images) ? r.images : [],
    reviews: Array.isArray(r.reviews) ? r.reviews : [],
    videoUrl: r.video_url || r.tiktok_url || '',
    variants,
    combos,
    variantLabel: r.variant_label || 'Chọn loại',
    flashSale: !!r.flash_sale,
    flashEnd: Number(r.flash_end) || 0,
    sortOrder: Number(r.sort_order) || 0,
  };
}

// Tổng tồn kho: nếu có phân loại thì cộng tồn của các phân loại
export const totalStock = p =>
  p.variants.length ? p.variants.reduce((s, v) => s + v.stock, 0) : p.stock;

// Giá hiển thị: phân loại rẻ nhất, hoặc giá gốc của sản phẩm
export const displayPrice = p =>
  p.variants.length ? Math.min(...p.variants.map(v => v.price)) : p.price;

export const displayOriginal = p => {
  if (!p.variants.length) return p.original;
  const cheapest = p.variants.reduce((a, b) => (a.price <= b.price ? a : b));
  return cheapest.original;
};

// Tìm sản phẩm trong bảng products theo "khóa" ghi trong config.
// Khớp theo thứ tự: id → mã SP (sku) → tên có chứa khóa → tên hiển thị.
// Nhờ vậy ngài đặt tên sản phẩm trong admin thế nào cũng khớp được,
// miễn tên có chứa từ khóa (VD khóa "misty" khớp "Misty Fresh — Xịt khử mùi").
export function matchProduct(products, key, fallbackName) {
  if (!products?.length) return null;
  const norm = s => String(s || '').toLowerCase().trim();
  const k = norm(key);

  if (k) {
    const byId = products.find(p => norm(p.id) === k);
    if (byId) return byId;
    const bySku = products.find(p => p.sku && norm(p.sku) === k);
    if (bySku) return bySku;
    const byName = products.find(p => norm(p.name).includes(k));
    if (byName) return byName;
    const bySlug = products.find(p => p.slug.includes(k.replace(/\s+/g, '-')));
    if (bySlug) return bySlug;
  }

  const f = norm(fallbackName);
  if (f) {
    const exact = products.find(p => norm(p.name) === f);
    if (exact) return exact;
    // so khớp lỏng: lấy từ đầu tiên của tên hiển thị
    const firstWord = f.split(/[\s—-]+/)[0];
    if (firstWord.length > 2) {
      const loose = products.find(p => norm(p.name).includes(firstWord));
      if (loose) return loose;
    }
  }
  return null;
}

export async function fetchProducts() {
  const { data, error } = await sb
    .from('products').select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) { console.error('fetchProducts:', error.message); return []; }
  return (data || []).map(normalize);
}

export async function fetchProductBySlug(slug) {
  const all = await fetchProducts();
  return all.find(p => p.slug === slug) || all.find(p => p.id === slug) || null;
}

// site_config vẫn dùng cho phần nội dung tĩnh (hero text, about, footer...)
export async function fetchConfig(key) {
  const { data } = await sb.from('site_config').select('value').eq('key', key).maybeSingle();
  return data?.value || null;
}
