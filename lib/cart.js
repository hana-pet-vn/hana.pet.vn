'use client';
// lib/cart.js
// ─────────────────────────────────────────────────────────────────────────────
// Giỏ hàng dùng chung cho toàn site. Lưu vào localStorage nên không mất khi
// reload / chuyển trang. Mọi component đọc qua useCart().
//
// Mỗi dòng trong giỏ:
//   { productId, variantId, qty, name, variantName, price, img }
// productId + variantId là khóa duy nhất (cùng sản phẩm khác phân loại = 2 dòng)
// ─────────────────────────────────────────────────────────────────────────────
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

const KEY = 'hanapet_cart_v1';
const CartCtx = createContext(null);

function readLS() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter(l => l && l.productId && l.qty > 0) : [];
  } catch { return []; }
}

export function CartProvider({ children }) {
  const [lines, setLines] = useState([]);
  const [hydrated, setHydrated] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [flash, setFlash] = useState(null); // { name } — hiện toast sau khi thêm

  // Nạp từ localStorage sau khi mount (tránh lệch SSR/client)
  useEffect(() => { setLines(readLS()); setHydrated(true); }, []);

  // Ghi lại mỗi khi đổi
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch {}
  }, [lines, hydrated]);

  // Đồng bộ giữa nhiều tab
  useEffect(() => {
    const onStorage = e => { if (e.key === KEY) setLines(readLS()); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const add = useCallback((item, qty = 1) => {
    const vid = item.variantId || '';
    setLines(prev => {
      const i = prev.findIndex(l => l.productId === item.productId && (l.variantId || '') === vid);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], qty: next[i].qty + qty };
        return next;
      }
      return [...prev, {
        productId: item.productId,
        variantId: vid,
        qty,
        name: item.name || '',
        variantName: item.variantName || '',
        price: Number(item.price) || 0,
        img: item.img || '',
      }];
    });
    setFlash({ name: item.variantName ? `${item.name} — ${item.variantName}` : item.name });
    setTimeout(() => setFlash(null), 2200);
  }, []);

  const setQty = useCallback((productId, variantId, qty) => {
    const vid = variantId || '';
    setLines(prev => qty <= 0
      ? prev.filter(l => !(l.productId === productId && (l.variantId || '') === vid))
      : prev.map(l => (l.productId === productId && (l.variantId || '') === vid) ? { ...l, qty } : l));
  }, []);

  const remove = useCallback((productId, variantId) => setQty(productId, variantId, 0), [setQty]);
  const clear  = useCallback(() => setLines([]), []);

  const count    = useMemo(() => lines.reduce((s, l) => s + l.qty, 0), [lines]);
  const subtotal = useMemo(() => lines.reduce((s, l) => s + l.price * l.qty, 0), [lines]);

  const value = {
    lines, add, setQty, remove, clear, count, subtotal, hydrated,
    drawer, openDrawer: () => setDrawer(true), closeDrawer: () => setDrawer(false),
    flash,
  };
  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error('useCart phải nằm trong <CartProvider>');
  return ctx;
}

export const vnd = n => (Number(n) || 0).toLocaleString('vi-VN') + '₫';

// Tạo slug từ tên sản phẩm — dùng cho URL /san-pham/[slug]
export function slugify(s = '') {
  return String(s)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
