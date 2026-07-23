'use client';
// app/thanh-toan/page.js
// ─────────────────────────────────────────────────────────────────────────────
// Thanh toán đầy đủ, nối vào API đã có sẵn trong dự án:
//   GET  /api/shipping/provinces|districts|wards   → dropdown địa chỉ GHN
//   POST /api/shipping/fee                         → phí ship theo địa chỉ
//   POST /api/voucher/validate                     → kiểm tra mã giảm giá
//   POST /api/orders/create                        → tạo đơn (server tự tính lại
//                                                    giá từ DB, trừ kho, gửi mail)
// Giá hiển thị ở đây chỉ để khách xem — server luôn tính lại, không tin client.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCart, vnd } from '../../lib/cart';
import { fetchConfig } from '../../lib/catalog';

const T = {
  brandName: 'Hanapet', txtCheckout: 'Thanh toán', txtSubtotal: 'Tạm tính',
  txtShipFee: 'Phí vận chuyển', txtTotal: 'Tổng cộng', txtPlaceOrder: 'Đặt hàng',
  txtCOD: 'Thanh toán khi nhận hàng (COD)',
  txtCODNote: 'Trả tiền mặt cho shipper khi nhận. Kiểm tra hàng trước khi thanh toán.',
  coBack: '← Về giỏ hàng', coReceiver: 'Thông tin người nhận', coAddress: 'Địa chỉ giao hàng',
  coYourOrder: 'Đơn của ngài', coVoucher: 'Mã giảm giá', coApply: 'Áp dụng',
  coHint: 'Điền đủ tên, số điện thoại và địa chỉ để đặt hàng.',
  trustPoints: ['Đổi trả trong 7 ngày', 'Giao Hà Nội trong 24h'],
};

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, subtotal, clear, hydrated } = useCart();
  const [S, setS] = useState(T);

  const [f, setF] = useState({ name: '', phone: '', email: '', address: '', note: '' });
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [prov, setProv] = useState(null);   // { id, name }
  const [dist, setDist] = useState(null);
  const [ward, setWard] = useState(null);

  const [fee, setFee] = useState(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const [voucher, setVoucher] = useState('');
  const [voucherPct, setVoucherPct] = useState(0);
  const [voucherMsg, setVoucherMsg] = useState('');
  const [checkingV, setCheckingV] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const set = (k, v) => setF(x => ({ ...x, [k]: v }));

  // Giỏ trống → về trang giỏ hàng
  useEffect(() => {
    if (hydrated && lines.length === 0) router.replace('/gio-hang');
  }, [hydrated, lines.length, router]);

  useEffect(() => {
    let alive = true;
    fetchConfig('home').then(c => { if (alive && c) setS(x => ({ ...x, ...c })); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  // Tỉnh/thành
  useEffect(() => {
    fetch('/api/shipping/provinces')
      .then(r => r.json())
      .then(d => setProvinces(Array.isArray(d) ? d : []))
      .catch(() => setProvinces([]));
  }, []);

  // Quận/huyện theo tỉnh
  useEffect(() => {
    setDistricts([]); setDist(null); setWards([]); setWard(null); setFee(null);
    if (!prov) return;
    fetch(`/api/shipping/districts?province_id=${prov.id}`)
      .then(r => r.json())
      .then(d => setDistricts(Array.isArray(d) ? d : []))
      .catch(() => setDistricts([]));
  }, [prov]);

  // Phường/xã theo quận
  useEffect(() => {
    setWards([]); setWard(null); setFee(null);
    if (!dist) return;
    fetch(`/api/shipping/wards?district_id=${dist.id}`)
      .then(r => r.json())
      .then(d => setWards(Array.isArray(d) ? d : []))
      .catch(() => setWards([]));
  }, [dist]);

  // Tính phí ship khi đủ địa chỉ
  useEffect(() => {
    if (!dist || !ward) { setFee(null); return; }
    let alive = true;
    setFeeLoading(true);
    fetch('/api/shipping/fee', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toDistrictId: dist.id,
        toWardCode: ward.code,
        weight: lines.reduce((s, l) => s + l.qty * 150, 0),
        insuranceValue: subtotal,
      }),
    })
      .then(r => r.json())
      .then(d => { if (alive) setFee(typeof d.fee === 'number' ? d.fee : 30000); })
      .catch(() => { if (alive) setFee(30000); })
      .finally(() => { if (alive) setFeeLoading(false); });
    return () => { alive = false; };
  }, [dist, ward, lines, subtotal]);

  const applyVoucher = useCallback(async () => {
    const code = voucher.trim().toUpperCase();
    if (!code) return;
    setCheckingV(true); setVoucherMsg('');
    try {
      const r = await fetch('/api/voucher/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const d = await r.json();
      if (d.valid) { setVoucherPct(d.pct); setVoucherMsg(`✓ Giảm ${d.pct}%`); }
      else { setVoucherPct(0); setVoucherMsg('Mã không hợp lệ'); }
    } catch {
      setVoucherPct(0); setVoucherMsg('Không kiểm tra được mã, thử lại sau');
    } finally { setCheckingV(false); }
  }, [voucher]);

  const discount = Math.round(subtotal * voucherPct / 100);
  const total = subtotal - discount + (fee ?? 0);

  const valid = f.name.trim() && /^0\d{8,10}$/.test(f.phone.trim()) &&
                f.address.trim() && prov && dist && ward;

  const submit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true); setErr('');
    try {
      const r = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: lines.map(l => ({ productId: l.productId, variantId: l.variantId || undefined, variantName: l.variantName || undefined, scentId: l.scentId || undefined, qty: l.qty })),
          customer: {
            name: f.name.trim(), phone: f.phone.trim(), email: f.email.trim(),
            address: f.address.trim(),
            provinceId: prov.id, provinceName: prov.name,
            districtId: dist.id, districtName: dist.name,
            wardCode: ward.code, wardName: ward.name,
          },
          voucherCode: voucherPct > 0 ? voucher.trim().toUpperCase() : '',
          shippingProvider: 'GHN',
          note: f.note.trim(),
        }),
      });
      const d = await r.json();
      if (!r.ok || d.error) { setErr(d.error || 'Không tạo được đơn. Thử lại nhé.'); setSubmitting(false); return; }
      clear();
      router.push(`/dat-hang-thanh-cong?code=${encodeURIComponent(d.orderCode)}&total=${d.total}`);
    } catch {
      setErr('Lỗi kết nối. Kiểm tra mạng rồi thử lại.');
      setSubmitting(false);
    }
  };

  if (!hydrated) return <div className="co-load">Đang tải…<Styles /></div>;
  if (lines.length === 0) return <div className="co-load">Giỏ hàng trống, đang chuyển…<Styles /></div>;

  return (
    <>
      <header className="co-nav">
        <a className="co-brand" href="/">{S.brandName}</a>
        <a className="co-back" href="/gio-hang">{S.coBack}</a>
      </header>

      <main className="co-wrap">
        <h1>{S.txtCheckout}</h1>

        <div className="co-grid">
          {/* FORM */}
          <div className="co-form">
            <section>
              <h2>{S.coReceiver}</h2>
              <div className="co-fields">
                <label className="full">
                  <span>Họ và tên *</span>
                  <input value={f.name} onChange={e => set('name', e.target.value)} placeholder="Nguyễn Văn A" />
                </label>
                <label>
                  <span>Số điện thoại *</span>
                  <input value={f.phone} onChange={e => set('phone', e.target.value)}
                         placeholder="0912345678" inputMode="numeric" />
                </label>
                <label>
                  <span>Email (nhận xác nhận đơn)</span>
                  <input value={f.email} onChange={e => set('email', e.target.value)}
                         placeholder="ban@email.com" type="email" />
                </label>
              </div>
            </section>

            <section>
              <h2>{S.coAddress}</h2>
              <div className="co-fields">
                <label>
                  <span>Tỉnh / Thành phố *</span>
                  <select value={prov?.id || ''}
                          onChange={e => {
                            const p = provinces.find(x => String(x.ProvinceID) === e.target.value);
                            setProv(p ? { id: p.ProvinceID, name: p.ProvinceName } : null);
                          }}>
                    <option value="">— Chọn tỉnh/thành —</option>
                    {provinces.map(p => (
                      <option key={p.ProvinceID} value={p.ProvinceID}>{p.ProvinceName}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Quận / Huyện *</span>
                  <select value={dist?.id || ''} disabled={!prov}
                          onChange={e => {
                            const d = districts.find(x => String(x.DistrictID) === e.target.value);
                            setDist(d ? { id: d.DistrictID, name: d.DistrictName } : null);
                          }}>
                    <option value="">{prov ? '— Chọn quận/huyện —' : 'Chọn tỉnh trước'}</option>
                    {districts.map(d => (
                      <option key={d.DistrictID} value={d.DistrictID}>{d.DistrictName}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Phường / Xã *</span>
                  <select value={ward?.code || ''} disabled={!dist}
                          onChange={e => {
                            const w = wards.find(x => String(x.WardCode) === e.target.value);
                            setWard(w ? { code: w.WardCode, name: w.WardName } : null);
                          }}>
                    <option value="">{dist ? '— Chọn phường/xã —' : 'Chọn quận trước'}</option>
                    {wards.map(w => (
                      <option key={w.WardCode} value={w.WardCode}>{w.WardName}</option>
                    ))}
                  </select>
                </label>
                <label className="full">
                  <span>Địa chỉ cụ thể *</span>
                  <input value={f.address} onChange={e => set('address', e.target.value)}
                         placeholder="Số nhà, tên đường, tòa nhà…" />
                </label>
                <label className="full">
                  <span>Ghi chú cho shipper</span>
                  <textarea value={f.note} onChange={e => set('note', e.target.value)} rows={3}
                            placeholder="Giao giờ hành chính, gọi trước khi đến…" />
                </label>
              </div>
            </section>

            <section>
              <h2>{S.txtCheckout}</h2>
              <div className="co-pay">
                <input type="radio" checked readOnly id="cod" />
                <label htmlFor="cod">
                  <b>{S.txtCOD}</b>
                  <span>{S.txtCODNote}</span>
                </label>
              </div>
            </section>
          </div>

          {/* TÓM TẮT */}
          <aside className="co-sum">
            <h2>{S.coYourOrder}</h2>

            <div className="co-items">
              {lines.map(l => (
                <div className="co-item" key={l.productId + '|' + (l.variantId || '')}>
                  <div className="co-ith">
                    {l.img ? <img src={l.img} alt="" /> : <span>🐾</span>}
                    <em>{l.qty}</em>
                  </div>
                  <div className="co-itx">
                    <b>{l.name}</b>
                    {l.variantName && <span>{l.variantName}</span>}
                  </div>
                  <div className="co-itp">{vnd(l.price * l.qty)}</div>
                </div>
              ))}
            </div>

            <div className="co-vch">
              <input value={voucher} onChange={e => setVoucher(e.target.value)}
                     placeholder={S.coVoucher} onKeyDown={e => e.key === 'Enter' && applyVoucher()} />
              <button onClick={applyVoucher} disabled={checkingV || !voucher.trim()}>
                {checkingV ? '…' : S.coApply}
              </button>
            </div>
            {voucherMsg && (
              <p className={'co-vmsg' + (voucherPct > 0 ? ' ok' : '')}>{voucherMsg}</p>
            )}

            <div className="co-rows">
              <div><span>{S.txtSubtotal}</span><b>{vnd(subtotal)}</b></div>
              {discount > 0 && <div className="disc"><span>Giảm giá ({voucherPct}%)</span><b>−{vnd(discount)}</b></div>}
              <div>
                <span>{S.txtShipFee}</span>
                <b>{feeLoading ? 'Đang tính…' : fee === null ? 'Chọn địa chỉ' : vnd(fee)}</b>
              </div>
            </div>

            <div className="co-total">
              <span>{S.txtTotal}</span>
              <b>{fee === null ? '—' : vnd(total)}</b>
            </div>

            {err && <p className="co-err">{err}</p>}

            <button className="co-submit" onClick={submit} disabled={!valid || submitting || fee === null}>
              {submitting ? 'Đang đặt hàng…' : S.txtPlaceOrder}
            </button>
            {!valid && <p className="co-hint">{S.coHint}</p>}

            <ul className="co-trust">
              {(S.trustPoints || []).map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </aside>
        </div>
      </main>

      <Styles />
    </>
  );
}

function Styles() {
  return (
    <style jsx global>{`
:root{--navy:#18284e;--navy-deep:#101c38;--cream:#f6f4ef;--ink:#1b2440}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--f-body);color:var(--ink);background:var(--cream)}
h1,h2{font-family:var(--f-display);font-weight:900;letter-spacing:-.02em}
img{display:block;max-width:100%}
button,input,select,textarea{font:inherit}

.co-load{padding:90px 5vw;text-align:center;color:rgba(27,36,64,.5);font-weight:600}
.co-nav{display:flex;align-items:center;justify-content:space-between;padding:14px 5vw;background:var(--navy)}
.co-brand{font-family:var(--f-display);font-weight:900;font-size:20px;color:#fff;text-decoration:none}
.co-back{color:rgba(255,255,255,.82);text-decoration:none;font-weight:700;font-size:14px}
.co-back:hover{color:#fff}

.co-wrap{max-width:1120px;margin:0 auto;padding:32px 5vw 90px}
.co-wrap h1{font-size:clamp(26px,3.4vw,36px);color:var(--navy);margin-bottom:26px}
.co-grid{display:grid;grid-template-columns:1fr 380px;gap:26px;align-items:start}
@media(max-width:940px){.co-grid{grid-template-columns:1fr}}

.co-form section{background:#fff;border-radius:20px;border:1px solid rgba(24,40,78,.1);padding:24px;margin-bottom:18px}
.co-form h2{font-size:17px;color:var(--navy);margin-bottom:18px}
.co-fields{display:grid;grid-template-columns:1fr 1fr;gap:15px}
@media(max-width:620px){.co-fields{grid-template-columns:1fr}}
.co-fields label{display:flex;flex-direction:column;gap:6px}
.co-fields label.full{grid-column:1/-1}
.co-fields span{font-size:12.5px;font-weight:800;color:var(--navy);opacity:.7}
.co-fields input,.co-fields select,.co-fields textarea{
  padding:13px 15px;border-radius:12px;border:1.5px solid rgba(24,40,78,.16);background:#fff;
  font-size:14.5px;color:var(--ink);transition:.18s;font-family:inherit;resize:vertical}
.co-fields input:focus,.co-fields select:focus,.co-fields textarea:focus{
  outline:none;border-color:var(--navy);box-shadow:0 0 0 3px rgba(24,40,78,.08)}
.co-fields select:disabled{background:rgba(24,40,78,.04);color:rgba(27,36,64,.4);cursor:not-allowed}

.co-pay{display:flex;gap:12px;align-items:flex-start;background:rgba(24,40,78,.04);
  border:1.5px solid var(--navy);border-radius:14px;padding:16px}
.co-pay input{margin-top:3px;accent-color:var(--navy);width:18px;height:18px}
.co-pay label{display:flex;flex-direction:column;gap:4px;cursor:default}
.co-pay b{font-size:14.5px;color:var(--navy)}
.co-pay span{font-size:13px;color:rgba(27,36,64,.6);line-height:1.5}

.co-sum{background:#fff;border-radius:20px;border:1px solid rgba(24,40,78,.1);padding:24px;position:sticky;top:20px}
.co-sum h2{font-size:17px;color:var(--navy);margin-bottom:16px}
.co-items{display:flex;flex-direction:column;gap:14px;padding-bottom:16px;border-bottom:1px solid rgba(24,40,78,.1)}
.co-item{display:flex;gap:12px;align-items:center}
.co-ith{position:relative;width:52px;height:62px;border-radius:10px;flex-shrink:0;overflow:visible;
  background:linear-gradient(160deg,#2b3f70,#16244a);display:grid;place-items:center;font-size:20px}
.co-ith img{width:100%;height:100%;object-fit:contain;border-radius:10px}
.co-ith em{position:absolute;top:-7px;right:-7px;background:var(--navy);color:#fff;border-radius:999px;
  min-width:21px;height:21px;display:grid;place-items:center;font-size:11.5px;font-weight:800;font-style:normal;
  border:2px solid #fff}
.co-itx{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.co-itx b{font-family:var(--f-display);font-weight:800;font-size:13.5px;color:var(--navy);line-height:1.3}
.co-itx span{font-size:12px;color:rgba(27,36,64,.55);font-weight:600}
.co-itp{font-family:var(--f-display);font-weight:900;font-size:14.5px;color:var(--navy);white-space:nowrap}

.co-vch{display:flex;gap:8px;margin:16px 0 0}
.co-vch input{flex:1;min-width:0;padding:11px 14px;border-radius:11px;border:1.5px solid rgba(24,40,78,.16);font-size:14px}
.co-vch input:focus{outline:none;border-color:var(--navy)}
.co-vch button{background:var(--navy);color:#fff;border:none;border-radius:11px;padding:11px 18px;
  font-weight:800;font-size:13.5px;cursor:pointer}
.co-vch button:disabled{opacity:.4;cursor:not-allowed}
.co-vmsg{font-size:12.5px;font-weight:700;color:#c25050;margin-top:7px}
.co-vmsg.ok{color:#2e7d4f}

.co-rows{display:flex;flex-direction:column;gap:9px;padding:16px 0;margin-top:12px;
  border-top:1px solid rgba(24,40,78,.1)}
.co-rows div{display:flex;justify-content:space-between;align-items:baseline;font-size:14px}
.co-rows span{color:rgba(27,36,64,.65);font-weight:600}
.co-rows b{color:var(--navy);font-weight:800}
.co-rows .disc b{color:#2e7d4f}

.co-total{display:flex;justify-content:space-between;align-items:baseline;padding:15px 0 18px;
  border-top:1px solid rgba(24,40,78,.12)}
.co-total span{font-weight:700;color:var(--navy);font-size:15px}
.co-total b{font-family:var(--f-display);font-weight:900;font-size:26px;color:var(--navy)}

.co-err{background:#fdeeee;color:#c23b3b;border:1px solid #f2c9c9;border-radius:11px;padding:11px 14px;
  font-size:13.5px;font-weight:700;margin-bottom:13px;line-height:1.5}
.co-submit{width:100%;background:var(--navy);color:#fff;border:none;border-radius:999px;padding:17px;
  font-weight:800;font-size:16px;cursor:pointer;transition:.22s}
.co-submit:hover:not(:disabled){background:var(--navy-deep);transform:translateY(-2px)}
.co-submit:disabled{opacity:.4;cursor:not-allowed}
.co-hint{font-size:12px;color:rgba(27,36,64,.5);text-align:center;margin-top:10px;font-weight:600}
.co-trust{list-style:none;display:flex;flex-direction:column;gap:7px;margin-top:16px}
.co-trust li{display:flex;gap:9px;font-size:12.5px;color:rgba(27,36,64,.6);font-weight:600}
.co-trust li::before{content:"✓";color:#2e7d4f;font-weight:900}
    `}</style>
  );
}
