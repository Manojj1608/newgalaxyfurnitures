DROP FUNCTION IF EXISTS public.increment_product_view(text);

CREATE TABLE public.product_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.product_views TO anon;
GRANT SELECT, INSERT ON public.product_views TO authenticated;
GRANT ALL ON public.product_views TO service_role;
ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can log a product view" ON public.product_views FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Managers can read product views" ON public.product_views FOR SELECT TO authenticated USING (private.is_manager(auth.uid()));
CREATE INDEX product_views_product_id_idx ON public.product_views(product_id);

CREATE OR REPLACE FUNCTION private.bump_product_view_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.products SET view_count = view_count + 1 WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.bump_product_view_count() FROM PUBLIC;

CREATE TRIGGER product_views_bump AFTER INSERT ON public.product_views
FOR EACH ROW EXECUTE FUNCTION private.bump_product_view_count();