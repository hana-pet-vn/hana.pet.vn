-- BƯỚC 11 — Trigger công tắc giá (hiện công tắc BẬT nên chưa chặn ai)
-- ─── 5.1 Giá gốc (price / original) ────────────────────────────────
create or replace function public.protect_price_columns()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if public.admin_role() = 'staff' and not public.staff_can('edit_price') then
    if new.price is distinct from old.price
    or new.original is distinct from old.original then
      raise exception 'Chỉ chủ shop được sửa giá bán (hoặc bật công tắc edit_price)';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_price on public.products;
create trigger trg_protect_price
  before update on public.products
  for each row execute function public.protect_price_columns();
