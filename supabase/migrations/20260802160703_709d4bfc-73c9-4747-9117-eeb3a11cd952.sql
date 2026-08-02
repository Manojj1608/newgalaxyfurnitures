DROP POLICY "Anyone can log a product view" ON public.product_views;
CREATE POLICY "Anyone can log a view of a published product" ON public.product_views
FOR INSERT TO anon, authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.status = 'active' AND p.deleted_at IS NULL));