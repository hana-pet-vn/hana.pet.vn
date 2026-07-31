-- BƯỚC 12 — Tự kiểm cuối cùng. Kỳ vọng: 5 công tắc · 21 policy · 1 trigger.
select 'công tắc' as muc, count(*)::text as ket_qua from public.staff_permissions
union all
select 'policy đã tạo', count(*)::text from pg_policies where schemaname = 'public'
union all
select 'trigger giá', count(*)::text from pg_trigger where tgname = 'trg_protect_price';
-- Kỳ vọng: 5 công tắc · 21 policy · 1 trigger.
