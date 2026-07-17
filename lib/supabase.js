import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL      || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

export async function adminSignIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.user
}
export async function adminSignOut() { await supabase.auth.signOut() }
export async function getAdminSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function getProducts() {
  const { data, error } = await supabase.from('products').select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return data.map(dbToProduct)
}
export async function upsertProduct(p) {
  const { error } = await supabase.from('products').upsert({
    id: p.id, name: p.name, price: p.price, original: p.original,
    category: p.category, rating: p.rating, stock: p.stock,
    min_stock: p.minStock ?? 5, sku: p.sku ?? '',
    flash_sale: p.flashSale ?? false, flash_end: p.flashEnd ?? 0,
    tags: p.tags ?? '', story: p.story ?? '', subtitle: p.subtitle ?? '', product_font: p.productFont ?? '', img: p.img ?? '', img_mobile: p.imgMobile ?? '', tiktok_url: p.tiktokUrl ?? '', video_url: p.videoUrl ?? p.tiktokUrl ?? '', sort_order: p.sortOrder ?? Date.now(),
    images: p.images ?? [], reviews: p.reviews ?? [],
    banner: p.banner ?? '', banner_video: p.bannerVideo ?? '', banner_text: p.bannerText ?? '',
    variants: p.variants ?? [], variant_label: p.variantLabel ?? '',
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
}
export async function deleteProduct(id) {
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
}
export async function saveProductOrder(orderedIds) {
  // Persist the manual order: position in the array becomes sort_order (1-based).
  const updates = orderedIds.map((id, i) =>
    supabase.from('products').update({ sort_order: i + 1 }).eq('id', id)
  )
  const results = await Promise.all(updates)
  const failed = results.find(r => r.error)
  if (failed) throw failed.error
}
export async function updateProductStock(id, newStock) {
  const { error } = await supabase.from('products')
    .update({ stock: newStock, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function getOrders() {
  const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data.map(dbToOrder)
}
export async function createOrder(o) {
  const { error } = await supabase.from('orders').insert({
    id: o.id, code: o.code, status: 'Pending',
    customer: o.customer, items: o.items, total: o.total,
    discount: o.discount ?? 0, disc_pct: o.discPct ?? 0,
    voucher: o.voucher ?? '', shipping: o.shipping ?? 'GHN',
    tracking_code: '', est_delivery: '', source: o.source ?? 'website', note: '',
  })
  if (error) throw error
}
export async function updateOrderDB(id, patch) {
  const dbPatch = { updated_at: new Date().toISOString() }
  if (patch.status       !== undefined) dbPatch.status        = patch.status
  if (patch.trackingCode !== undefined) dbPatch.tracking_code = patch.trackingCode
  if (patch.shipping     !== undefined) dbPatch.shipping      = patch.shipping
  if (patch.estDelivery  !== undefined) dbPatch.est_delivery  = patch.estDelivery
  if (patch.note         !== undefined) dbPatch.note          = patch.note
  if (patch.source       !== undefined) dbPatch.source        = patch.source
  const { error } = await supabase.from('orders').update(dbPatch).eq('id', id)
  if (error) throw error
}

export async function getAllConfigs() {
  const { data, error } = await supabase.from('site_config').select('*')
  if (error) return {}
  return Object.fromEntries(data.map(r => [r.key, r.value]))
}
export async function setConfig(key, value) {
  const { error } = await supabase.from('site_config')
    .upsert({ key, value, updated_at: new Date().toISOString() })
  if (error) throw error
}
export async function getCategories() {
  const { data, error } = await supabase.from('categories').select('name').order('id')
  if (error) return ['Keychain', 'Figure']
  return data.map(r => r.name)
}
export async function saveCategories(names) {
  // Replace the whole category list (small table — simpler than diffing add/remove).
  const clean = [...new Set((names || []).map(n => String(n).trim()).filter(Boolean))]
  const { error: delErr } = await supabase.from('categories').delete().not('id', 'is', null)
  if (delErr) throw delErr
  if (clean.length === 0) return
  const { error: insErr } = await supabase.from('categories').insert(clean.map(name => ({ name })))
  if (insErr) throw insErr
}
export async function addSubscriber(name, email) {
  const { error } = await supabase.from('subscribers').insert({ name, email })
  if (error && error.code !== '23505') throw error
}
// ── Vouchers (admin-only; storefront never reads this directly) ──────────────
export async function getVouchers() {
  const { data, error } = await supabase.from('vouchers').select('id, code, pct').order('id')
  if (error) throw error
  return data || []
}
export async function saveVouchers(list) {
  // Replace the whole voucher list (small table).
  const clean = (list || [])
    .map(v => ({ code: String(v.code || '').trim().toUpperCase(), pct: Number(v.pct) || 0 }))
    .filter(v => v.code)
  const { error: delErr } = await supabase.from('vouchers').delete().not('id', 'is', null)
  if (delErr) throw delErr
  if (clean.length === 0) return
  const { error: insErr } = await supabase.from('vouchers').insert(clean)
  if (insErr) throw insErr
}

function dbToProduct(r) {
  return {
    id: r.id, name: r.name, price: r.price, original: r.original,
    category: r.category, rating: Number(r.rating), stock: r.stock,
    minStock: r.min_stock, sku: r.sku, flashSale: r.flash_sale,
    flashEnd: r.flash_end, tags: r.tags, story: r.story, subtitle: r.subtitle ?? '', productFont: r.product_font ?? '', img: r.img, imgMobile: r.img_mobile ?? '', tiktokUrl: r.tiktok_url ?? '', videoUrl: r.video_url ?? r.tiktok_url ?? '', sortOrder: r.sort_order ?? 0,
    images: r.images ?? [], reviews: r.reviews ?? [],
    banner: r.banner ?? '', bannerVideo: r.banner_video ?? '', bannerText: r.banner_text ?? '',
    variants: r.variants ?? [], variantLabel: r.variant_label ?? '',
  }
}
function dbToOrder(r) {
  return {
    id: r.id, code: r.code, status: r.status,
    customer: r.customer, items: r.items, total: r.total,
    subtotal: r.subtotal, shippingFee: r.shipping_fee,
    discount: r.discount, discPct: r.disc_pct, voucher: r.voucher,
    shipping: r.shipping, trackingCode: r.tracking_code,
    estDelivery: r.est_delivery, source: r.source, note: r.note,
    date: new Date(r.created_at).toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }),
    createdAt: new Date(r.created_at).getTime(),
  }
}
