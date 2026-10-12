-- Static reviewed DDL only. All application data writes use Drizzle parameters.
CREATE FUNCTION public.guard_order_price() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE database_price integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT price_bdt INTO database_price FROM public.products
      WHERE id = NEW.product_id AND is_active = true FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product is unavailable'
        USING ERRCODE = '23514', CONSTRAINT = 'orders_product_available';
    END IF;
    NEW.amount_expected := database_price;
  ELSIF NEW.amount_expected IS DISTINCT FROM OLD.amount_expected
     OR NEW.product_id IS DISTINCT FROM OLD.product_id
     OR NEW.order_code IS DISTINCT FROM OLD.order_code
     OR NEW.id IS DISTINCT FROM OLD.id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Order quote is immutable'
      USING ERRCODE = '23514', CONSTRAINT = 'orders_quote_immutable';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.trx_id IS NOT NULL
     AND NEW.trx_id IS DISTINCT FROM OLD.trx_id THEN
    RAISE EXCEPTION 'Submitted transaction ID is immutable'
      USING ERRCODE = '23514', CONSTRAINT = 'orders_trx_immutable';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER orders_price_guard BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.guard_order_price();
--> statement-breakpoint
CREATE FUNCTION public.touch_product_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.touch_product_updated_at();
