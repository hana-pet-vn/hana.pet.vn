# 🐾 Hana Pet — hana.pet.vn

Web bán hàng + admin của shop Hana Pet. Next.js + Supabase.

## Cấu trúc nhanh

| Thư mục | Là gì |
|---|---|
| `app/` | Trang web khách + admin cũ (`/admin`) + admin mới (`/admin2`, đang xây) |
| `lib/` | Hàm dùng chung: Supabase, giỏ hàng, xuất BigSeller, vận chuyển |
| `supabase/` | File SQL Phase 0 (phân quyền) + file rollback cứu hoả |
| `docs/` | Toàn bộ hồ sơ rework: HANDOFF, roadmap, spec Phase 0–4, demo đã duyệt |

## Đang làm gì (07/2026)

Rework admin theo hồ sơ trong `docs/` — đọc `docs/HANDOFF.md` TRƯỚC.
Admin mới dựng ở `/admin2`, chạy song song admin cũ, cutover khi xong.

- ✅ Phase 0: HOÀN THÀNH & nghiệm thu 31/07 — xem `docs/TIEN-DO.md`
- ✅ Phase 1: demo đã chốt (`docs/demo-phase1-don-hang.html`) — đang code thật
- ⏳ Phase 1–4: theo spec trong `docs/`

## Chạy local

```bash
npm install
npm run dev
```

Cần file `.env.local` (KHÔNG commit — đã có trong .gitignore):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
GHTK_API_TOKEN=...
GHTK_WEBHOOK_SECRET=...
```

⚠️ Tuyệt đối không dán key/mật khẩu vào chat, commit, hay tài liệu.
