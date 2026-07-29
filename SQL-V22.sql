-- ═══════════════════════════════════════════════════════════════════════
--  HANAPET V22 — chạy MỘT LẦN trong Supabase → SQL Editor
--  Chạy được nhiều lần cũng không sao (create or replace / if not exists)
-- ═══════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────
--  PHẦN 1 — Đặt đơn nguyên tử
--  Kiểm kho + trừ kho + ghi đơn trong MỘT giao dịch.
--  Sai bất kỳ đâu → cuộn ngược sạch, không còn cảnh đơn tạo được mà kho
--  không trừ.
-- ───────────────────────────────────────────────────────────────────────
create or replace function hp_place_order(p_order jsonb, p_dec jsonb)
returns void
language plpgsql
as $$
declare
  d          jsonb;
  v_pid      text;
  v_vid      text;
  v_cid      text;
  v_qty      int;
  v_name     text;
  v_variants jsonb;
  v_combos   jsonb;
  v_stock    int;
begin
  -- 1. Khoá mọi dòng sản phẩm liên quan, theo thứ tự id để không kẹt chéo
  perform 1 from products
   where id in (select value ->> 'productId' from jsonb_array_elements(p_dec))
   order by id
   for update;

  -- 2. Kiểm và trừ từng mục (đã gộp sẵn bên JS, mỗi SKU đúng một dòng)
  for d in select value from jsonb_array_elements(p_dec)
  loop
    v_pid := d ->> 'productId';
    v_vid := coalesce(d ->> 'variantId', '');
    v_cid := coalesce(d ->> 'comboId',   '');
    v_qty := (d ->> 'qty')::int;

    if v_qty <= 0 then
      raise exception 'HP_BAD_QTY:%', v_pid;
    end if;

    select name, coalesce(variants,'[]'::jsonb), coalesce(combos,'[]'::jsonb)
      into v_name, v_variants, v_combos
      from products where id = v_pid;

    if not found then
      raise exception 'HP_NO_PRODUCT:%', v_pid;
    end if;

    ------------------------------------------------ phân loại
    if v_vid <> '' then
      select (e ->> 'stock')::int into v_stock
        from jsonb_array_elements(v_variants) e
       where e ->> 'id' = v_vid;

      if v_stock is null then
        raise exception 'HP_NO_VARIANT:%', v_name;
      end if;
      if v_stock < v_qty then
        raise exception 'HP_OUT_OF_STOCK:%|%', v_name, v_stock;
      end if;

      update products set
        variants = (
          select jsonb_agg(
                   case when e ->> 'id' = v_vid
                        then jsonb_set(e, '{stock}',
                               to_jsonb(((e ->> 'stock')::int) - v_qty))
                        else e end
                   order by ord)
            from jsonb_array_elements(v_variants) with ordinality as t(e, ord)),
        updated_at = now()
      where id = v_pid;

    ------------------------------------------------ combo kiểu cũ (không BOM)
    elsif v_cid <> '' then
      select (e ->> 'stock')::int into v_stock
        from jsonb_array_elements(v_combos) e
       where e ->> 'id' = v_cid;

      if v_stock is null then
        raise exception 'HP_NO_COMBO:%', v_name;
      end if;
      if v_stock < v_qty then
        raise exception 'HP_OUT_OF_STOCK:%|%', v_name, v_stock;
      end if;

      update products set
        combos = (
          select jsonb_agg(
                   case when e ->> 'id' = v_cid
                        then jsonb_set(e, '{stock}',
                               to_jsonb(((e ->> 'stock')::int) - v_qty))
                        else e end
                   order by ord)
            from jsonb_array_elements(v_combos) with ordinality as t(e, ord)),
        updated_at = now()
      where id = v_pid;

    ------------------------------------------------ sản phẩm gốc
    else
      update products set stock = stock - v_qty, updated_at = now()
       where id = v_pid and stock >= v_qty;

      if not found then
        select coalesce(stock,0) into v_stock from products where id = v_pid;
        raise exception 'HP_OUT_OF_STOCK:%|%', v_name, v_stock;
      end if;
    end if;
  end loop;

  -- 3. Ghi đơn — liệt kê cột rõ ràng để created_at/updated_at giữ mặc định
  insert into orders (
    id, code, status, customer, items, total, subtotal, discount,
    disc_pct, voucher, shipping, shipping_fee, tracking_code,
    est_delivery, source, note)
  select
    id, code, status, customer, items, total, subtotal, discount,
    disc_pct, voucher, shipping, shipping_fee, tracking_code,
    est_delivery, source, note
  from jsonb_populate_record(null::orders, p_order);
end;
$$;


-- ───────────────────────────────────────────────────────────────────────
--  PHẦN 2 — Hai cột phục vụ cầu nối BigSeller
--    bigseller_exported_at : đánh dấu đơn đã đẩy sang BS (chống đẩy trùng)
--    bigseller_order_id    : mã đơn bên BS, phòng khi BS đè mã của mình
-- ───────────────────────────────────────────────────────────────────────
alter table orders add column if not exists bigseller_exported_at timestamptz;
alter table orders add column if not exists bigseller_order_id    text default '';

create index if not exists idx_orders_bs_exported
  on orders (bigseller_exported_at);


-- ───────────────────────────────────────────────────────────────────────
--  KIỂM TRA — chạy riêng câu này để soi sản phẩm/phân loại THIẾU GIÁ.
--  Từ V22, đơn chứa món giá 0 sẽ bị TỪ CHỐI, nên đây là danh sách cần vá.
-- ───────────────────────────────────────────────────────────────────────
-- select p.id, p.name, 'sản phẩm gốc' as loai, p.price as gia
--   from products p
--  where coalesce(jsonb_array_length(p.variants),0) = 0
--    and coalesce(p.price,0) <= 0
-- union all
-- select p.id, p.name || ' — ' || coalesce(v ->> 'name','?'), 'phân loại',
--        coalesce((v ->> 'price')::int, 0)
--   from products p, jsonb_array_elements(coalesce(p.variants,'[]'::jsonb)) v
--  where coalesce((v ->> 'price')::int, 0) <= 0;
